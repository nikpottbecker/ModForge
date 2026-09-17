/**
 * Renders docs/social-preview.png — the 1280x640 card GitHub, Discord and X show
 * when someone links the repo.
 *   npx tsx scripts/social-card.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "docs");
const page = resolve(out, "__card.html");

const shot = readFileSync(resolve(out, "blocks.png")).toString("base64");

// Same bundled fonts the editor uses, so the card can render without a network.
const font = (pkg: string, file: string) =>
  `url("file://${resolve(root, "node_modules/@fontsource", pkg, "files", file)}") format("woff2")`;
const faces = `
  @font-face { font-family: Montserrat; font-weight: 600; src: ${font("montserrat", "montserrat-latin-600-normal.woff2")}; }
  @font-face { font-family: Montserrat; font-weight: 700; src: ${font("montserrat", "montserrat-latin-700-normal.woff2")}; }
  @font-face { font-family: Lato; font-weight: 400; src: ${font("lato", "lato-latin-400-normal.woff2")}; }`;

mkdirSync(out, { recursive: true });
writeFileSync(
  page,
  `<!doctype html><meta charset="utf-8">
<style>
  ${faces}
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1280px; height: 640px; overflow: hidden; display: flex;
    background: #000; color: #dfdfdf; font: 400 20px/1.5 Lato, sans-serif;
  }
  .left { flex: 0 0 632px; padding: 56px 24px 52px 64px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 13px; font: 700 24px Montserrat, sans-serif; color: #fff; }
  .mark { width: 36px; height: 36px; background: #eb622b; display: grid; place-items: center; }
  h1 { margin: 36px 0 0; font: 700 45px/1.14 Montserrat, sans-serif; color: #fff; letter-spacing: -0.5px; }
  h1 em { color: #eb622b; font-style: normal; }
  p { margin: 20px 0 0; color: #bfbfbf; font-size: 20px; max-width: 500px; }
  ul { margin: 28px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
  li { display: flex; align-items: center; gap: 12px; color: #dfdfdf; font-size: 18px; }
  li::before { content: ""; width: 7px; height: 7px; background: #eb622b; flex: none; }
  .foot { margin-top: auto; padding-top: 28px;
          font: 600 14px Montserrat, sans-serif; letter-spacing: 1.2px; text-transform: uppercase; color: #9f9f9f; }
  .foot b { color: #eb622b; }
  .right { position: relative; flex: 1; overflow: hidden; }
  .right img { position: absolute; top: 104px; left: 36px; width: 880px;
               box-shadow: 0 30px 80px rgba(0,0,0,.75); border: 1px solid #303030; }
  .fade { position: absolute; inset: 0; background: linear-gradient(90deg, #000 0, transparent 26%); }
</style>
<div class="left">
  <div class="brand">
    <span class="mark">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/>
      </svg>
    </span>
    ModForge
  </div>
  <h1>Build a Minecraft&nbsp;mod<br>without writing <em>Java</em></h1>
  <p>Click together items, blocks, tools and recipes — get a finished <code>.jar</code>.</p>
  <ul>
    <li>Ore that actually spawns, with vanilla presets</li>
    <li>Catches silent mistakes before the build</li>
    <li>Real NeoForge project, yours to keep</li>
  </ul>
  <div class="foot">Minecraft 1.21.1 · NeoForge · <b>MIT</b></div>
</div>
<div class="right"><img src="data:image/png;base64,${shot}"><div class="fade"></div></div>`,
);

try {
  execFileSync(CHROME, [
    "--headless=new",
    "--hide-scrollbars",
    "--window-size=1280,640",
    "--virtual-time-budget=8000",
    `--screenshot=${resolve(out, "social-preview.png")}`,
    `file://${page}`,
  ]);
  console.log("docs/social-preview.png");
} finally {
  rmSync(page, { force: true });
}
