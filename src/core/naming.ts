/** snake_case id -> SCREAMING_SNAKE constant name */
export function constName(id: string): string {
  return id.toUpperCase();
}

/** snake_case id -> PascalCase */
export function pascal(id: string): string {
  return id
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");
}

/** snake_case id -> "Human Readable" */
export function humanize(id: string): string {
  return id
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export function javaString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/**
 * Resolves an ingredient/result reference to a fully qualified "namespace:path".
 * Bare ids are assumed to belong to the mod being generated.
 */
export function resolveRef(ref: string, modId: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return "";
  return trimmed.includes(":") ? trimmed : `${modId}:${trimmed}`;
}
