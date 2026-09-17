export type GenFile =
  | { path: string; text: string }
  | { path: string; base64: string };

export function text(path: string, content: string): GenFile {
  return { path, text: content };
}

export function json(path: string, value: unknown): GenFile {
  return { path, text: JSON.stringify(value, null, 2) + "\n" };
}

export function isBinary(f: GenFile): f is { path: string; base64: string } {
  return "base64" in f;
}
