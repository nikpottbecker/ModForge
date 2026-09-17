import { allItemIds } from "../../core/generator/index.js";
import { RecipeSpec, type ModSpec } from "../../core/spec.js";
import { IconRecipe } from "../icons.js";
import { patchAt, removeAt, slug, uniqueId } from "../lib.js";
import { Check, EntryCard, Field, NumberInput, Section, TextInput } from "../widgets.js";

const VANILLA = [
  "minecraft:stick",
  "minecraft:diamond",
  "minecraft:iron_ingot",
  "minecraft:gold_ingot",
  "minecraft:coal",
  "minecraft:redstone",
];

function Picker({
  label,
  value,
  options,
  onChange,
  allowEmpty,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  const select = (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">— leer —</option>}
      {!options.includes(value) && value !== "" && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
  return label ? <Field label={label}>{select}</Field> : select;
}

export function RecipesSection({
  spec,
  set,
}: {
  spec: ModSpec;
  set: (patch: Partial<ModSpec>) => void;
}) {
  const recipes = spec.recipes;
  const own = allItemIds(spec);
  const options = [...own, ...VANILLA];
  const first = own[0] ?? "minecraft:diamond";

  const update = (i: number, patch: Record<string, unknown>) =>
    set({ recipes: patchAt(recipes, i, patch as never) });

  const add = (kind: "shaped" | "shapeless" | "smelting") => {
    const id = uniqueId(`rezept_${recipes.length + 1}`, recipes.map((r) => r.id));
    const base =
      kind === "shaped"
        ? { kind, id, grid: [["", "", ""], ["", "", ""], ["", "", ""]], result: first, count: 1 }
        : kind === "shapeless"
          ? { kind, id, ingredients: [first], result: first, count: 1 }
          : { kind, id, ingredient: first, result: first, experience: 0.7, cookingTime: 200, blasting: false };
    set({ recipes: [...recipes, RecipeSpec.parse(base)] });
  };

  return (
    <Section
      title="Rezepte"
      hint="Werkbank-, Ofen- und formlose Rezepte. Rezepte für Werkzeuge und Rüstung entstehen automatisch."
      actions={
        <>
          <button type="button" className="btn" onClick={() => add("shaped")}>
            + Werkbank
          </button>
          <button type="button" className="btn" onClick={() => add("shapeless")}>
            + Formlos
          </button>
          <button type="button" className="btn" onClick={() => add("smelting")}>
            + Ofen
          </button>
        </>
      }
    >
      {recipes.length === 0 && (
        <div className="empty">
          <IconRecipe />
          <b>Noch keine eigenen Rezepte</b>
          <span>Für Werkzeuge und Rüstung entstehen die Rezepte bereits automatisch.</span>
        </div>
      )}

      {recipes.map((r, i) => (
        <EntryCard
          key={i}
          title={`${r.id} — ${r.kind === "shaped" ? "Werkbank" : r.kind === "shapeless" ? "Formlos" : "Ofen"}`}
          onRemove={() => set({ recipes: removeAt(recipes, i) })}
        >
          <div className="grid" style={{ marginBottom: 14 }}>
            <TextInput label="ID" value={r.id} onChange={(id) => update(i, { id: slug(id) })} />
            <Picker
              label="Ergebnis"
              value={r.result}
              options={options}
              onChange={(result) => update(i, { result })}
            />
            {r.kind !== "smelting" && (
              <NumberInput
                label="Anzahl"
                value={r.count}
                min={1}
                max={64}
                onChange={(count) => update(i, { count })}
              />
            )}
          </div>

          {r.kind === "shaped" && (
            <div className="recipe-grid">
              {r.grid.map((row, y) =>
                row.map((cell, x) => (
                  <Picker
                    key={`${y}-${x}`}
                    value={cell}
                    options={options}
                    allowEmpty
                    onChange={(v) =>
                      update(i, {
                        grid: r.grid.map((rr, yy) =>
                          yy === y ? rr.map((cc, xx) => (xx === x ? v : cc)) : rr,
                        ),
                      })
                    }
                  />
                )),
              )}
            </div>
          )}

          {r.kind === "shapeless" && (
            <div>
              <div className="grid">
                {r.ingredients.map((ing, k) => (
                  <div key={k} className="row">
                    <Picker
                      value={ing}
                      options={options}
                      onChange={(v) =>
                        update(i, { ingredients: r.ingredients.map((o, j) => (j === k ? v : o)) })
                      }
                    />
                    <button
                      type="button"
                      className="btn sm danger"
                      onClick={() =>
                        r.ingredients.length > 1 &&
                        update(i, { ingredients: removeAt(r.ingredients, k) })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn sm"
                style={{ marginTop: 10 }}
                disabled={r.ingredients.length >= 9}
                onClick={() => update(i, { ingredients: [...r.ingredients, first] })}
              >
                + Zutat
              </button>
            </div>
          )}

          {r.kind === "smelting" && (
            <div className="grid">
              <Picker
                label="Zutat"
                value={r.ingredient}
                options={options}
                onChange={(ingredient) => update(i, { ingredient })}
              />
              <NumberInput
                label="Erfahrung"
                value={r.experience}
                min={0}
                step={0.1}
                onChange={(experience) => update(i, { experience })}
              />
              <NumberInput
                label="Dauer in Ticks"
                value={r.cookingTime}
                min={1}
                step={20}
                onChange={(cookingTime) => update(i, { cookingTime })}
              />
              <Check
                label="Auch im Schmelzofen"
                value={r.blasting}
                onChange={(blasting) => update(i, { blasting })}
              />
            </div>
          )}
        </EntryCard>
      ))}
    </Section>
  );
}
