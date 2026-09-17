import type { ArmorSetSpec, ModSpec, ToolSetSpec } from "../spec.js";
import { constName, javaString, pascal, resolveRef } from "../naming.js";
import { text, type GenFile } from "./types.js";

export function mainClassName(spec: ModSpec): string {
  return pascal(spec.modId);
}

function pkgPath(spec: ModSpec): string {
  return `src/main/java/${spec.groupId.replace(/\./g, "/")}`;
}

/** Vanilla attack damage / attack speed pairs, mirroring the diamond tier. */
const TOOL_ATTRS: Record<string, { cls: string; dmg: string; speed: string; attrOwner: string }> = {
  pickaxe: { cls: "PickaxeItem", dmg: "1.0F", speed: "-2.8F", attrOwner: "DiggerItem" },
  axe: { cls: "AxeItem", dmg: "5.0F", speed: "-3.0F", attrOwner: "DiggerItem" },
  shovel: { cls: "ShovelItem", dmg: "1.5F", speed: "-3.0F", attrOwner: "DiggerItem" },
  hoe: { cls: "HoeItem", dmg: "-3.0F", speed: "0.0F", attrOwner: "DiggerItem" },
  sword: { cls: "SwordItem", dmg: "3.0F", speed: "-2.4F", attrOwner: "SwordItem" },
};

const ARMOR_TYPE: Record<string, string> = {
  helmet: "HELMET",
  chestplate: "CHESTPLATE",
  leggings: "LEGGINGS",
  boots: "BOOTS",
};

export function toolItemId(set: ToolSetSpec, kind: string): string {
  return `${set.id}_${kind}`;
}

export function armorItemId(set: ArmorSetSpec, piece: string): string {
  return `${set.id}_${piece}`;
}

/** Every item id that ends up in the item registry, in creative-tab order. */
export function allItemIds(spec: ModSpec): string[] {
  return [
    ...spec.blocks.map((b) => b.id),
    ...spec.items.map((i) => i.id),
    ...spec.toolSets.flatMap((t) => t.kinds.map((k) => toolItemId(t, k))),
    ...spec.armorSets.flatMap((a) => a.pieces.map((p) => armorItemId(a, p))),
  ];
}

/** `Ingredient` expression resolving a "ns:path" reference at runtime. */
function ingredientExpr(ref: string, modId: string): string {
  const full = resolveRef(ref, modId);
  if (!full) return "Ingredient.of()";
  return `Ingredient.of(BuiltInRegistries.ITEM.get(ResourceLocation.parse(${javaString(full)})))`;
}

export function javaFiles(spec: ModSpec): GenFile[] {
  const cls = mainClassName(spec);
  const base = pkgPath(spec);
  const files: GenFile[] = [
    text(`${base}/${cls}.java`, mainClass(spec, cls)),
    text(`${base}/registry/ModBlocks.java`, modBlocks(spec, cls)),
    text(`${base}/registry/ModItems.java`, modItems(spec, cls)),
  ];
  if (spec.creativeTab.enabled) {
    files.push(text(`${base}/registry/ModCreativeTabs.java`, modCreativeTabs(spec, cls)));
  }
  if (spec.toolSets.length) {
    files.push(text(`${base}/registry/ModToolTiers.java`, modToolTiers(spec)));
  }
  if (spec.armorSets.length) {
    files.push(text(`${base}/registry/ModArmorMaterials.java`, modArmorMaterials(spec, cls)));
  }
  if (spec.items.some((i) => i.burnTime > 0)) {
    files.push(text(`${base}/ModFuels.java`, modFuels(spec, cls)));
  }
  return files;
}

function mainClass(spec: ModSpec, cls: string): string {
  const registers = [
    "ModBlocks.register(modEventBus);",
    "ModItems.register(modEventBus);",
    spec.armorSets.length ? "ModArmorMaterials.register(modEventBus);" : "",
    spec.creativeTab.enabled ? "ModCreativeTabs.register(modEventBus);" : "",
  ].filter(Boolean);

  return `package ${spec.groupId};

import com.mojang.logging.LogUtils;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import org.slf4j.Logger;

import ${spec.groupId}.registry.*;

@Mod(${cls}.MODID)
public class ${cls} {
    public static final String MODID = ${javaString(spec.modId)};
    public static final Logger LOGGER = LogUtils.getLogger();

    public ${cls}(IEventBus modEventBus, ModContainer modContainer) {
${registers.map((r) => `        ${r}`).join("\n")}
        LOGGER.info("[{}] geladen", MODID);
    }
}
`;
}

function modBlocks(spec: ModSpec, cls: string): string {
  const entries = spec.blocks.map((b) => {
    const props = [
      `.mapColor(MapColor.${b.mapColor})`,
      `.strength(${b.hardness.toFixed(1)}F, ${b.resistance.toFixed(1)}F)`,
      b.requiresTool ? ".requiresCorrectToolForDrops()" : "",
      `.sound(SoundType.${b.sound})`,
      b.lightLevel > 0 ? `.lightLevel(state -> ${b.lightLevel})` : "",
    ].filter(Boolean);
    const propsExpr = `BlockBehaviour.Properties.of()\n            ${props.join("\n            ")}`;
    const dropsXp = b.xpMax > 0;

    if (dropsXp) {
      return `    public static final DeferredBlock<DropExperienceBlock> ${constName(b.id)} = BLOCKS.registerBlock(${javaString(b.id)},
            props -> new DropExperienceBlock(UniformInt.of(${b.xpMin}, ${b.xpMax}), props),
            ${propsExpr});`;
    }
    return `    public static final DeferredBlock<Block> ${constName(b.id)} = BLOCKS.registerSimpleBlock(${javaString(b.id)},
            ${propsExpr});`;
  });

  return `package ${spec.groupId}.registry;

import ${spec.groupId}.${cls};
import net.minecraft.util.valueproviders.UniformInt;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.DropExperienceBlock;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModBlocks {
    public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(${cls}.MODID);

${entries.join("\n\n")}${entries.length ? "\n" : ""}
    public static void register(IEventBus bus) {
        BLOCKS.register(bus);
    }

    private ModBlocks() {}
}
`;
}

function itemPropsExpr(spec: ModSpec, i: ModSpec["items"][number]): string {
  const parts: string[] = [];
  if (i.maxStackSize !== 64) parts.push(`.stacksTo(${i.maxStackSize})`);
  if (i.rarity !== "COMMON") parts.push(`.rarity(Rarity.${i.rarity})`);
  if (i.fireResistant) parts.push(".fireResistant()");
  if (i.food) {
    const f = [
      `.nutrition(${i.food.nutrition})`,
      `.saturationModifier(${i.food.saturation.toFixed(2)}F)`,
      i.food.alwaysEdible ? ".alwaysEdible()" : "",
      i.food.fastEating ? ".fast()" : "",
    ].filter(Boolean);
    parts.push(`.food(new FoodProperties.Builder()${f.join("")}.build())`);
  }
  if (i.glint) parts.push(".component(DataComponents.ENCHANTMENT_GLINT_OVERRIDE, true)");
  if (i.tooltip.length) {
    const lines = i.tooltip
      .map((_, n) => `Component.translatable("tooltip.${spec.modId}.${i.id}.${n}")`)
      .join(", ");
    parts.push(`.component(DataComponents.LORE, new ItemLore(List.of(${lines})))`);
  }
  return parts.length ? `new Item.Properties()\n                    ${parts.join("\n                    ")}` : "new Item.Properties()";
}

function modItems(spec: ModSpec, cls: string): string {
  const blockItems = spec.blocks.map(
    (b) =>
      `    public static final DeferredItem<BlockItem> ${constName(b.id)} = ITEMS.registerSimpleBlockItem(${javaString(b.id)}, ModBlocks.${constName(b.id)});`,
  );

  const plainItems = spec.items.map(
    (i) =>
      `    public static final DeferredItem<Item> ${constName(i.id)} = ITEMS.registerItem(${javaString(i.id)},
            props -> new Item(props),
            ${itemPropsExpr(spec, i)});`,
  );

  const tools = spec.toolSets.flatMap((set) =>
    set.kinds.map((kind) => {
      const a = TOOL_ATTRS[kind];
      const id = toolItemId(set, kind);
      const tier = `ModToolTiers.${constName(set.id)}`;
      return `    public static final DeferredItem<${a.cls}> ${constName(id)} = ITEMS.registerItem(${javaString(id)},
            props -> new ${a.cls}(${tier}, props),
            new Item.Properties().attributes(${a.attrOwner}.createAttributes(${tier}, ${a.dmg}, ${a.speed})));`;
    }),
  );

  const armor = spec.armorSets.flatMap((set) =>
    set.pieces.map((piece) => {
      const id = armorItemId(set, piece);
      const type = ARMOR_TYPE[piece];
      return `    public static final DeferredItem<ArmorItem> ${constName(id)} = ITEMS.registerItem(${javaString(id)},
            props -> new ArmorItem(ModArmorMaterials.${constName(set.id)}, ArmorItem.Type.${type}, props),
            new Item.Properties().durability(ArmorItem.Type.${type}.getDurability(${set.durabilityMultiplier})));`;
    }),
  );

  const sections = [
    blockItems.length ? `    // --- Block-Items ---\n${blockItems.join("\n")}` : "",
    plainItems.length ? `    // --- Items ---\n${plainItems.join("\n\n")}` : "",
    tools.length ? `    // --- Werkzeuge ---\n${tools.join("\n\n")}` : "",
    armor.length ? `    // --- Rüstung ---\n${armor.join("\n\n")}` : "",
  ].filter(Boolean);

  return `package ${spec.groupId}.registry;

import ${spec.groupId}.${cls};
import java.util.List;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.AxeItem;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.DiggerItem;
import net.minecraft.world.item.HoeItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.PickaxeItem;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.ShovelItem;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.component.ItemLore;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(${cls}.MODID);

${sections.join("\n\n")}${sections.length ? "\n" : ""}
    public static void register(IEventBus bus) {
        ITEMS.register(bus);
    }

    private ModItems() {}
}
`;
}

function modCreativeTabs(spec: ModSpec, cls: string): string {
  const ids = allItemIds(spec);
  const iconId = spec.creativeTab.icon && ids.includes(spec.creativeTab.icon) ? spec.creativeTab.icon : ids[0];
  const iconExpr = iconId
    ? `ModItems.${constName(iconId)}.get().getDefaultInstance()`
    : "net.minecraft.world.item.Items.CRAFTING_TABLE.getDefaultInstance()";
  const accepts = ids.map((id) => `                output.accept(ModItems.${constName(id)}.get());`);

  return `package ${spec.groupId}.registry;

import ${spec.groupId}.${cls};
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModCreativeTabs {
    public static final DeferredRegister<CreativeModeTab> TABS =
            DeferredRegister.create(Registries.CREATIVE_MODE_TAB, ${cls}.MODID);

    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> MAIN = TABS.register("main",
            () -> CreativeModeTab.builder()
                    .title(Component.translatable("itemGroup.${spec.modId}"))
                    .icon(() -> ${iconExpr})
                    .displayItems((parameters, output) -> {
${accepts.join("\n")}
                    })
                    .build());

    public static void register(IEventBus bus) {
        TABS.register(bus);
    }

    private ModCreativeTabs() {}
}
`;
}

const TIER_TAGS: Record<string, string> = {
  WOOD: "INCORRECT_FOR_WOODEN_TOOL",
  STONE: "INCORRECT_FOR_STONE_TOOL",
  IRON: "INCORRECT_FOR_IRON_TOOL",
  GOLD: "INCORRECT_FOR_GOLD_TOOL",
  DIAMOND: "INCORRECT_FOR_DIAMOND_TOOL",
  NETHERITE: "INCORRECT_FOR_NETHERITE_TOOL",
};

function modToolTiers(spec: ModSpec): string {
  const entries = spec.toolSets.map(
    (s) => `    public static final Tier ${constName(s.id)} = new SimpleTier(
            BlockTags.${TIER_TAGS[s.tier]},
            ${s.durability},
            ${s.speed.toFixed(1)}F,
            ${s.attackDamage.toFixed(1)}F,
            ${s.enchantmentValue},
            () -> ${ingredientExpr(s.repairItem, spec.modId)});`,
  );

  return `package ${spec.groupId}.registry;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.crafting.Ingredient;
import net.neoforged.neoforge.common.SimpleTier;

public final class ModToolTiers {
${entries.join("\n\n")}

    private ModToolTiers() {}
}
`;
}

function modArmorMaterials(spec: ModSpec, cls: string): string {
  const entries = spec.armorSets.map((s) => {
    const defense = Object.entries(ARMOR_TYPE)
      .map(([piece, type]) => `                            ArmorItem.Type.${type}, ${s.defense[piece as keyof typeof s.defense]}`)
      .join(",\n");
    return `    public static final DeferredHolder<ArmorMaterial, ArmorMaterial> ${constName(s.id)} =
            ARMOR_MATERIALS.register(${javaString(s.id)}, () -> new ArmorMaterial(
                    Map.of(
${defense}),
                    ${s.enchantmentValue},
                    SoundEvents.ARMOR_EQUIP_DIAMOND,
                    () -> ${ingredientExpr(s.repairItem, spec.modId)},
                    List.of(new ArmorMaterial.Layer(
                            ResourceLocation.fromNamespaceAndPath(${cls}.MODID, ${javaString(s.id)}))),
                    ${s.toughness.toFixed(1)}F,
                    ${s.knockbackResistance.toFixed(1)}F));`;
  });

  return `package ${spec.groupId}.registry;

import ${spec.groupId}.${cls};
import java.util.List;
import java.util.Map;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.crafting.Ingredient;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModArmorMaterials {
    public static final DeferredRegister<ArmorMaterial> ARMOR_MATERIALS =
            DeferredRegister.create(Registries.ARMOR_MATERIAL, ${cls}.MODID);

${entries.join("\n\n")}

    public static void register(IEventBus bus) {
        ARMOR_MATERIALS.register(bus);
    }

    private ModArmorMaterials() {}
}
`;
}

function modFuels(spec: ModSpec, cls: string): string {
  const fuels = spec.items.filter((i) => i.burnTime > 0);
  const branches = fuels.map(
    (i) => `        if (stack.is(ModItems.${constName(i.id)}.get())) {
            event.setBurnTime(${i.burnTime});
        }`,
  );

  return `package ${spec.groupId};

import ${spec.groupId}.registry.ModItems;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.furnace.FurnaceFuelBurnTimeEvent;

@EventBusSubscriber(modid = ${cls}.MODID)
public final class ModFuels {
    @SubscribeEvent
    public static void onFuelBurnTime(FurnaceFuelBurnTimeEvent event) {
        ItemStack stack = event.getItemStack();
${branches.join("\n")}
    }

    private ModFuels() {}
}
`;
}
