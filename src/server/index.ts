import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { generateProject, isBinary, validateSpec } from "../core/generator/index.js";
import { ModSpec } from "../core/spec.js";
import {
  findJar,
  findJavaHome,
  readWrapperFiles,
  ROOT,
  runGradle,
  writeProject,
} from "./workspace.js";

const PORT = Number(process.env.PORT ?? 5174);
const WORKSPACE = path.join(ROOT, ".workspace");

const app = Fastify({ logger: false, bodyLimit: 64 * 1024 * 1024 });

const parseSpec = (body: unknown) => ModSpec.parse((body as { spec: unknown })?.spec);

app.get("/api/env", async () => {
  const javaHome = await findJavaHome();
  return { java: javaHome, canBuild: Boolean(javaHome) };
});

app.post("/api/validate", async (req) => {
  const spec = parseSpec(req.body);
  return { issues: validateSpec(spec) };
});

app.post("/api/export", async (req, reply) => {
  const spec = parseSpec(req.body);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  for (const f of generateProject(spec)) {
    if (isBinary(f)) archive.append(Buffer.from(f.base64, "base64"), { name: f.path });
    else archive.append(f.text, { name: f.path });
  }
  for (const f of await readWrapperFiles()) {
    const mode = f.path === "gradlew" ? 0o755 : 0o644;
    archive.append(Buffer.from(f.base64, "base64"), { name: f.path, mode });
  }
  archive.finalize();
  return reply
    .header("Content-Type", "application/zip")
    .header("Content-Disposition", `attachment; filename="${spec.modId}-src.zip"`)
    .send(archive);
});

/** Streams the Gradle log as newline-delimited JSON while the build runs. */
app.post("/api/build", async (req, reply) => {
  const spec = parseSpec(req.body);
  const id = randomUUID();
  const dir = path.join(WORKSPACE, id);

  reply.raw.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
  });
  const emit = (e: unknown) => reply.raw.write(JSON.stringify(e) + "\n");

  try {
    const javaHome = await findJavaHome();
    if (!javaHome) {
      emit({ type: "done", ok: false, error: "Kein JDK 21 gefunden." });
      return reply.raw.end();
    }
    emit({ type: "line", line: `Java: ${javaHome}` });

    const files = await writeProject(spec, dir);
    emit({ type: "line", line: `${files.length} Dateien geschrieben.` });

    const result = await runGradle(dir, javaHome, ["build", "--no-daemon"], (line) =>
      emit({ type: "line", line }),
    );
    const jar = result.ok ? await findJar(dir) : null;
    emit({ type: "done", ok: result.ok && Boolean(jar), id, jar: jar && path.basename(jar) });
  } catch (e) {
    emit({ type: "done", ok: false, error: String(e) });
  }
  return reply.raw.end();
});

app.get<{ Params: { id: string } }>("/api/build/:id/jar", async (req, reply) => {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return reply.code(400).send({ error: "ungültige id" });
  const jar = await findJar(path.join(WORKSPACE, id));
  if (!jar) return reply.code(404).send({ error: "kein Jar" });
  return reply
    .header("Content-Type", "application/java-archive")
    .header("Content-Disposition", `attachment; filename="${path.basename(jar)}"`)
    .send(await fs.readFile(jar));
});

const dist = path.join(ROOT, "dist");
if (await fs.stat(dist).catch(() => null)) {
  await app.register(fastifyStatic, { root: dist });
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith("/api/") ? reply.code(404).send({ error: "not found" }) : reply.sendFile("index.html"),
  );
}

await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`ModForge-Server: http://127.0.0.1:${PORT}`);
