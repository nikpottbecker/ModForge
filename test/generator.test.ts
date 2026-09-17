import { describe, expect, it } from "vitest";
import { demoSpec } from "../src/core/demo.js";
import { ModSpec, ORE_PRESETS, OreGenSpec, emptySpec } from "../src/core/spec.js";
import { generateProject, validateSpec, isBinary, type GenFile } from "../src/core/generator/index.js";
import { encodePng } from "../src/core/png.js";
import { placeholderTexture } from "../src/core/textures.js";

/** A one-block mod whose single block is an ore, for the worldgen and lint cases. */
function oreSpec(ore: Record<string, unknown>, block: Record<string, unknown> = {}): ModSpec {
  return ModSpec.parse({
    modId: "tm",
    name: "T",
    blocks: [
      {
        id: "erz",
        name: "Erz",
        ...block,
        oreGen: { veinSize: 8, veinsPerChunk: 10, ...ore },
      },
    ],
  });
}

function byPath(files: GenFile[]): Map<string, GenFile> {
  return new Map(files.map((f) => [f.path, f]));
}

function readJson(files: GenFile[], p: string): any {
  const f = byPath(files).get(p);
  if (!f || isBinary(f)) throw new Error(`nicht gefunden oder binär: ${p}`);
  return JSON.parse(f.text);
}

function readText(files: GenFile[], p: string): string {
  const f = byPath(files).get(p);
  if (!f || isBinary(f)) throw new Error(`nicht gefunden oder binär: ${p}`);
  return f.text;
}

describe("Spec", () => {
  it("lehnt ungültige Mod-IDs ab", () => {
    expect(() => ModSpec.parse({ modId: "Mein Mod", name: "x" })).toThrow();
    expect(() => ModSpec.parse({ modId: "9mod", name: "x" })).toThrow();
    expect(ModSpec.parse({ modId: "mein_mod", name: "x" }).modId).toBe("mein_mod");
  });

  it("füllt Defaults", () => {
    const s = emptySpec();
    expect(s.version).toBe("1.0.0");
    expect(s.minecraftVersion).toBe("1.21.1");
    expect(s.items).toEqual([]);
  });
});

describe("Generator", () => {
  const spec = demoSpec();
  const files = generateProject(spec);
  const paths = files.map((f) => f.path);

  it("erzeugt ein vollständiges Gradle-Projekt", () => {
    for (const p of ["build.gradle", "settings.gradle", "gradle.properties", "README.md"]) {
      expect(paths).toContain(p);
    }
  });

  it("legt die Hauptklasse im richtigen Package ab", () => {
    expect(paths).toContain("src/main/java/de/nik/rubinmod/Rubinmod.java");
    const main = readText(files, "src/main/java/de/nik/rubinmod/Rubinmod.java");
    expect(main).toContain('@Mod(Rubinmod.MODID)');
    expect(main).toContain('public static final String MODID = "rubinmod";');
  });

  it("nutzt die 1.21.1-Ordnernamen im Singular", () => {
    expect(paths).toContain("src/main/resources/data/rubinmod/recipe/rubinblock.json");
    expect(paths).toContain("src/main/resources/data/rubinmod/loot_table/blocks/rubinerz.json");
    expect(paths.some((p) => p.startsWith("src/main/resources/data/minecraft/tags/block/"))).toBe(true);
    expect(paths.some((p) => p.includes("/recipes/") || p.includes("/loot_tables/"))).toBe(false);
  });

  it("verdichtet ein 3x3-Rezept korrekt", () => {
    const r = readJson(files, "src/main/resources/data/rubinmod/recipe/rubinblock.json");
    expect(r.type).toBe("minecraft:crafting_shaped");
    expect(r.pattern).toEqual(["AAA", "AAA", "AAA"]);
    expect(r.key.A).toEqual({ item: "rubinmod:rubin" });
    expect(r.result).toEqual({ count: 1, id: "rubinmod:rubinblock" });
  });

  it("schneidet leere Zeilen und Spalten aus dem Raster", () => {
    const s = ModSpec.parse({
      modId: "tm",
      name: "T",
      items: [{ id: "a", name: "A" }],
      recipes: [
        {
          kind: "shaped",
          id: "r",
          grid: [
            ["", "", ""],
            ["", "a", "a"],
            ["", "", ""],
          ],
          result: "a",
        },
      ],
    });
    const r = readJson(generateProject(s), "src/main/resources/data/tm/recipe/r.json");
    expect(r.pattern).toEqual(["AA"]);
  });

  it("erzeugt Erz-Loot mit Fortune und Silk Touch", () => {
    const l = readJson(files, "src/main/resources/data/rubinmod/loot_table/blocks/rubinerz.json");
    const alt = l.pools[0].entries[0];
    expect(alt.type).toBe("minecraft:alternatives");
    expect(alt.children[0].name).toBe("rubinmod:rubinerz");
    expect(alt.children[1].name).toBe("rubinmod:rubin");
    const fns = alt.children[1].functions.map((f: any) => f.function);
    expect(fns).toContain("minecraft:apply_bonus");
    expect(fns).toContain("minecraft:set_count");
    expect(l.random_sequence).toBe("rubinmod:blocks/rubinerz");
  });

  it("erzeugt Selbst-Drop ohne Alternativen", () => {
    const l = readJson(files, "src/main/resources/data/rubinmod/loot_table/blocks/rubinblock.json");
    expect(l.pools[0].entries[0]).toEqual({ type: "minecraft:item", name: "rubinmod:rubinblock" });
  });

  it("verteilt Blöcke auf die richtigen Werkzeug-Tags", () => {
    const pick = readJson(files, "src/main/resources/data/minecraft/tags/block/mineable/pickaxe.json");
    expect(pick.values).toContain("rubinmod:rubinerz");
    expect(pick.values).toContain("rubinmod:leuchtrubin");
    const iron = readJson(files, "src/main/resources/data/minecraft/tags/block/needs_iron_tool.json");
    expect(iron.values).toEqual(["rubinmod:rubinerz", "rubinmod:rubinblock"]);
    // leuchtrubin braucht kein Werkzeug -> darf in keinem needs_*-Tag stehen
    expect(iron.values).not.toContain("rubinmod:leuchtrubin");
  });

  it("erzeugt Werkzeug- und Rüstungsrezepte", () => {
    const pick = readJson(files, "src/main/resources/data/rubinmod/recipe/rubin_pickaxe.json");
    expect(pick.pattern).toEqual(["MMM", " S ", " S "]);
    expect(pick.key.M).toEqual({ item: "rubinmod:rubin" });
    expect(pick.key.S).toEqual({ item: "minecraft:stick" });
    const boots = readJson(files, "src/main/resources/data/rubinmod/recipe/rubin_boots.json");
    expect(boots.pattern).toEqual(["M M", "M M"]);
  });

  it("erzeugt Schmelz- und Blast-Rezept", () => {
    const smelt = readJson(files, "src/main/resources/data/rubinmod/recipe/rubin_aus_erz.json");
    expect(smelt.type).toBe("minecraft:smelting");
    expect(smelt.cookingtime).toBe(200);
    const blast = readJson(files, "src/main/resources/data/rubinmod/recipe/rubin_aus_erz_blasting.json");
    expect(blast.type).toBe("minecraft:blasting");
    expect(blast.cookingtime).toBe(100);
  });

  it("schreibt Sprachdateien mit allen Schlüsseln", () => {
    const lang = readJson(files, "src/main/resources/assets/rubinmod/lang/en_us.json");
    expect(lang["item.rubinmod.rubin"]).toBe("Rubin");
    expect(lang["block.rubinmod.rubinerz"]).toBe("Rubinerz");
    expect(lang["item.rubinmod.rubin_pickaxe"]).toBe("Rubin Pickaxe");
    expect(lang["item.rubinmod.rubin_chestplate"]).toBe("Rubin Chestplate");
    expect(lang["itemGroup.rubinmod"]).toBe("Rubin Mod");
    expect(lang["tooltip.rubinmod.rubin.0"]).toBe("Ein glühend roter Edelstein.");
  });

  it("nutzt handheld-Modelle für Werkzeuge und generated für Items", () => {
    expect(readJson(files, "src/main/resources/assets/rubinmod/models/item/rubin_axe.json").parent).toBe(
      "minecraft:item/handheld",
    );
    expect(readJson(files, "src/main/resources/assets/rubinmod/models/item/rubin.json").parent).toBe(
      "minecraft:item/generated",
    );
    expect(readJson(files, "src/main/resources/assets/rubinmod/models/item/rubinerz.json").parent).toBe(
      "rubinmod:block/rubinerz",
    );
  });

  it("erzeugt für jedes Item und jeden Block eine Textur", () => {
    const textures = paths.filter((p) => p.endsWith(".png"));
    // 3 Blöcke + 4 Items + 5 Werkzeuge + 4 Rüstungsteile + 2 Armor-Layer
    expect(textures.length).toBe(3 + 4 + 5 + 4 + 2);
    expect(textures.every((p) => p.includes("/textures/"))).toBe(true);
  });

  it("baut Food-, Glint- und Lore-Properties in den Java-Code", () => {
    const items = readText(files, "src/main/java/de/nik/rubinmod/registry/ModItems.java");
    expect(items).toContain(".nutrition(6)");
    expect(items).toContain(".alwaysEdible()");
    expect(items).toContain("ENCHANTMENT_GLINT_OVERRIDE");
    expect(items).toContain("new ItemLore(List.of(Component.translatable");
    expect(items).toContain("registerSimpleBlockItem(\"rubinerz\", ModBlocks.RUBINERZ)");
  });

  it("erzeugt eine Brennstoff-Klasse nur wenn nötig", () => {
    expect(paths).toContain("src/main/java/de/nik/rubinmod/ModFuels.java");
    expect(readText(files, "src/main/java/de/nik/rubinmod/ModFuels.java")).toContain("event.setBurnTime(2400)");

    const noFuel = generateProject(ModSpec.parse({ modId: "tm", name: "T", items: [{ id: "a", name: "A" }] }));
    expect(noFuel.map((f) => f.path)).not.toContain("src/main/java/com/example/mymod/ModFuels.java");
  });

  it("nutzt DropExperienceBlock nur für Erze mit XP", () => {
    const blocks = readText(files, "src/main/java/de/nik/rubinmod/registry/ModBlocks.java");
    expect(blocks).toContain("new DropExperienceBlock(UniformInt.of(3, 7), props)");
    expect(blocks).toContain('registerSimpleBlock("rubinblock"');
    expect(blocks).toContain(".lightLevel(state -> 15)");
  });

  it("listet alle Inhalte im Kreativ-Tab", () => {
    const tab = readText(files, "src/main/java/de/nik/rubinmod/registry/ModCreativeTabs.java");
    for (const c of ["RUBINERZ", "RUBIN", "RUBIN_PICKAXE", "RUBIN_BOOTS", "GLUEHFRUCHT"]) {
      expect(tab).toContain(`output.accept(ModItems.${c}.get())`);
    }
    expect(tab).toContain("ModItems.RUBIN.get().getDefaultInstance()");
  });

  it("hält Mod-Metadaten einzeilig, damit Groovys expand() nicht bricht", () => {
    const props = readText(
      generateProject(ModSpec.parse({ modId: "tm", name: "T", description: "Zeile 1\nZeile 2" })),
      "gradle.properties",
    );
    const desc = props.split("\n").find((l) => l.startsWith("mod_description="));
    expect(desc).toBe("mod_description=Zeile 1 Zeile 2");
  });

  it("escapt Umlaute in gradle.properties, das Gradle als ISO-8859-1 liest", () => {
    const props = readText(files, "gradle.properties");
    expect(props).toContain("mod_description=F\\u00fcgt Rubine, Werkzeuge und R\\u00fcstung hinzu.");
    expect(props).not.toMatch(/[^\x00-\x7f]/);
  });

  it("filtert die Mod-Metadaten als UTF-8", () => {
    expect(readText(files, "build.gradle")).toContain("filteringCharset = 'UTF-8'");
  });
});

describe("Validierung", () => {
  it("meldet unbekannte Referenzen", () => {
    const s = ModSpec.parse({
      modId: "tm",
      name: "T",
      items: [{ id: "a", name: "A" }],
      recipes: [{ kind: "shapeless", id: "r", ingredients: ["gibtsnicht"], result: "a" }],
    });
    const issues = validateSpec(s);
    expect(issues.some((i) => i.level === "error" && i.message.includes("gibtsnicht"))).toBe(true);
  });

  it("akzeptiert Vanilla-Referenzen mit Namespace", () => {
    const s = ModSpec.parse({
      modId: "tm",
      name: "T",
      items: [{ id: "a", name: "A" }],
      recipes: [{ kind: "shapeless", id: "r", ingredients: ["minecraft:diamond"], result: "a" }],
    });
    expect(validateSpec(s).filter((i) => i.level === "error")).toEqual([]);
  });

  it("findet doppelte IDs", () => {
    const s = ModSpec.parse({
      modId: "tm",
      name: "T",
      items: [{ id: "a", name: "A" }],
      blocks: [{ id: "a", name: "A" }],
    });
    expect(validateSpec(s).some((i) => i.message.includes("Doppelte ID"))).toBe(true);
  });

  it("hat für das Beispiel keine Fehler", () => {
    expect(validateSpec(demoSpec()).filter((i) => i.level === "error")).toEqual([]);
  });

  it("meldet Erzhöhen außerhalb der Dimension", () => {
    const s = oreSpec({ dimension: "nether", minHeight: 0, maxHeight: 200 });
    const issue = validateSpec(s).find((i) => i.message.includes("außerhalb"));
    expect(issue?.level).toBe("error");
    expect(issue?.hint).toContain("Bedrock-Decke");
  });

  it("akzeptiert dieselben Höhen in der Oberwelt", () => {
    const s = oreSpec({ dimension: "overworld", minHeight: 0, maxHeight: 200 });
    expect(validateSpec(s).filter((i) => i.level === "error")).toEqual([]);
  });

  it("warnt, wenn ein Erz nichts droppt", () => {
    const s = oreSpec({}, { drop: { kind: "nothing" } });
    expect(validateSpec(s).some((i) => i.message.includes("droppt aber nichts"))).toBe(true);
  });

  it("meldet einen Block, der ein Werkzeug braucht, aber keinem zugeordnet ist", () => {
    const s = ModSpec.parse({
      modId: "tm",
      name: "T",
      blocks: [{ id: "b", name: "B", requiresTool: true, tool: "none" }],
    });
    expect(validateSpec(s).some((i) => i.level === "error" && i.message.includes("Werkzeug"))).toBe(
      true,
    );
  });
});

describe("Erz-Weltgenerierung", () => {
  const files = generateProject(demoSpec());

  it("schreibt Configured Feature, Placed Feature und Biome-Modifier", () => {
    const cf = readJson(
      files,
      "src/main/resources/data/rubinmod/worldgen/configured_feature/rubinerz.json",
    );
    expect(cf.type).toBe("minecraft:ore");
    expect(cf.config.size).toBe(6);
    expect(cf.config.discard_chance_on_air_exposure).toBe(0.3);
    // Overworld veins replace stone and deepslate, so the ore appears at every depth.
    expect(cf.config.targets.map((t: any) => t.target.tag)).toEqual([
      "minecraft:stone_ore_replaceables",
      "minecraft:deepslate_ore_replaceables",
    ]);
    expect(cf.config.targets[0].target.predicate_type).toBe("minecraft:tag_match");
    expect(cf.config.targets[0].state).toEqual({ Name: "rubinmod:rubinerz" });

    const pf = readJson(
      files,
      "src/main/resources/data/rubinmod/worldgen/placed_feature/rubinerz.json",
    );
    expect(pf.feature).toBe("rubinmod:rubinerz");
    expect(pf.placement.map((p: any) => p.type)).toEqual([
      "minecraft:count",
      "minecraft:in_square",
      "minecraft:height_range",
      "minecraft:biome",
    ]);
    expect(pf.placement[0].count).toBe(5);
    expect(pf.placement[2].height).toEqual({
      type: "minecraft:trapezoid",
      min_inclusive: { absolute: -64 },
      max_inclusive: { absolute: 24 },
    });

    const bm = readJson(
      files,
      "src/main/resources/data/rubinmod/neoforge/biome_modifier/rubinerz.json",
    );
    expect(bm).toEqual({
      type: "neoforge:add_features",
      biomes: "#minecraft:is_overworld",
      features: "rubinmod:rubinerz",
      step: "underground_ores",
    });
  });

  it("erzeugt für Blöcke ohne Weltgenerierung keine Dateien", () => {
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain(
      "src/main/resources/data/rubinmod/worldgen/configured_feature/rubinblock.json",
    );
  });

  // There is no minecraft:netherrack or minecraft:end_stone block tag. Matching those by
  // tag produces a vein that never generates and never reports an error, so both
  // dimensions have to match the block directly, exactly as vanilla's nether ores do.
  it("trifft Netherrack und Endstein als Block, nicht als Tag", () => {
    const nether = generateProject(oreSpec({ dimension: "nether", minHeight: 10, maxHeight: 100 }));
    const cf = readJson(nether, "src/main/resources/data/tm/worldgen/configured_feature/erz.json");
    expect(cf.config.targets).toEqual([
      {
        target: { predicate_type: "minecraft:block_match", block: "minecraft:netherrack" },
        state: { Name: "tm:erz" },
      },
    ]);
    expect(
      readJson(nether, "src/main/resources/data/tm/neoforge/biome_modifier/erz.json").biomes,
    ).toBe("#minecraft:is_nether");

    const end = generateProject(oreSpec({ dimension: "end", minHeight: 10, maxHeight: 100 }));
    const endCf = readJson(end, "src/main/resources/data/tm/worldgen/configured_feature/erz.json");
    expect(endCf.config.targets[0].target).toEqual({
      predicate_type: "minecraft:block_match",
      block: "minecraft:end_stone",
    });
    expect(readJson(end, "src/main/resources/data/tm/neoforge/biome_modifier/erz.json").biomes).toBe(
      "#minecraft:is_end",
    );
  });

  it("nimmt die Vanilla-Presets unverändert an", () => {
    for (const preset of Object.values(ORE_PRESETS)) {
      const { label: _label, ...values } = preset;
      expect(() => OreGenSpec.parse(values)).not.toThrow();
    }
  });
});

describe("PNG", () => {
  it("schreibt einen gültigen PNG-Header und die richtigen Maße", () => {
    const rgba = new Uint8Array(16 * 16 * 4).fill(200);
    const png = encodePng(16, 16, rgba);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect([...png.subarray(16, 24)]).toEqual([0, 0, 0, 16, 0, 0, 0, 16]);
    expect(new TextDecoder().decode(png.subarray(12, 16))).toBe("IHDR");
  });

  it("erzeugt stabile, unterschiedliche Platzhalter", () => {
    expect(placeholderTexture("rubin", "item")).toBe(placeholderTexture("rubin", "item"));
    expect(placeholderTexture("rubin", "item")).not.toBe(placeholderTexture("saphir", "item"));
    expect(placeholderTexture("rubin", "item")).not.toBe(placeholderTexture("rubin", "block"));
  });
});
