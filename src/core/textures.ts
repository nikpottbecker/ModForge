import { encodePngDataUrl } from "./png.js";

export type SpriteKind = "item" | "block" | "pickaxe" | "axe" | "shovel" | "hoe" | "sword" | "helmet" | "chestplate" | "leggings" | "boots";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

class Canvas16 {
  readonly data = new Uint8Array(16 * 16 * 4);
  set(x: number, y: number, rgb: [number, number, number], a = 255) {
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    const i = (y * 16 + x) * 4;
    this.data[i] = rgb[0];
    this.data[i + 1] = rgb[1];
    this.data[i + 2] = rgb[2];
    this.data[i + 3] = a;
  }
  rect(x0: number, y0: number, w: number, h: number, rgb: [number, number, number]) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, rgb);
  }
  toDataUrl(): string {
    return encodePngDataUrl(16, 16, this.data);
  }
}

/**
 * Deterministic placeholder sprite so every generated mod has valid, distinguishable
 * textures even before the user draws anything.
 */
export function placeholderTexture(id: string, kind: SpriteKind): string {
  const h = hash(id);
  const hue = h % 360;
  const c = new Canvas16();
  const base = hslToRgb(hue, 0.55, 0.5);
  const dark = hslToRgb(hue, 0.55, 0.32);
  const light = hslToRgb(hue, 0.5, 0.68);
  const wood: [number, number, number] = [110, 78, 45];
  const woodDark: [number, number, number] = [82, 57, 32];

  switch (kind) {
    case "block": {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const n = hash(`${id}:${x}:${y}`) % 3;
          c.set(x, y, n === 0 ? dark : n === 1 ? base : light);
        }
      }
      for (let i = 0; i < 16; i++) {
        c.set(i, 0, dark);
        c.set(0, i, dark);
        c.set(i, 15, dark);
        c.set(15, i, dark);
      }
      break;
    }
    case "item": {
      // Rounded gem shape.
      for (let y = 2; y < 14; y++) {
        const inset = Math.round(3 * Math.abs(y - 7.5) * 0.35);
        for (let x = 3 + inset; x < 13 - inset; x++) {
          const edge = x === 3 + inset || x === 12 - inset || y === 2 || y === 13;
          c.set(x, y, edge ? dark : base);
        }
      }
      c.rect(5, 4, 2, 2, light);
      break;
    }
    case "sword": {
      for (let i = 0; i < 9; i++) c.set(3 + i, 12 - i, base), c.set(4 + i, 12 - i, light);
      c.rect(2, 12, 4, 1, woodDark);
      c.rect(2, 13, 3, 2, wood);
      break;
    }
    case "pickaxe": {
      for (let i = 0; i < 7; i++) c.set(4 + i, 11 - i, wood), c.set(5 + i, 11 - i, woodDark);
      c.rect(5, 2, 8, 1, base);
      c.set(4, 3, base);
      c.set(13, 3, base);
      c.set(3, 4, dark);
      c.set(14, 4, dark);
      c.rect(7, 3, 4, 2, light);
      break;
    }
    case "axe": {
      for (let i = 0; i < 8; i++) c.set(4 + i, 12 - i, wood), c.set(5 + i, 12 - i, woodDark);
      c.rect(8, 2, 5, 5, base);
      c.rect(7, 3, 1, 3, dark);
      c.rect(9, 3, 2, 2, light);
      break;
    }
    case "shovel": {
      for (let i = 0; i < 9; i++) c.set(4 + i, 13 - i, wood), c.set(5 + i, 13 - i, woodDark);
      c.rect(10, 2, 4, 4, base);
      c.rect(11, 3, 2, 2, light);
      break;
    }
    case "hoe": {
      for (let i = 0; i < 8; i++) c.set(4 + i, 12 - i, wood), c.set(5 + i, 12 - i, woodDark);
      c.rect(8, 2, 5, 2, base);
      c.rect(8, 4, 2, 1, dark);
      break;
    }
    case "helmet": {
      c.rect(3, 4, 10, 3, base);
      c.rect(3, 7, 3, 4, base);
      c.rect(10, 7, 3, 4, base);
      c.rect(4, 5, 8, 1, light);
      break;
    }
    case "chestplate": {
      c.rect(3, 3, 10, 9, base);
      c.rect(2, 4, 1, 4, dark);
      c.rect(13, 4, 1, 4, dark);
      c.rect(6, 3, 4, 2, dark);
      c.rect(4, 5, 2, 2, light);
      break;
    }
    case "leggings": {
      c.rect(3, 3, 10, 4, base);
      c.rect(3, 7, 4, 7, base);
      c.rect(9, 7, 4, 7, base);
      c.rect(4, 4, 8, 1, light);
      break;
    }
    case "boots": {
      c.rect(3, 6, 4, 8, base);
      c.rect(9, 6, 4, 8, base);
      c.rect(3, 13, 4, 1, dark);
      c.rect(9, 13, 4, 1, dark);
      break;
    }
  }
  return c.toDataUrl();
}

/** 64x32 armor layer sheet — flat tint, enough to not look broken in game. */
export function placeholderArmorLayer(id: string, layer: 1 | 2): string {
  const hue = hash(id) % 360;
  const [r, g, b] = hslToRgb(hue, 0.55, 0.5);
  const data = new Uint8Array(64 * 32 * 4);
  // Only the regions the vanilla armor UV layout actually samples get filled;
  // the rest stays transparent so it does not bleed onto the player model.
  const regions =
    layer === 1
      ? [
          [0, 0, 64, 16],
          [16, 16, 24, 16],
          [40, 16, 16, 16],
          [0, 16, 16, 16],
        ]
      : [
          [0, 0, 64, 16],
          [0, 16, 64, 16],
        ];
  for (const [x0, y0, w, h] of regions) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const i = (y * 64 + x) * 4;
        const shade = (x + y) % 5 === 0 ? 0.8 : 1;
        data[i] = Math.round(r * shade);
        data[i + 1] = Math.round(g * shade);
        data[i + 2] = Math.round(b * shade);
        data[i + 3] = 255;
      }
    }
  }
  return "data:image/png;base64," + encodePngDataUrl(64, 32, data).split(",")[1];
}
