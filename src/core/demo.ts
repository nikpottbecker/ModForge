import { ModSpec } from "./spec.js";

/** A fully populated example that exercises every generator feature. */
export function demoSpec(): ModSpec {
  return ModSpec.parse({
    modId: "rubinmod",
    name: "Rubin Mod",
    version: "1.0.0",
    description: "Fügt Rubine, Werkzeuge und Rüstung hinzu.",
    authors: "Nik",
    license: "MIT",
    groupId: "de.nik.rubinmod",
    creativeTab: { enabled: true, name: "Rubin Mod", icon: "rubin" },

    items: [
      { id: "rubin", name: "Rubin", rarity: "RARE", tooltip: ["Ein glühend roter Edelstein."] },
      { id: "rubin_splitter", name: "Rubinsplitter", maxStackSize: 64 },
      {
        id: "gluehfrucht",
        name: "Glühfrucht",
        maxStackSize: 16,
        food: { nutrition: 6, saturation: 0.8, alwaysEdible: true, fastEating: false },
        glint: true,
      },
      { id: "rubinkohle", name: "Rubinkohle", burnTime: 2400 },
    ],

    blocks: [
      {
        id: "rubinerz",
        name: "Rubinerz",
        hardness: 3,
        resistance: 3,
        tier: "IRON",
        mapColor: "COLOR_RED",
        xpMin: 3,
        xpMax: 7,
        drop: { kind: "item", item: "rubin", min: 1, max: 2, fortune: true, silkTouch: true },
        oreGen: {
          dimension: "overworld",
          veinSize: 6,
          veinsPerChunk: 5,
          minHeight: -64,
          maxHeight: 24,
          shape: "trapezoid",
          discardOnAirExposure: 0.3,
        },
      },
      {
        id: "rubinblock",
        name: "Rubinblock",
        hardness: 5,
        resistance: 6,
        tier: "IRON",
        sound: "METAL",
        mapColor: "COLOR_RED",
        drop: { kind: "self" },
      },
      {
        id: "leuchtrubin",
        name: "Leuchtrubin",
        hardness: 0.3,
        resistance: 0.3,
        requiresTool: false,
        tool: "pickaxe",
        lightLevel: 15,
        sound: "GLASS",
        mapColor: "COLOR_PINK",
        drop: { kind: "self" },
      },
    ],

    toolSets: [
      {
        id: "rubin",
        name: "Rubin",
        kinds: ["pickaxe", "axe", "shovel", "hoe", "sword"],
        durability: 1800,
        speed: 9,
        attackDamage: 4,
        enchantmentValue: 15,
        tier: "DIAMOND",
        repairItem: "rubin",
      },
    ],

    armorSets: [
      {
        id: "rubin",
        name: "Rubin",
        pieces: ["helmet", "chestplate", "leggings", "boots"],
        defense: { helmet: 3, chestplate: 8, leggings: 6, boots: 3 },
        toughness: 2,
        knockbackResistance: 0,
        enchantmentValue: 15,
        durabilityMultiplier: 37,
        repairItem: "rubin",
      },
    ],

    recipes: [
      {
        kind: "shaped",
        id: "rubinblock",
        grid: [
          ["rubin", "rubin", "rubin"],
          ["rubin", "rubin", "rubin"],
          ["rubin", "rubin", "rubin"],
        ],
        result: "rubinblock",
        count: 1,
      },
      {
        kind: "shapeless",
        id: "rubin_aus_block",
        ingredients: ["rubinblock"],
        result: "rubin",
        count: 9,
      },
      {
        kind: "shapeless",
        id: "rubin_aus_splittern",
        ingredients: [
          "rubin_splitter",
          "rubin_splitter",
          "rubin_splitter",
          "rubin_splitter",
          "rubin_splitter",
          "rubin_splitter",
          "rubin_splitter",
          "rubin_splitter",
          "rubin_splitter",
        ],
        result: "rubin",
        count: 1,
      },
      {
        kind: "smelting",
        id: "rubin_aus_erz",
        ingredient: "rubinerz",
        result: "rubin",
        experience: 1,
        cookingTime: 200,
        blasting: true,
      },
    ],
  });
}
