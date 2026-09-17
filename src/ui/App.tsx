import { useEffect, useMemo, useState, type ReactElement } from "react";
import { demoSpec } from "../core/demo.js";
import { emptySpec, ModSpec } from "../core/spec.js";
import {
  IconArmor,
  IconBlock,
  IconBuild,
  IconItem,
  IconMod,
  IconRecipe,
  IconTool,
} from "./icons.js";
import { loadStored, saveBlob, store } from "./lib.js";
import { BlocksSection } from "./sections/Blocks.js";
import { BuildSection } from "./sections/Build.js";
import { ArmorSection, ToolsSection } from "./sections/Gear.js";
import { ItemsSection } from "./sections/Items.js";
import { ModSection } from "./sections/Mod.js";
import { RecipesSection } from "./sections/Recipes.js";

type Tab = "mod" | "items" | "blocks" | "tools" | "armor" | "recipes" | "build";

const TABS: { id: Tab; label: string; icon: () => ReactElement; group: string }[] = [
  { id: "mod", label: "Mod", icon: IconMod, group: "Projekt" },
  { id: "items", label: "Items", icon: IconItem, group: "Inhalte" },
  { id: "blocks", label: "Blöcke", icon: IconBlock, group: "Inhalte" },
  { id: "tools", label: "Werkzeuge", icon: IconTool, group: "Inhalte" },
  { id: "armor", label: "Rüstung", icon: IconArmor, group: "Inhalte" },
  { id: "recipes", label: "Rezepte", icon: IconRecipe, group: "Inhalte" },
  { id: "build", label: "Bauen", icon: IconBuild, group: "Ausgabe" },
];

function initialTab(): Tab {
  const hash = location.hash.slice(1);
  return TABS.some((t) => t.id === hash) ? (hash as Tab) : "mod";
}

function initialSpec(): ModSpec {
  const stored = loadStored();
  if (stored) {
    const parsed = ModSpec.safeParse(stored);
    if (parsed.success) return parsed.data;
  }
  return emptySpec();
}

export function App() {
  const [spec, setSpec] = useState<ModSpec>(initialSpec);
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => store(spec), [spec]);

  useEffect(() => {
    location.hash = tab;
  }, [tab]);

  useEffect(() => {
    const onHash = () => setTab(initialTab());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const set = (patch: Partial<ModSpec>) => setSpec((s) => ({ ...s, ...patch }));

  const counts: Record<Tab, number | null> = useMemo(
    () => ({
      mod: null,
      items: spec.items.length,
      blocks: spec.blocks.length,
      tools: spec.toolSets.length,
      armor: spec.armorSets.length,
      recipes: spec.recipes.length,
      build: null,
    }),
    [spec],
  );

  const ores = spec.blocks.filter((b) => b.oreGen).length;

  const importSpec = async (file: File) => {
    const parsed = ModSpec.safeParse(JSON.parse(await file.text()));
    if (parsed.success) setSpec(parsed.data);
    else alert("Diese Datei ist keine gültige ModForge-Beschreibung.");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <span className="mark">
            <IconMod />
          </span>
          ModForge
        </div>
        <div className="crumb">
          <b>{spec.name}</b>
          <span className="sep">/</span>
          <span>{spec.modId}</span>
          <span className="sep">/</span>
          <span>MC {spec.minecraftVersion}</span>
        </div>
        <div className="spacer" />
        <button type="button" className="btn sm" onClick={() => setSpec(demoSpec())}>
          Beispiel laden
        </button>
        <label className="btn sm" style={{ cursor: "pointer" }}>
          Öffnen
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && importSpec(e.target.files[0])}
          />
        </label>
        <button
          type="button"
          className="btn sm"
          onClick={() =>
            saveBlob(
              new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" }),
              `${spec.modId}.modforge.json`,
            )
          }
        >
          Speichern
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={() => confirm("Alles verwerfen und neu anfangen?") && setSpec(emptySpec())}
        >
          Neu
        </button>
      </header>

      <nav className="sidebar">
        {TABS.map((t, i) => (
          <div key={t.id}>
            {TABS[i - 1]?.group !== t.group && (
              <div className="nav-label" style={{ paddingTop: i ? 16 : 0 }}>
                {t.group}
              </div>
            )}
            <button
              type="button"
              className={tab === t.id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(t.id)}
            >
              <t.icon />
              <span>{t.label}</span>
              {counts[t.id] !== null && <span className="count">{counts[t.id]}</span>}
            </button>
          </div>
        ))}
        <div className="sidebar-foot">
          <b>{ores}</b> {ores === 1 ? "Erz generiert" : "Erze generieren"} in der Welt
          <br />
          Ziel: NeoForge · Java 21
        </div>
      </nav>

      <main>
        <div className="page">
          {tab === "mod" && <ModSection spec={spec} set={set} />}
          {tab === "items" && <ItemsSection spec={spec} set={set} />}
          {tab === "blocks" && <BlocksSection spec={spec} set={set} />}
          {tab === "tools" && <ToolsSection spec={spec} set={set} />}
          {tab === "armor" && <ArmorSection spec={spec} set={set} />}
          {tab === "recipes" && <RecipesSection spec={spec} set={set} />}
          {tab === "build" && <BuildSection spec={spec} />}
        </div>
      </main>
    </div>
  );
}
