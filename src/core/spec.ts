import { z } from "zod";

/** Resource-location path: 1-64 chars. */
export const ID = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,63}$/, "nur a-z, 0-9, _ — muss mit einem Buchstaben beginnen");

/** Mod ids are stricter than resource paths: Forge requires at least two characters. */
export const MOD_ID = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,63}$/, "mindestens 2 Zeichen, nur a-z, 0-9, _");

export const RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC"] as const;

export const TOOL_TIERS = ["WOOD", "STONE", "IRON", "GOLD", "DIAMOND", "NETHERITE"] as const;

export const SOUND_TYPES = [
  "STONE",
  "WOOD",
  "GRAVEL",
  "METAL",
  "GLASS",
  "WOOL",
  "SAND",
  "SNOW",
  "AMETHYST",
  "DEEPSLATE",
  "COPPER",
  "NETHER_ORE",
] as const;

export const MAP_COLORS = [
  "NONE",
  "STONE",
  "METAL",
  "WOOD",
  "COLOR_RED",
  "COLOR_ORANGE",
  "COLOR_YELLOW",
  "COLOR_GREEN",
  "COLOR_CYAN",
  "COLOR_LIGHT_BLUE",
  "COLOR_BLUE",
  "COLOR_PURPLE",
  "COLOR_MAGENTA",
  "COLOR_PINK",
  "COLOR_BLACK",
  "COLOR_GRAY",
  "SNOW",
  "GOLD",
  "DIAMOND",
] as const;

export const DIG_TOOLS = ["none", "pickaxe", "axe", "shovel", "hoe"] as const;

export const VANILLA_TABS = [
  "BUILDING_BLOCKS",
  "COLORED_BLOCKS",
  "NATURAL_BLOCKS",
  "FUNCTIONAL_BLOCKS",
  "REDSTONE_BLOCKS",
  "TOOLS_AND_UTILITIES",
  "COMBAT",
  "FOOD_AND_DRINKS",
  "INGREDIENTS",
  "SPAWN_EGGS",
] as const;

/** 16x16 (or 32x32) RGBA texture, stored as a base64 PNG data URL. */
export const Texture = z.object({
  /** data URL: "data:image/png;base64,..." */
  png: z.string().startsWith("data:image/png;base64,"),
});
export type Texture = z.infer<typeof Texture>;

export const FoodSpec = z.object({
  nutrition: z.number().int().min(0).max(20),
  saturation: z.number().min(0).max(20),
  alwaysEdible: z.boolean().default(false),
  fastEating: z.boolean().default(false),
});

export const ItemSpec = z.object({
  id: ID,
  name: z.string().min(1),
  texture: Texture.nullable().default(null),
  maxStackSize: z.number().int().min(1).max(99).default(64),
  rarity: z.enum(RARITIES).default("COMMON"),
  fireResistant: z.boolean().default(false),
  /** Burn time in ticks; 0 = not a fuel. 200 ticks = one item smelted. */
  burnTime: z.number().int().min(0).default(0),
  tooltip: z.array(z.string()).default([]),
  food: FoodSpec.nullable().default(null),
  /** Glows like an enchanted item. */
  glint: z.boolean().default(false),
});
export type ItemSpec = z.infer<typeof ItemSpec>;

export const BlockDrop = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }),
  z.object({
    kind: z.literal("item"),
    /** "modid:item_id" or plain id of an own item, or "minecraft:diamond" */
    item: z.string().min(1),
    min: z.number().int().min(0).default(1),
    max: z.number().int().min(0).default(1),
    /** Drop is affected by Fortune (ore-style). */
    fortune: z.boolean().default(false),
    /** Silk Touch drops the block itself instead. */
    silkTouch: z.boolean().default(true),
  }),
  z.object({ kind: z.literal("nothing") }),
]);
export type BlockDrop = z.infer<typeof BlockDrop>;

export const ORE_DIMENSIONS = ["overworld", "nether", "end"] as const;

/** How veins are spread over the height range. */
export const ORE_SHAPES = ["uniform", "trapezoid", "biased_to_bottom"] as const;

export const OreGenSpec = z.object({
  dimension: z.enum(ORE_DIMENSIONS).default("overworld"),
  /** Blocks per vein. Vanilla: coal 17, iron 9, diamond 8, emerald 3. */
  veinSize: z.number().int().min(1).max(64).default(9),
  /** Vein attempts per chunk. Vanilla: coal 20, iron 10, gold 4. */
  veinsPerChunk: z.number().int().min(1).max(256).default(10),
  minHeight: z.number().int().min(-64).max(320).default(-64),
  maxHeight: z.number().int().min(-64).max(320).default(64),
  shape: z.enum(ORE_SHAPES).default("uniform"),
  /** 0 = always generate, 1 = never generate where the vein touches air (caves). */
  discardOnAirExposure: z.number().min(0).max(1).default(0),
});
export type OreGenSpec = z.infer<typeof OreGenSpec>;

/** Vanilla ore settings, read off OreFeatures/OrePlacements, offered as one-click presets. */
export const ORE_PRESETS = {
  coal: { label: "Wie Kohle", veinSize: 17, veinsPerChunk: 20, minHeight: 0, maxHeight: 192, shape: "trapezoid", discardOnAirExposure: 0 },
  iron: { label: "Wie Eisen", veinSize: 9, veinsPerChunk: 10, minHeight: -24, maxHeight: 56, shape: "trapezoid", discardOnAirExposure: 0 },
  gold: { label: "Wie Gold", veinSize: 9, veinsPerChunk: 4, minHeight: -64, maxHeight: 32, shape: "trapezoid", discardOnAirExposure: 0 },
  redstone: { label: "Wie Redstone", veinSize: 8, veinsPerChunk: 4, minHeight: -64, maxHeight: 15, shape: "uniform", discardOnAirExposure: 0 },
  lapis: { label: "Wie Lapis", veinSize: 7, veinsPerChunk: 2, minHeight: -32, maxHeight: 32, shape: "trapezoid", discardOnAirExposure: 0 },
  diamond: { label: "Wie Diamant", veinSize: 8, veinsPerChunk: 7, minHeight: -64, maxHeight: 16, shape: "trapezoid", discardOnAirExposure: 0.5 },
  emerald: { label: "Wie Smaragd (sehr selten)", veinSize: 3, veinsPerChunk: 1, minHeight: -16, maxHeight: 256, shape: "uniform", discardOnAirExposure: 0 },
} as const satisfies Record<string, { label: string } & Omit<OreGenSpec, "dimension">>;

export type OrePresetId = keyof typeof ORE_PRESETS;

export const BlockSpec = z.object({
  id: ID,
  name: z.string().min(1),
  texture: Texture.nullable().default(null),
  hardness: z.number().min(0).default(3),
  resistance: z.number().min(0).default(3),
  requiresTool: z.boolean().default(true),
  tool: z.enum(DIG_TOOLS).default("pickaxe"),
  tier: z.enum(TOOL_TIERS).default("STONE"),
  lightLevel: z.number().int().min(0).max(15).default(0),
  sound: z.enum(SOUND_TYPES).default("STONE"),
  mapColor: z.enum(MAP_COLORS).default("STONE"),
  drop: BlockDrop.default({ kind: "self" }),
  /** XP dropped when mined (ore-style), 0 = none. */
  xpMin: z.number().int().min(0).default(0),
  xpMax: z.number().int().min(0).default(0),
  /** null = the block does not generate in the world. */
  oreGen: OreGenSpec.nullable().default(null),
});
export type BlockSpec = z.infer<typeof BlockSpec>;

export const TOOL_KINDS = ["pickaxe", "axe", "shovel", "hoe", "sword"] as const;
export const ARMOR_PIECES = ["helmet", "chestplate", "leggings", "boots"] as const;

export const ToolSetSpec = z.object({
  id: ID,
  /** Display prefix, e.g. "Rubin" -> "Rubin-Spitzhacke" */
  name: z.string().min(1),
  kinds: z.array(z.enum(TOOL_KINDS)).min(1),
  durability: z.number().int().min(1).default(1561),
  /** Mining speed multiplier. */
  speed: z.number().min(0).default(8),
  /** Base attack damage bonus of the tier. */
  attackDamage: z.number().min(0).default(3),
  enchantmentValue: z.number().int().min(0).default(10),
  /** Mining level tier this tool can harvest, mapped onto vanilla tags. */
  tier: z.enum(TOOL_TIERS).default("DIAMOND"),
  /** Item id used for repairing / crafting, e.g. own item id or "minecraft:diamond". */
  repairItem: z.string().default(""),
  textures: z.partialRecord(z.enum(TOOL_KINDS), Texture).default({}),
  /** Auto-generate the standard crafting recipes for each tool. */
  autoRecipes: z.boolean().default(true),
});
export type ToolSetSpec = z.infer<typeof ToolSetSpec>;

export const ArmorSetSpec = z.object({
  id: ID,
  name: z.string().min(1),
  pieces: z.array(z.enum(ARMOR_PIECES)).min(1),
  /** Defense per piece. */
  defense: z
    .object({
      helmet: z.number().int().min(0).default(3),
      chestplate: z.number().int().min(0).default(8),
      leggings: z.number().int().min(0).default(6),
      boots: z.number().int().min(0).default(3),
    })
    .default({ helmet: 3, chestplate: 8, leggings: 6, boots: 3 }),
  toughness: z.number().min(0).default(2),
  knockbackResistance: z.number().min(0).default(0),
  enchantmentValue: z.number().int().min(0).default(10),
  /** Durability multiplier applied to the vanilla base values. */
  durabilityMultiplier: z.number().int().min(1).default(33),
  repairItem: z.string().default(""),
  textures: z.partialRecord(z.enum(ARMOR_PIECES), Texture).default({}),
  /** The 64x32 worn-armor layers. layer1 = helmet/chest/boots, layer2 = leggings. */
  layer1: Texture.nullable().default(null),
  layer2: Texture.nullable().default(null),
  autoRecipes: z.boolean().default(true),
});
export type ArmorSetSpec = z.infer<typeof ArmorSetSpec>;

export const RecipeSpec = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("shaped"),
    id: ID,
    /** 3 rows x 3 cols; empty string = empty slot. Values are item ids. */
    grid: z.array(z.array(z.string())).length(3),
    result: z.string().min(1),
    count: z.number().int().min(1).max(64).default(1),
  }),
  z.object({
    kind: z.literal("shapeless"),
    id: ID,
    ingredients: z.array(z.string().min(1)).min(1).max(9),
    result: z.string().min(1),
    count: z.number().int().min(1).max(64).default(1),
  }),
  z.object({
    kind: z.literal("smelting"),
    id: ID,
    ingredient: z.string().min(1),
    result: z.string().min(1),
    experience: z.number().min(0).default(0.7),
    cookingTime: z.number().int().min(1).default(200),
    /** Also generate a blast furnace variant at half the time. */
    blasting: z.boolean().default(false),
  }),
]);
export type RecipeSpec = z.infer<typeof RecipeSpec>;

export const ModSpec = z.object({
  modId: MOD_ID,
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  description: z.string().default(""),
  authors: z.string().default(""),
  license: z.string().default("All Rights Reserved"),
  /** Java package + maven group, e.g. "com.example.mymod" */
  groupId: z
    .string()
    .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "z.B. com.example.meinmod")
    .default("com.example.mymod"),
  minecraftVersion: z.literal("1.21.1").default("1.21.1"),

  creativeTab: z
    .object({
      enabled: z.boolean().default(true),
      name: z.string().default(""),
      /** id of the item/block used as the tab icon; empty = first item */
      icon: z.string().default(""),
    })
    .default({ enabled: true, name: "", icon: "" }),

  items: z.array(ItemSpec).default([]),
  blocks: z.array(BlockSpec).default([]),
  toolSets: z.array(ToolSetSpec).default([]),
  armorSets: z.array(ArmorSetSpec).default([]),
  recipes: z.array(RecipeSpec).default([]),
});
export type ModSpec = z.infer<typeof ModSpec>;

export function emptySpec(): ModSpec {
  return ModSpec.parse({
    modId: "mymod",
    name: "Mein Mod",
    groupId: "com.example.mymod",
  });
}
