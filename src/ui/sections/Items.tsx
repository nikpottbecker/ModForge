import { ItemSpec, RARITIES, type ModSpec } from "../../core/spec.js";
import { IconItem } from "../icons.js";
import { patchAt, removeAt, slug, uniqueId } from "../lib.js";
import { TextureSlot } from "../TextureEditor.js";
import { Check, EntryCard, NumberInput, Section, Select, TextInput } from "../widgets.js";

const RARITY_LABELS: Record<string, string> = {
  COMMON: "Gewöhnlich (weiß)",
  UNCOMMON: "Ungewöhnlich (gelb)",
  RARE: "Selten (türkis)",
  EPIC: "Episch (lila)",
};

export function ItemsSection({
  spec,
  set,
}: {
  spec: ModSpec;
  set: (patch: Partial<ModSpec>) => void;
}) {
  const items = spec.items;
  const update = (i: number, patch: Partial<ModSpec["items"][number]>) =>
    set({ items: patchAt(items, i, patch) });

  const add = () => {
    const id = uniqueId("neues_item", items.map((it) => it.id));
    set({ items: [...items, ItemSpec.parse({ id, name: "Neues Item" })] });
  };

  return (
    <Section
      title="Items"
      hint="Gegenstände im Inventar — Zutaten, Nahrung, Brennstoffe."
      onAdd={add}
      addLabel="Item hinzufügen"
    >
      {items.length === 0 && (
        <div className="empty">
          <IconItem />
          <b>Noch keine Items</b>
          <span>Items sind alles, was im Inventar liegt — Zutaten, Nahrung, Sammelstücke.</span>
        </div>
      )}
      {items.map((item, i) => (
        <EntryCard
          key={i}
          title={item.name || item.id}
          onRemove={() => set({ items: removeAt(items, i) })}
        >
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            <TextureSlot
              label="Textur"
              value={item.texture}
              onChange={(texture) => update(i, { texture })}
            />
            <div className="grid" style={{ flex: 1 }}>
              <TextInput
                label="Name"
                value={item.name}
                onChange={(name) => update(i, { name })}
              />
              <TextInput label="ID" value={item.id} onChange={(id) => update(i, { id: slug(id) })} />
              <NumberInput
                label="Max. Stapel"
                value={item.maxStackSize}
                min={1}
                max={99}
                onChange={(maxStackSize) => update(i, { maxStackSize })}
              />
              <Select
                label="Seltenheit"
                value={item.rarity}
                options={RARITIES}
                labels={RARITY_LABELS}
                onChange={(rarity) => update(i, { rarity })}
              />
              <NumberInput
                label="Brennzeit in Ticks (0 = kein Brennstoff)"
                value={item.burnTime}
                min={0}
                step={100}
                onChange={(burnTime) => update(i, { burnTime })}
              />
              <Check
                label="Feuerfest"
                value={item.fireResistant}
                onChange={(fireResistant) => update(i, { fireResistant })}
              />
              <Check label="Glitzert" value={item.glint} onChange={(glint) => update(i, { glint })} />
              <Check
                label="Essbar"
                value={item.food !== null}
                onChange={(on) =>
                  update(i, {
                    food: on ? { nutrition: 4, saturation: 0.3, alwaysEdible: false, fastEating: false } : null,
                  })
                }
              />
            </div>
          </div>

          {item.food && (
            <div className="grid" style={{ marginTop: 12 }}>
              <NumberInput
                label="Sättigungspunkte (halbe Hühnchen)"
                value={item.food.nutrition}
                min={0}
                max={20}
                onChange={(nutrition) => update(i, { food: { ...item.food!, nutrition } })}
              />
              <NumberInput
                label="Sättigungsgrad"
                value={item.food.saturation}
                min={0}
                max={20}
                step={0.1}
                onChange={(saturation) => update(i, { food: { ...item.food!, saturation } })}
              />
              <Check
                label="Immer essbar"
                value={item.food.alwaysEdible}
                onChange={(alwaysEdible) => update(i, { food: { ...item.food!, alwaysEdible } })}
              />
              <Check
                label="Schnell essbar"
                value={item.food.fastEating}
                onChange={(fastEating) => update(i, { food: { ...item.food!, fastEating } })}
              />
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <TextInput
              label="Tooltip-Zeilen (mit | trennen)"
              value={item.tooltip.join(" | ")}
              placeholder="Ein glühend roter Edelstein."
              onChange={(v) =>
                update(i, {
                  tooltip: v
                    .split("|")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </EntryCard>
      ))}
    </Section>
  );
}
