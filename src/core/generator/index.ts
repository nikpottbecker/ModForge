import type { ModSpec } from "../spec.js";
import { gradleFiles } from "./gradle.js";
import { allItemIds, javaFiles, mainClassName } from "./java.js";
import { resourceFiles } from "./resources.js";
import type { GenFile } from "./types.js";

export { mainClassName, allItemIds };
export type { GenFile };
export { isBinary } from "./types.js";
export { NEOFORGE_VERSION } from "./gradle.js";

export function generateProject(spec: ModSpec): GenFile[] {
  return [...gradleFiles(spec), ...javaFiles(spec), ...resourceFiles(spec), readme(spec)];
}

function readme(spec: ModSpec): GenFile {
  return {
    path: "README.md",
    text: `# ${spec.name}

Von ModForge generiert für Minecraft ${spec.minecraftVersion} (NeoForge).

## Bauen

\`\`\`bash
./gradlew build
\`\`\`

Die fertige \`.jar\` liegt danach in \`build/libs/${spec.modId}-${spec.version}.jar\`.
Diese Datei in den \`mods\`-Ordner deiner NeoForge-Instanz kopieren.

## Im Spiel testen

\`\`\`bash
./gradlew runClient
\`\`\`

## Inhalt

- ${spec.blocks.length} Blöcke
- ${spec.items.length} Items
- ${spec.toolSets.length} Werkzeug-Sets
- ${spec.armorSets.length} Rüstungs-Sets
- ${spec.recipes.length} eigene Rezepte
`,
  };
}

export type Issue = { level: "error" | "warning"; message: string; hint?: string };

/**
 * Playable height per dimension, from the vanilla dimension_type files. The nether is
 * 256 blocks tall but the bedrock roof sits at 127, so anything placed above that is
 * generated into solid bedrock and never seen.
 */
const DIMENSION_RANGE: Record<string, { min: number; max: number; label: string }> = {
  overworld: { min: -64, max: 319, label: "Oberwelt" },
  nether: { min: 0, max: 127, label: "Nether" },
  end: { min: 0, max: 255, label: "End" },
};

const VANILLA_NS = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;

export function validateSpec(spec: ModSpec): Issue[] {
  const issues: Issue[] = [];
  const ids = allItemIds(spec);

  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) issues.push({ level: "error", message: `Doppelte ID: "${id}"` });
    seen.add(id);
  }

  const known = new Set(ids);
  const checkRef = (ref: string, where: string) => {
    const t = ref.trim();
    if (!t) return;
    if (t.includes(":")) {
      if (!VANILLA_NS.test(t)) issues.push({ level: "error", message: `${where}: "${t}" ist keine gültige Item-ID` });
      return;
    }
    if (!known.has(t)) {
      issues.push({
        level: "error",
        message: `${where}: "${t}" gibt es in diesem Mod nicht — für Vanilla-Items "minecraft:${t}" schreiben`,
      });
    }
  };

  for (const b of spec.blocks) {
    if (b.drop.kind === "item") checkRef(b.drop.item, `Block "${b.id}" Drop`);
    if (b.xpMin > b.xpMax) issues.push({ level: "error", message: `Block "${b.id}": XP-Minimum > Maximum` });

    // A block that needs a tool but is in no mineable tag can never be harvested:
    // it breaks, drops nothing, and nothing in the build log says so.
    if (b.requiresTool && b.tool === "none") {
      issues.push({
        level: "error",
        message: `Block "${b.id}": braucht ein Werkzeug, ist aber keinem Werkzeug zugeordnet`,
        hint: 'Setze "Werkzeug" auf Spitzhacke/Axt/Schaufel/Hacke — oder schalte "Werkzeug nötig" aus. Sonst lässt sich der Block abbauen, droppt aber nie etwas.',
      });
    }

    issues.push(...oreIssues(b));
  }
  for (const s of spec.toolSets) {
    checkRef(s.repairItem, `Werkzeug-Set "${s.id}" Material`);
    if (s.autoRecipes && !s.repairItem.trim()) {
      issues.push({ level: "warning", message: `Werkzeug-Set "${s.id}": ohne Material werden keine Rezepte erzeugt` });
    }
  }
  for (const s of spec.armorSets) {
    checkRef(s.repairItem, `Rüstungs-Set "${s.id}" Material`);
    if (s.autoRecipes && !s.repairItem.trim()) {
      issues.push({ level: "warning", message: `Rüstungs-Set "${s.id}": ohne Material werden keine Rezepte erzeugt` });
    }
  }
  for (const r of spec.recipes) {
    checkRef(r.result, `Rezept "${r.id}" Ergebnis`);
    if (r.kind === "shaped") {
      for (const row of r.grid) for (const cell of row) checkRef(cell, `Rezept "${r.id}"`);
      if (!r.grid.some((row) => row.some((c) => c.trim()))) {
        issues.push({ level: "error", message: `Rezept "${r.id}": Raster ist leer` });
      }
    } else if (r.kind === "shapeless") {
      for (const i of r.ingredients) checkRef(i, `Rezept "${r.id}"`);
    } else {
      checkRef(r.ingredient, `Rezept "${r.id}" Zutat`);
    }
  }

  const recipeIds = new Set<string>();
  for (const r of spec.recipes) {
    if (recipeIds.has(r.id)) issues.push({ level: "error", message: `Doppelte Rezept-ID: "${r.id}"` });
    recipeIds.add(r.id);
  }

  if (!ids.length) issues.push({ level: "warning", message: "Der Mod enthält noch keine Inhalte" });

  return issues;
}

/**
 * Ore generation fails silently: the build succeeds, the game starts, and the ore is
 * simply not there. Every rule here turns one of those invisible failures into a
 * message at edit time.
 */
function oreIssues(b: ModSpec["blocks"][number]): Issue[] {
  const ore = b.oreGen;
  if (!ore) return [];
  const out: Issue[] = [];
  const where = `Erz "${b.id}"`;
  const range = DIMENSION_RANGE[ore.dimension];
  const lo = Math.min(ore.minHeight, ore.maxHeight);
  const hi = Math.max(ore.minHeight, ore.maxHeight);

  if (ore.minHeight > ore.maxHeight) {
    out.push({
      level: "warning",
      message: `${where}: Mindesthöhe (${ore.minHeight}) liegt über der Maximalhöhe (${ore.maxHeight})`,
      hint: "Die Werte werden beim Bauen getauscht — trotzdem besser richtig herum eintragen.",
    });
  }

  if (lo < range.min || hi > range.max) {
    out.push({
      level: "error",
      message: `${where}: Höhe ${lo} bis ${hi} liegt außerhalb der ${range.label} (${range.min} bis ${range.max})`,
      hint:
        ore.dimension === "nether"
          ? "Über Y 127 liegt im Nether die Bedrock-Decke — dort erzeugte Adern sieht nie jemand."
          : `Setze die Höhen zwischen ${range.min} und ${range.max}.`,
    });
  }

  if (ore.discardOnAirExposure >= 1) {
    out.push({
      level: "warning",
      message: `${where}: wird bei jedem Luftkontakt verworfen`,
      hint: "Bei 1,0 erscheint das Erz nie an Höhlenwänden, sondern nur vollständig eingeschlossen. Vanilla-Diamant nutzt 0,5.",
    });
  }

  if (ore.veinsPerChunk > 64) {
    out.push({
      level: "warning",
      message: `${where}: ${ore.veinsPerChunk} Adern pro Chunk sind sehr viel`,
      hint: "Kohle, das häufigste Vanilla-Erz, nutzt 20. Hohe Werte verlangsamen die Weltgenerierung spürbar.",
    });
  }

  if (b.drop.kind === "nothing") {
    out.push({
      level: "warning",
      message: `${where}: generiert in der Welt, droppt aber nichts`,
      hint: 'Stelle den Drop auf "sich selbst" oder ein Item — sonst wirkt das Erz im Spiel kaputt.',
    });
  }

  return out;
}
