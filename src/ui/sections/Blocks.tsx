import {
  BlockSpec,
  DIG_TOOLS,
  MAP_COLORS,
  ORE_DIMENSIONS,
  ORE_PRESETS,
  ORE_SHAPES,
  OreGenSpec,
  SOUND_TYPES,
  TOOL_TIERS,
  type ModSpec,
  type OreGenSpec as OreGen,
  type OrePresetId,
} from "../../core/spec.js";
import { IconBlock, IconOre } from "../icons.js";
import { patchAt, removeAt, slug, uniqueId } from "../lib.js";
import { TextureSlot } from "../TextureEditor.js";
import { Check, EntryCard, Field, NumberInput, Section, Select, TextInput } from "../widgets.js";

const DIM_LABELS: Record<string, string> = {
  overworld: "Oberwelt",
  nether: "Nether",
  end: "End",
};

const SHAPE_LABELS: Record<string, string> = {
  uniform: "gleichmäßig verteilt",
  trapezoid: "in der Mitte am häufigsten",
  biased_to_bottom: "unten am häufigsten",
};

/** Vanilla coal is the densest ore in the game at ~340 blocks per chunk. */
function rarityLabel(perChunk: number): string {
  if (perChunk >= 250) return "sehr häufig";
  if (perChunk >= 100) return "häufig";
  if (perChunk >= 40) return "normal";
  if (perChunk >= 12) return "selten";
  return "sehr selten";
}

function OrePanel({ ore, onChange }: { ore: OreGen; onChange: (o: OreGen) => void }) {
  const patch = (p: Partial<OreGen>) => onChange({ ...ore, ...p });
  const perChunk = Math.round(ore.veinSize * ore.veinsPerChunk * (1 - ore.discardOnAirExposure));

  return (
    <div style={{ marginTop: 12, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 18, height: 18, display: "inline-flex" }}>
          <IconOre />
        </span>
        Weltgenerierung
      </h3>

      <div className="chips" style={{ marginBottom: 16 }}>
        {(Object.keys(ORE_PRESETS) as OrePresetId[]).map((k) => {
          const { label, ...values } = ORE_PRESETS[k];
          const on = (Object.keys(values) as (keyof typeof values)[]).every(
            (f) => ore[f] === values[f],
          );
          return (
            <button
              key={k}
              type="button"
              className={on ? "chip on" : "chip"}
              onClick={() => patch(values)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid">
        <Select
          label="Dimension"
          value={ore.dimension}
          options={ORE_DIMENSIONS}
          labels={DIM_LABELS}
          onChange={(dimension) => patch({ dimension })}
        />
        <NumberInput
          label="Blöcke pro Ader"
          value={ore.veinSize}
          min={1}
          max={64}
          onChange={(veinSize) => patch({ veinSize })}
        />
        <NumberInput
          label="Adern pro Chunk"
          value={ore.veinsPerChunk}
          min={1}
          max={256}
          onChange={(veinsPerChunk) => patch({ veinsPerChunk })}
        />
        <NumberInput
          label="Mindesthöhe (Y)"
          value={ore.minHeight}
          min={-64}
          max={320}
          onChange={(minHeight) => patch({ minHeight })}
        />
        <NumberInput
          label="Maximalhöhe (Y)"
          value={ore.maxHeight}
          min={-64}
          max={320}
          onChange={(maxHeight) => patch({ maxHeight })}
        />
        <Select
          label="Verteilung"
          value={ore.shape}
          options={ORE_SHAPES}
          labels={SHAPE_LABELS}
          onChange={(shape) => patch({ shape })}
        />
        <NumberInput
          label="An Luft verwerfen (0–1)"
          value={ore.discardOnAirExposure}
          min={0}
          max={1}
          step={0.1}
          onChange={(discardOnAirExposure) => patch({ discardOnAirExposure })}
        />
      </div>

      <p className="hint" style={{ margin: "14px 0 0" }}>
        Schätzung: etwa <b>{perChunk}</b> Blöcke pro Chunk zwischen Y {Math.min(ore.minHeight, ore.maxHeight)}{" "}
        und Y {Math.max(ore.minHeight, ore.maxHeight)} — {rarityLabel(perChunk)}. Zum Vergleich:
        Kohle ≈ 340, Eisen ≈ 90, Diamant ≈ 28.
      </p>
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  none: "kein Werkzeug",
  pickaxe: "Spitzhacke",
  axe: "Axt",
  shovel: "Schaufel",
  hoe: "Hacke",
};

const TIER_LABELS: Record<string, string> = {
  WOOD: "Holz",
  STONE: "Stein",
  IRON: "Eisen",
  GOLD: "Gold",
  DIAMOND: "Diamant",
  NETHERITE: "Netherit",
};

export function BlocksSection({
  spec,
  set,
}: {
  spec: ModSpec;
  set: (patch: Partial<ModSpec>) => void;
}) {
  const blocks = spec.blocks;
  const update = (i: number, patch: Partial<ModSpec["blocks"][number]>) =>
    set({ blocks: patchAt(blocks, i, patch) });

  const add = () => {
    const id = uniqueId("neuer_block", blocks.map((b) => b.id));
    set({ blocks: [...blocks, BlockSpec.parse({ id, name: "Neuer Block" })] });
  };

  const dropTargets = [
    ...spec.items.map((it) => it.id),
    ...blocks.map((b) => b.id),
    "minecraft:diamond",
    "minecraft:coal",
    "minecraft:emerald",
  ];

  return (
    <Section
      title="Blöcke"
      hint="Platzierbare Blöcke mit Härte, Werkzeugstufe, Licht und Drops."
      onAdd={add}
      addLabel="Block hinzufügen"
    >
      {blocks.length === 0 && (
        <div className="empty">
          <IconBlock />
          <b>Noch keine Blöcke</b>
          <span>Blöcke können abgebaut werden, etwas droppen und als Erz in der Welt wachsen.</span>
        </div>
      )}
      {blocks.map((block, i) => (
        <EntryCard
          key={i}
          title={block.name || block.id}
          onRemove={() => set({ blocks: removeAt(blocks, i) })}
        >
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            <TextureSlot
              label="Textur"
              value={block.texture}
              onChange={(texture) => update(i, { texture })}
            />
            <div className="grid" style={{ flex: 1 }}>
              <TextInput label="Name" value={block.name} onChange={(name) => update(i, { name })} />
              <TextInput label="ID" value={block.id} onChange={(id) => update(i, { id: slug(id) })} />
              <NumberInput
                label="Härte (Abbauzeit)"
                value={block.hardness}
                min={0}
                step={0.5}
                onChange={(hardness) => update(i, { hardness })}
              />
              <NumberInput
                label="Explosionswiderstand"
                value={block.resistance}
                min={0}
                step={0.5}
                onChange={(resistance) => update(i, { resistance })}
              />
              <Select
                label="Werkzeug"
                value={block.tool}
                options={DIG_TOOLS}
                labels={TOOL_LABELS}
                onChange={(tool) => update(i, { tool })}
              />
              <Select
                label="Benötigte Stufe"
                value={block.tier}
                options={TOOL_TIERS}
                labels={TIER_LABELS}
                onChange={(tier) => update(i, { tier })}
              />
              <NumberInput
                label="Lichtstärke (0–15)"
                value={block.lightLevel}
                min={0}
                max={15}
                onChange={(lightLevel) => update(i, { lightLevel })}
              />
              <Select
                label="Geräusch"
                value={block.sound}
                options={SOUND_TYPES}
                onChange={(sound) => update(i, { sound })}
              />
              <Select
                label="Kartenfarbe"
                value={block.mapColor}
                options={MAP_COLORS}
                onChange={(mapColor) => update(i, { mapColor })}
              />
              <Check
                label="Nur mit passendem Werkzeug abbaubar"
                value={block.requiresTool}
                onChange={(requiresTool) => update(i, { requiresTool })}
              />
            </div>
          </div>

          <div className="grid" style={{ marginTop: 12 }}>
            <Field label="Drop">
              <select
                value={block.drop.kind}
                onChange={(e) => {
                  const kind = e.target.value;
                  update(i, {
                    drop:
                      kind === "item"
                        ? { kind: "item", item: dropTargets[0] ?? "minecraft:diamond", min: 1, max: 1, fortune: false, silkTouch: true }
                        : kind === "nothing"
                          ? { kind: "nothing" }
                          : { kind: "self" },
                  });
                }}
              >
                <option value="self">sich selbst</option>
                <option value="item">anderes Item</option>
                <option value="nothing">nichts</option>
              </select>
            </Field>
            {block.drop.kind === "item" && (
              <>
                <Field label="Welches Item">
                  <select
                    value={block.drop.item}
                    onChange={(e) =>
                      update(i, { drop: { ...block.drop, kind: "item", item: e.target.value } as never })
                    }
                  >
                    {dropTargets.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <NumberInput
                  label="Menge min"
                  value={block.drop.min}
                  min={0}
                  onChange={(min) => update(i, { drop: { ...block.drop, min } as never })}
                />
                <NumberInput
                  label="Menge max"
                  value={block.drop.max}
                  min={0}
                  onChange={(max) => update(i, { drop: { ...block.drop, max } as never })}
                />
                <Check
                  label="Glück wirkt (wie Erz)"
                  value={block.drop.fortune}
                  onChange={(fortune) => update(i, { drop: { ...block.drop, fortune } as never })}
                />
                <Check
                  label="Behutsamkeit gibt den Block"
                  value={block.drop.silkTouch}
                  onChange={(silkTouch) => update(i, { drop: { ...block.drop, silkTouch } as never })}
                />
              </>
            )}
            <NumberInput
              label="XP min"
              value={block.xpMin}
              min={0}
              onChange={(xpMin) => update(i, { xpMin })}
            />
            <NumberInput
              label="XP max"
              value={block.xpMax}
              min={0}
              onChange={(xpMax) => update(i, { xpMax })}
            />
            <Check
              label="In der Welt generieren (Erz)"
              value={block.oreGen !== null}
              onChange={(on) =>
                update(i, { oreGen: on ? OreGenSpec.parse(ORE_PRESETS.iron) : null })
              }
            />
          </div>

          {block.oreGen && (
            <OrePanel ore={block.oreGen} onChange={(oreGen) => update(i, { oreGen })} />
          )}
        </EntryCard>
      ))}
    </Section>
  );
}
