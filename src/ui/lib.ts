import type { ModSpec } from "../core/spec.js";

export const patchAt = <T,>(arr: T[], i: number, patch: Partial<T>): T[] =>
  arr.map((v, j) => (j === i ? { ...v, ...patch } : v));

export const removeAt = <T,>(arr: T[], i: number): T[] => arr.filter((_, j) => j !== i);

/** Turns "Roter Rubin" into "roter_rubin" so ids stay valid while typing a name. */
export function slug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(s) ? s.slice(0, 64) : `x${s}`.slice(0, 64);
}

export function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) if (!taken.includes(`${base}_${n}`)) return `${base}_${n}`;
}

export async function download(url: string, spec: ModSpec, filename: string): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec }),
  });
  if (!res.ok) throw new Error(await res.text());
  saveBlob(await res.blob(), filename);
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** POSTs the spec and yields each newline-delimited JSON event as it arrives. */
export async function* streamBuild(spec: ModSpec): AsyncGenerator<BuildEvent> {
  const res = await fetch("/api/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec }),
  });
  if (!res.body) throw new Error("Kein Stream vom Server");
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) if (l.trim()) yield JSON.parse(l) as BuildEvent;
  }
}

export type BuildEvent =
  | { type: "line"; line: string }
  | { type: "done"; ok: boolean; id?: string; jar?: string | null; error?: string };

const STORAGE_KEY = "modforge.spec";

export function loadStored(): unknown | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function store(spec: ModSpec): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
  } catch {
    // quota exceeded — textures are large; losing the autosave is acceptable
  }
}
