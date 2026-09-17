import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateProject, isBinary, type GenFile } from "../core/generator/index.js";
import type { ModSpec } from "../core/spec.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WRAPPER_DIR = path.join(ROOT, "mdk/1.21.1");

/** Files the generator cannot produce because they are binary / executable. */
const WRAPPER_FILES = [
  "gradlew",
  "gradlew.bat",
  "gradle/wrapper/gradle-wrapper.jar",
  "gradle/wrapper/gradle-wrapper.properties",
];

export async function writeProject(spec: ModSpec, dir: string): Promise<GenFile[]> {
  const files = generateProject(spec);
  await fs.rm(dir, { recursive: true, force: true });
  for (const f of files) {
    const target = path.join(dir, f.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (isBinary(f)) await fs.writeFile(target, Buffer.from(f.base64, "base64"));
    else await fs.writeFile(target, f.text, "utf8");
  }
  await copyWrapper(dir);
  return files;
}

export async function copyWrapper(dir: string): Promise<void> {
  for (const rel of WRAPPER_FILES) {
    const target = path.join(dir, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(WRAPPER_DIR, rel), target);
  }
  await fs.chmod(path.join(dir, "gradlew"), 0o755);
}

export async function readWrapperFiles(): Promise<{ path: string; base64: string }[]> {
  return Promise.all(
    WRAPPER_FILES.map(async (rel) => ({
      path: rel,
      base64: (await fs.readFile(path.join(WRAPPER_DIR, rel))).toString("base64"),
    })),
  );
}

/** Resolves a JDK 21 home, preferring an explicit env var over common install paths. */
export async function findJavaHome(): Promise<string | null> {
  const candidates = [
    process.env.MODFORGE_JAVA_HOME,
    process.env.JAVA_HOME,
    "/opt/homebrew/opt/openjdk@21",
    "/usr/local/opt/openjdk@21",
    "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home",
  ].filter((c): c is string => Boolean(c));

  for (const c of candidates) {
    try {
      await fs.access(path.join(c, "bin/java"));
      if (await isJava21(c)) return c;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function isJava21(home: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn(path.join(home, "bin/java"), ["-version"]);
    let out = "";
    p.stderr.on("data", (d) => (out += d));
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => resolve(/version "(2[1-9]|[3-9]\d)/.test(out)));
    p.on("error", () => resolve(false));
  });
}

export type BuildResult = { ok: boolean; log: string; jarPath?: string };

export function runGradle(dir: string, javaHome: string, args: string[], onLine?: (l: string) => void): Promise<BuildResult> {
  return new Promise((resolve) => {
    const p = spawn("./gradlew", args, {
      cwd: dir,
      env: { ...process.env, JAVA_HOME: javaHome, PATH: `${javaHome}/bin:${process.env.PATH ?? ""}` },
    });
    let log = "";
    const handle = (d: Buffer) => {
      const s = d.toString();
      log += s;
      if (onLine) for (const line of s.split("\n")) if (line.trim()) onLine(line);
    };
    p.stdout.on("data", handle);
    p.stderr.on("data", handle);
    p.on("error", (e) => resolve({ ok: false, log: log + "\n" + String(e) }));
    p.on("close", (code) => resolve({ ok: code === 0, log }));
  });
}

export async function findJar(dir: string): Promise<string | null> {
  const libs = path.join(dir, "build/libs");
  try {
    const names = await fs.readdir(libs);
    const jar = names.find((n) => n.endsWith(".jar") && !n.endsWith("-sources.jar"));
    return jar ? path.join(libs, jar) : null;
  } catch {
    return null;
  }
}
