import {
  ARMOR_PIECES,
  ArmorSetSpec,
  TOOL_KINDS,
  TOOL_TIERS,
  ToolSetSpec,
  type ModSpec,
  type Texture,
} from "../../core/spec.js";
import { IconArmor, IconTool } from "../icons.js";
import { patchAt, removeAt, slug, uniqueId } from "../lib.js";
import { TextureSlot } from "../TextureEditor.js";
import { Check, Chips, EntryCard, Field, NumberInput, Section, Select, TextInput } from "../widgets.js";

const KIND_LABELS: Record<string, string> = {
  pickaxe: "Spitzhacke",
  axe: "Axt",
  shovel: "Schaufel",
  hoe: "Hacke",
  sword: "Schwert",
};

const PIECE_LABELS: Record<string, string> = {
  helmet: "Helm",
  chestplate: "Brustplatte",
  leggings: "Hose",
  boots: "Stiefel",
};

const TIER_LABELS: Record<string, string> = {
  WOOD: "Holz",
  STONE: "Stein",
  IRON: "Eisen",
  GOLD: "Gold",
  DIAMOND: "Diamant",
  NETHERITE: "Netherit",
};

function setTex<K extends string>(
  rec: Partial<Record<K, Texture>>,
  key: K,
  t: Texture | null,
): Partial<Record<K, Texture>> {
  const next = { ...rec };
  if (t) next[key] = t;
  else delete next[key];
  return next;
}

function RepairSelect({
  spec,
  value,
  onChange,
}: {
  spec: ModSpec;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Material zum Herstellen / Reparieren">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— keins —</option>
        {spec.items.map((it) => (
          <option key={it.id} value={it.id}>
            {it.name || it.id}
          </option>
        ))}
        {["minecraft:diamond", "minecraft:iron_ingot", "minecraft:gold_ingot"].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ToolsSection({
  spec,
  set,
}: {
  spec: ModSpec;
  set: (patch: Partial<ModSpec>) => void;
}) {
  const sets = spec.toolSets;
  const update = (i: number, patch: Partial<ModSpec["toolSets"][number]>) =>
    set({ toolSets: patchAt(sets, i, patch) });

  const add = () => {
    const id = uniqueId("neues_set", sets.map((s) => s.id));
    set({
      toolSets: [
        ...sets,
        ToolSetSpec.parse({ id, name: "Neu", kinds: [...TOOL_KINDS], repairItem: spec.items[0]?.id ?? "" }),
      ],
    });
  };

  return (
    <Section
      title="Werkzeuge"
      hint="Ein Set erzeugt alle gewählten Werkzeuge samt Rezepten. Der Name wird zum Präfix, z. B. „Rubin-Spitzhacke“."
      onAdd={add}
      addLabel="Set hinzufügen"
    >
      {sets.length === 0 && (
        <div className="empty">
          <IconTool />
          <b>Noch keine Werkzeug-Sets</b>
          <span>Ein Set erzeugt Spitzhacke, Axt, Schaufel, Hacke und Schwert auf einmal.</span>
        </div>
      )}
      {sets.map((s, i) => (
        <EntryCard key={i} title={s.name || s.id} onRemove={() => set({ toolSets: removeAt(sets, i) })}>
          <div className="grid">
            <TextInput label="Name (Präfix)" value={s.name} onChange={(name) => update(i, { name })} />
            <TextInput label="ID" value={s.id} onChange={(id) => update(i, { id: slug(id) })} />
            <NumberInput
              label="Haltbarkeit"
              value={s.durability}
              min={1}
              step={50}
              onChange={(durability) => update(i, { durability })}
            />
            <NumberInput
              label="Abbaugeschwindigkeit"
              value={s.speed}
              min={0}
              step={0.5}
              onChange={(speed) => update(i, { speed })}
            />
            <NumberInput
              label="Angriffsschaden"
              value={s.attackDamage}
              min={0}
              step={0.5}
              onChange={(attackDamage) => update(i, { attackDamage })}
            />
            <NumberInput
              label="Verzauberbarkeit"
              value={s.enchantmentValue}
              min={0}
              onChange={(enchantmentValue) => update(i, { enchantmentValue })}
            />
            <Select
              label="Abbaustufe"
              value={s.tier}
              options={TOOL_TIERS}
              labels={TIER_LABELS}
              onChange={(tier) => update(i, { tier })}
            />
            <RepairSelect spec={spec} value={s.repairItem} onChange={(repairItem) => update(i, { repairItem })} />
            <Check
              label="Rezepte automatisch erzeugen"
              value={s.autoRecipes}
              onChange={(autoRecipes) => update(i, { autoRecipes })}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Enthaltene Werkzeuge</span>
            <div style={{ marginTop: 6 }}>
              <Chips
                options={TOOL_KINDS}
                value={s.kinds}
                labels={KIND_LABELS}
                onChange={(kinds) => kinds.length && update(i, { kinds })}
              />
            </div>
          </div>

          <div className="row" style={{ marginTop: 14, flexWrap: "wrap" }}>
            {s.kinds.map((k) => (
              <TextureSlot
                key={k}
                label={KIND_LABELS[k] ?? k}
                value={s.textures[k] ?? null}
                onChange={(t) => update(i, { textures: setTex(s.textures, k, t) })}
              />
            ))}
          </div>
        </EntryCard>
      ))}
    </Section>
  );
}

export function ArmorSection({
  spec,
  set,
}: {
  spec: ModSpec;
  set: (patch: Partial<ModSpec>) => void;
}) {
  const sets = spec.armorSets;
  const update = (i: number, patch: Partial<ModSpec["armorSets"][number]>) =>
    set({ armorSets: patchAt(sets, i, patch) });

  const add = () => {
    const id = uniqueId("neue_ruestung", sets.map((s) => s.id));
    set({
      armorSets: [
        ...sets,
        ArmorSetSpec.parse({ id, name: "Neu", pieces: [...ARMOR_PIECES], repairItem: spec.items[0]?.id ?? "" }),
      ],
    });
  };

  return (
    <Section
      title="Rüstung"
      hint="Die getragene Rüstung braucht zwei Ebenen-Grafiken (64×32). Ohne eigene werden Platzhalter erzeugt."
      onAdd={add}
      addLabel="Set hinzufügen"
    >
      {sets.length === 0 && (
        <div className="empty">
          <IconArmor />
          <b>Noch keine Rüstungs-Sets</b>
          <span>Helm, Brustpanzer, Hose und Schuhe entstehen zusammen mit ihren Rezepten.</span>
        </div>
      )}
      {sets.map((s, i) => (
        <EntryCard key={i} title={s.name || s.id} onRemove={() => set({ armorSets: removeAt(sets, i) })}>
          <div className="grid">
            <TextInput label="Name (Präfix)" value={s.name} onChange={(name) => update(i, { name })} />
            <TextInput label="ID" value={s.id} onChange={(id) => update(i, { id: slug(id) })} />
            <NumberInput
              label="Zähigkeit"
              value={s.toughness}
              min={0}
              step={0.5}
              onChange={(toughness) => update(i, { toughness })}
            />
            <NumberInput
              label="Rückstoßresistenz"
              value={s.knockbackResistance}
              min={0}
              step={0.1}
              onChange={(knockbackResistance) => update(i, { knockbackResistance })}
            />
            <NumberInput
              label="Verzauberbarkeit"
              value={s.enchantmentValue}
              min={0}
              onChange={(enchantmentValue) => update(i, { enchantmentValue })}
            />
            <NumberInput
              label="Haltbarkeitsfaktor"
              value={s.durabilityMultiplier}
              min={1}
              onChange={(durabilityMultiplier) => update(i, { durabilityMultiplier })}
            />
            <RepairSelect spec={spec} value={s.repairItem} onChange={(repairItem) => update(i, { repairItem })} />
            <Check
              label="Rezepte automatisch erzeugen"
              value={s.autoRecipes}
              onChange={(autoRecipes) => update(i, { autoRecipes })}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Enthaltene Teile</span>
            <div style={{ marginTop: 6 }}>
              <Chips
                options={ARMOR_PIECES}
                value={s.pieces}
                labels={PIECE_LABELS}
                onChange={(pieces) => pieces.length && update(i, { pieces })}
              />
            </div>
          </div>

          <div className="grid" style={{ marginTop: 12 }}>
            {s.pieces.map((p) => (
              <NumberInput
                key={p}
                label={`Schutz ${PIECE_LABELS[p]}`}
                value={s.defense[p]}
                min={0}
                onChange={(v) => update(i, { defense: { ...s.defense, [p]: v } })}
              />
            ))}
          </div>

          <div className="row" style={{ marginTop: 14, flexWrap: "wrap" }}>
            {s.pieces.map((p) => (
              <TextureSlot
                key={p}
                label={PIECE_LABELS[p] ?? p}
                value={s.textures[p] ?? null}
                onChange={(t) => update(i, { textures: setTex(s.textures, p, t) })}
              />
            ))}
            <TextureSlot
              label="Ebene 1 (Helm, Brust, Stiefel)"
              value={s.layer1}
              width={64}
              height={32}
              preview={128}
              onChange={(layer1) => update(i, { layer1 })}
            />
            <TextureSlot
              label="Ebene 2 (Hose)"
              value={s.layer2}
              width={64}
              height={32}
              preview={128}
              onChange={(layer2) => update(i, { layer2 })}
            />
          </div>
        </EntryCard>
      ))}
    </Section>
  );
}
