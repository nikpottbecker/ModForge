import type { ModSpec } from "../spec.js";
import { resolveRef } from "../naming.js";
import { placeholderArmorLayer, placeholderTexture, type SpriteKind } from "../textures.js";
import { dataUrlToBase64 } from "../png.js";
import { armorItemId, toolItemId } from "./java.js";
import { json, text, type GenFile } from "./types.js";

const MINEABLE_TAG: Record<string, string | null> = {
  none: null,
  pickaxe: "mineable/pickaxe",
  axe: "mineable/axe",
  shovel: "mineable/shovel",
  hoe: "mineable/hoe",
};

/** Vanilla only defines mining-level tags for stone, iron and diamond. */
const NEEDS_TOOL_TAG: Record<string, string | null> = {
  WOOD: null,
  GOLD: null,
  STONE: "needs_stone_tool",
  IRON: "needs_iron_tool",
  DIAMOND: "needs_diamond_tool",
  NETHERITE: "needs_diamond_tool",
};

const TOOL_PATTERNS: Record<string, string[]> = {
  pickaxe: ["MMM", " S ", " S "],
  axe: ["MM ", "MS ", " S "],
  shovel: [" M ", " S ", " S "],
  hoe: ["MM ", " S ", " S "],
  sword: [" M ", " M ", " S "],
};

const ARMOR_PATTERNS: Record<string, string[]> = {
  helmet: ["MMM", "M M"],
  chestplate: ["M M", "MMM", "MMM"],
  leggings: ["MMM", "M M", "M M"],
  boots: ["M M", "M M"],
};

export function resourceFiles(spec: ModSpec): GenFile[] {
  return [
    text("src/main/templates/META-INF/neoforge.mods.toml", modsToml()),
    ...langFiles(spec),
    ...modelFiles(spec),
    ...textureFiles(spec),
    ...lootTableFiles(spec),
    ...recipeFiles(spec),
    ...tagFiles(spec),
    ...worldgenFiles(spec),
  ];
}

/**
 * What a vein may replace, and which biomes it may spawn in.
 *
 * The overworld has `*_ore_replaceables` block tags, so those use `tag_match`. The nether
 * and the end have no such tags — vanilla's own nether ores match the single block instead,
 * and using `tag_match` there yields a vein that silently never generates.
 */
type RuleTest = { predicate_type: string; tag?: string; block?: string };

const tagMatch = (tag: string): RuleTest => ({ predicate_type: "minecraft:tag_match", tag });
const blockMatch = (block: string): RuleTest => ({ predicate_type: "minecraft:block_match", block });

const ORE_DIMENSION: Record<string, { targets: RuleTest[]; biomes: string }> = {
  overworld: {
    targets: [
      tagMatch("minecraft:stone_ore_replaceables"),
      tagMatch("minecraft:deepslate_ore_replaceables"),
    ],
    biomes: "#minecraft:is_overworld",
  },
  nether: { targets: [blockMatch("minecraft:netherrack")], biomes: "#minecraft:is_nether" },
  end: { targets: [blockMatch("minecraft:end_stone")], biomes: "#minecraft:is_end" },
};

/**
 * Ore generation is pure data in 1.21.1: a configured feature describes the vein, a
 * placed feature describes where it is tried, and a NeoForge biome modifier attaches
 * it to biomes. All three registry directory names are singular.
 */
function worldgenFiles(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const ns = spec.modId;

  for (const b of spec.blocks) {
    const ore = b.oreGen;
    if (!ore) continue;
    const dim = ORE_DIMENSION[ore.dimension];
    const ref = `${ns}:${b.id}`;

    out.push(
      json(`src/main/resources/data/${ns}/worldgen/configured_feature/${b.id}.json`, {
        type: "minecraft:ore",
        config: {
          size: ore.veinSize,
          discard_chance_on_air_exposure: ore.discardOnAirExposure,
          targets: dim.targets.map((target) => ({ target, state: { Name: ref } })),
        },
      }),
    );

    out.push(
      json(`src/main/resources/data/${ns}/worldgen/placed_feature/${b.id}.json`, {
        feature: ref,
        placement: [
          { type: "minecraft:count", count: ore.veinsPerChunk },
          { type: "minecraft:in_square" },
          {
            type: "minecraft:height_range",
            height: {
              type: `minecraft:${ore.shape}`,
              min_inclusive: { absolute: Math.min(ore.minHeight, ore.maxHeight) },
              max_inclusive: { absolute: Math.max(ore.minHeight, ore.maxHeight) },
            },
          },
          { type: "minecraft:biome" },
        ],
      }),
    );

    out.push(
      json(`src/main/resources/data/${ns}/neoforge/biome_modifier/${b.id}.json`, {
        type: "neoforge:add_features",
        biomes: dim.biomes,
        features: ref,
        step: "underground_ores",
      }),
    );
  }
  return out;
}

function modsToml(): string {
  return `modLoader="javafml"
loaderVersion="\${loader_version_range}"
license="\${mod_license}"

[[mods]]
modId="\${mod_id}"
version="\${mod_version}"
displayName="\${mod_name}"
authors="\${mod_authors}"
description='''
\${mod_description}
'''

[[dependencies.\${mod_id}]]
    modId="neoforge"
    type="required"
    versionRange="[\${neo_version},)"
    ordering="NONE"
    side="BOTH"

[[dependencies.\${mod_id}]]
    modId="minecraft"
    type="required"
    versionRange="\${minecraft_version_range}"
    ordering="NONE"
    side="BOTH"
`;
}

function langFiles(spec: ModSpec): GenFile[] {
  const entries: Record<string, string> = {};
  for (const b of spec.blocks) entries[`block.${spec.modId}.${b.id}`] = b.name;
  for (const i of spec.items) {
    entries[`item.${spec.modId}.${i.id}`] = i.name;
    i.tooltip.forEach((line, n) => {
      entries[`tooltip.${spec.modId}.${i.id}.${n}`] = line;
    });
  }
  for (const s of spec.toolSets) {
    for (const kind of s.kinds) entries[`item.${spec.modId}.${toolItemId(s, kind)}`] = `${s.name} ${TOOL_LABEL[kind]}`;
  }
  for (const s of spec.armorSets) {
    for (const p of s.pieces) entries[`item.${spec.modId}.${armorItemId(s, p)}`] = `${s.name} ${ARMOR_LABEL[p]}`;
  }
  if (spec.creativeTab.enabled) {
    entries[`itemGroup.${spec.modId}`] = spec.creativeTab.name || spec.name;
  }
  return [
    json(`src/main/resources/assets/${spec.modId}/lang/en_us.json`, entries),
    json(`src/main/resources/assets/${spec.modId}/lang/de_de.json`, entries),
  ];
}

const TOOL_LABEL: Record<string, string> = {
  pickaxe: "Pickaxe",
  axe: "Axe",
  shovel: "Shovel",
  hoe: "Hoe",
  sword: "Sword",
};

const ARMOR_LABEL: Record<string, string> = {
  helmet: "Helmet",
  chestplate: "Chestplate",
  leggings: "Leggings",
  boots: "Boots",
};

function modelFiles(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const A = `src/main/resources/assets/${spec.modId}`;

  for (const b of spec.blocks) {
    out.push(
      json(`${A}/blockstates/${b.id}.json`, { variants: { "": { model: `${spec.modId}:block/${b.id}` } } }),
      json(`${A}/models/block/${b.id}.json`, {
        parent: "minecraft:block/cube_all",
        textures: { all: `${spec.modId}:block/${b.id}` },
      }),
      json(`${A}/models/item/${b.id}.json`, { parent: `${spec.modId}:block/${b.id}` }),
    );
  }
  for (const i of spec.items) {
    out.push(
      json(`${A}/models/item/${i.id}.json`, {
        parent: "minecraft:item/generated",
        textures: { layer0: `${spec.modId}:item/${i.id}` },
      }),
    );
  }
  for (const s of spec.toolSets) {
    for (const kind of s.kinds) {
      const id = toolItemId(s, kind);
      out.push(
        json(`${A}/models/item/${id}.json`, {
          parent: "minecraft:item/handheld",
          textures: { layer0: `${spec.modId}:item/${id}` },
        }),
      );
    }
  }
  for (const s of spec.armorSets) {
    for (const p of s.pieces) {
      const id = armorItemId(s, p);
      out.push(
        json(`${A}/models/item/${id}.json`, {
          parent: "minecraft:item/generated",
          textures: { layer0: `${spec.modId}:item/${id}` },
        }),
      );
    }
  }
  return out;
}

function png(path: string, dataUrl: string): GenFile {
  return { path, base64: dataUrlToBase64(dataUrl) };
}

function textureFiles(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const T = `src/main/resources/assets/${spec.modId}/textures`;
  const pick = (t: { png: string } | null | undefined, id: string, kind: SpriteKind) =>
    t?.png ?? placeholderTexture(id, kind);

  for (const b of spec.blocks) out.push(png(`${T}/block/${b.id}.png`, pick(b.texture, b.id, "block")));
  for (const i of spec.items) out.push(png(`${T}/item/${i.id}.png`, pick(i.texture, i.id, "item")));
  for (const s of spec.toolSets) {
    for (const kind of s.kinds) {
      const id = toolItemId(s, kind);
      out.push(png(`${T}/item/${id}.png`, pick(s.textures[kind], id, kind as SpriteKind)));
    }
  }
  for (const s of spec.armorSets) {
    for (const p of s.pieces) {
      const id = armorItemId(s, p);
      out.push(png(`${T}/item/${id}.png`, pick(s.textures[p], id, p as SpriteKind)));
    }
    out.push(
      png(`${T}/models/armor/${s.id}_layer_1.png`, s.layer1?.png ?? placeholderArmorLayer(s.id, 1)),
      png(`${T}/models/armor/${s.id}_layer_2.png`, s.layer2?.png ?? placeholderArmorLayer(s.id, 2)),
    );
  }
  return out;
}

function lootTableFiles(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const D = `src/main/resources/data/${spec.modId}/loot_table/blocks`;

  for (const b of spec.blocks) {
    const self = `${spec.modId}:${b.id}`;
    const randomSequence = `${spec.modId}:blocks/${b.id}`;
    if (b.drop.kind === "nothing") {
      out.push(json(`${D}/${b.id}.json`, { type: "minecraft:block", pools: [], random_sequence: randomSequence }));
      continue;
    }
    if (b.drop.kind === "self") {
      out.push(
        json(`${D}/${b.id}.json`, {
          type: "minecraft:block",
          random_sequence: randomSequence,
          pools: [
            {
              rolls: 1.0,
              bonus_rolls: 0.0,
              conditions: [{ condition: "minecraft:survives_explosion" }],
              entries: [{ type: "minecraft:item", name: self }],
            },
          ],
        }),
      );
      continue;
    }

    const dropped = resolveRef(b.drop.item, spec.modId);
    const functions: unknown[] = [];
    if (b.drop.fortune) {
      functions.push({
        function: "minecraft:apply_bonus",
        enchantment: "minecraft:fortune",
        formula: "minecraft:ore_drops",
      });
    }
    if (b.drop.min !== 1 || b.drop.max !== 1) {
      functions.unshift({
        function: "minecraft:set_count",
        count: { type: "minecraft:uniform", min: b.drop.min, max: b.drop.max },
      });
    }
    functions.push({ function: "minecraft:explosion_decay" });

    const itemEntry = { type: "minecraft:item", name: dropped, functions };
    const entries = b.drop.silkTouch
      ? [
          {
            type: "minecraft:alternatives",
            children: [
              {
                type: "minecraft:item",
                name: self,
                conditions: [
                  {
                    condition: "minecraft:match_tool",
                    predicate: {
                      predicates: {
                        "minecraft:enchantments": [{ enchantments: "minecraft:silk_touch", levels: { min: 1 } }],
                      },
                    },
                  },
                ],
              },
              itemEntry,
            ],
          },
        ]
      : [itemEntry];

    out.push(
      json(`${D}/${b.id}.json`, {
        type: "minecraft:block",
        random_sequence: randomSequence,
        pools: [{ rolls: 1.0, bonus_rolls: 0.0, entries }],
      }),
    );
  }
  return out;
}

function shapedJson(pattern: string[], key: Record<string, string>, result: string, count: number) {
  return {
    type: "minecraft:crafting_shaped",
    category: "misc",
    key: Object.fromEntries(Object.entries(key).map(([k, v]) => [k, { item: v }])),
    pattern,
    result: { count, id: result },
  };
}

function recipeFiles(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const D = `src/main/resources/data/${spec.modId}/recipe`;

  for (const r of spec.recipes) {
    if (r.kind === "shaped") {
      // Compact the grid: drop empty rows/columns, then map distinct items onto keys.
      const grid = r.grid.map((row) => row.map((c) => c.trim()));
      const usedRows = grid.filter((row) => row.some(Boolean));
      const usedCols = [0, 1, 2].filter((c) => grid.some((row) => row[c]));
      if (!usedRows.length || !usedCols.length) continue;

      const symbols = "ABCDEFGHI";
      const key: Record<string, string> = {};
      const symbolOf = new Map<string, string>();
      const pattern = usedRows.map((row) =>
        usedCols
          .map((c) => {
            const item = row[c];
            if (!item) return " ";
            const full = resolveRef(item, spec.modId);
            if (!symbolOf.has(full)) {
              const s = symbols[symbolOf.size];
              symbolOf.set(full, s);
              key[s] = full;
            }
            return symbolOf.get(full)!;
          })
          .join(""),
      );
      out.push(json(`${D}/${r.id}.json`, shapedJson(pattern, key, resolveRef(r.result, spec.modId), r.count)));
    } else if (r.kind === "shapeless") {
      out.push(
        json(`${D}/${r.id}.json`, {
          type: "minecraft:crafting_shapeless",
          category: "misc",
          ingredients: r.ingredients.map((i) => ({ item: resolveRef(i, spec.modId) })),
          result: { count: r.count, id: resolveRef(r.result, spec.modId) },
        }),
      );
    } else {
      const make = (type: string, time: number) => ({
        type,
        category: "misc",
        cookingtime: time,
        experience: r.experience,
        ingredient: { item: resolveRef(r.ingredient, spec.modId) },
        result: { id: resolveRef(r.result, spec.modId) },
      });
      out.push(json(`${D}/${r.id}.json`, make("minecraft:smelting", r.cookingTime)));
      if (r.blasting) {
        out.push(json(`${D}/${r.id}_blasting.json`, make("minecraft:blasting", Math.max(1, Math.floor(r.cookingTime / 2)))));
      }
    }
  }

  out.push(...toolRecipes(spec), ...armorRecipes(spec));
  return out;
}

function toolRecipes(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const D = `src/main/resources/data/${spec.modId}/recipe`;
  for (const s of spec.toolSets) {
    if (!s.autoRecipes || !s.repairItem.trim()) continue;
    const material = resolveRef(s.repairItem, spec.modId);
    for (const kind of s.kinds) {
      const id = toolItemId(s, kind);
      out.push(
        json(
          `${D}/${id}.json`,
          shapedJson(TOOL_PATTERNS[kind], { M: material, S: "minecraft:stick" }, `${spec.modId}:${id}`, 1),
        ),
      );
    }
  }
  return out;
}

function armorRecipes(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const D = `src/main/resources/data/${spec.modId}/recipe`;
  for (const s of spec.armorSets) {
    if (!s.autoRecipes || !s.repairItem.trim()) continue;
    const material = resolveRef(s.repairItem, spec.modId);
    for (const p of s.pieces) {
      const id = armorItemId(s, p);
      out.push(json(`${D}/${id}.json`, shapedJson(ARMOR_PATTERNS[p], { M: material }, `${spec.modId}:${id}`, 1)));
    }
  }
  return out;
}

function tagFiles(spec: ModSpec): GenFile[] {
  const out: GenFile[] = [];
  const byTag = new Map<string, string[]>();
  const add = (tag: string, value: string) => {
    const list = byTag.get(tag) ?? [];
    list.push(value);
    byTag.set(tag, list);
  };

  for (const b of spec.blocks) {
    const ref = `${spec.modId}:${b.id}`;
    const mineable = MINEABLE_TAG[b.tool];
    if (mineable) add(mineable, ref);
    if (b.requiresTool) {
      const needs = NEEDS_TOOL_TAG[b.tier];
      if (needs) add(needs, ref);
    }
  }

  for (const [tag, values] of byTag) {
    out.push(json(`src/main/resources/data/minecraft/tags/block/${tag}.json`, { replace: false, values }));
  }
  return out;
}
