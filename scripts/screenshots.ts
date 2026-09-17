/**
 * Renders the README screenshots with headless Chrome.
 * Needs `npm run dev` in another terminal.
 *   npx tsx scripts/screenshots.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { demoSpec } from "../src/core/demo.js";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ORIGIN = "http://localhost:5173";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "docs");
const seed = resolve(root, "__seed.html");

const shots = [
  { tab: "mod", file: "mod.png" },
  { tab: "blocks", file: "blocks.png" },
  { tab: "build", file: "build.png" },
];

mkdirSync(out, { recursive: true });

// Served from the Vite root so it shares the origin whose localStorage we seed.
writeFileSync(
  seed,
  `<script>
    localStorage.setItem("modforge.spec", ${JSON.stringify(JSON.stringify(demoSpec()))});
    location.replace("/#" + location.search.slice(1));
  </script>`,
);

try {
  for (const s of shots) {
    execFileSync(CHROME, [
      "--headless=new",
      "--hide-scrollbars",
      "--force-device-scale-factor=2",
      "--window-size=1440,900",
      "--virtual-time-budget=6000",
      `--screenshot=${resolve(out, s.file)}`,
      `${ORIGIN}/__seed.html?${s.tab}`,
    ]);
    console.log("docs/" + s.file);
  }
} finally {
  rmSync(seed, { force: true });
}
