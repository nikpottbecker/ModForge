import path from "node:path";
import os from "node:os";
import { demoSpec } from "../src/core/demo.js";
import { findJar, findJavaHome, runGradle, writeProject } from "../src/server/workspace.js";

const dir = process.argv[2] ?? path.join(os.tmpdir(), "modforge-demo");
const spec = demoSpec();

const javaHome = await findJavaHome();
if (!javaHome) {
  console.error("Kein JDK 21 gefunden.");
  process.exit(1);
}

console.log(`Projekt: ${dir}`);
const files = await writeProject(spec, dir);
console.log(`${files.length} Dateien geschrieben, baue mit ${javaHome} ...`);

const result = await runGradle(dir, javaHome, ["build", "--no-daemon"], (l) => console.log(l));
if (!result.ok) {
  console.error("BUILD FEHLGESCHLAGEN");
  process.exit(1);
}
console.log("JAR:", await findJar(dir));
