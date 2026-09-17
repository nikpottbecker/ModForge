import { useEffect, useRef, useState } from "react";
import { encodePngDataUrl } from "../core/png.js";
import type { Texture } from "../core/spec.js";

const PALETTE = [
  "#00000000", "#ffffff", "#c6c6c6", "#8b8b8b", "#555555", "#2b2b2b", "#000000", "#7a4a21",
  "#b1603a", "#e0483f", "#8c1c17", "#f0a04b", "#ffd83d", "#f7f0a0", "#6fbd45", "#2f7d31",
  "#3aa8c1", "#2d5fa8", "#1b2a63", "#9a5bc4", "#d86bb4", "#ffb2d0", "#4b3621", "#d9c7a0",
];

function useLoadedPixels(png: string | null, w: number, h: number) {
  const [pixels, setPixels] = useState<Uint8ClampedArray | null>(null);
  useEffect(() => {
    if (!png) {
      setPixels(new Uint8ClampedArray(w * h * 4));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      setPixels(ctx.getImageData(0, 0, w, h).data);
    };
    img.onerror = () => setPixels(new Uint8ClampedArray(w * h * 4));
    img.src = png;
  }, [png, w, h]);
  return pixels;
}

export function PixelEditor({
  title,
  value,
  width,
  height,
  onSave,
  onClose,
}: {
  title: string;
  value: Texture | null;
  width: number;
  height: number;
  onSave: (t: Texture | null) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#e0483f");
  const [erase, setErase] = useState(false);
  const painting = useRef(false);
  const pixels = useLoadedPixels(value?.png ?? null, width, height);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx || !pixels) return;
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
  }, [pixels, width, height]);

  const paint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const el = canvas.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * height);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const ctx = el.getContext("2d", { willReadFrequently: true })!;
    if (erase) ctx.clearRect(x, y, 1, 1);
    else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  };

  const save = () => {
    const ctx = canvas.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, width, height).data;
    if (!data.some((v, i) => i % 4 === 3 && v > 0)) return onSave(null);
    onSave({ png: encodePngDataUrl(width, height, new Uint8Array(data)) });
  };

  const scale = width <= 16 ? 24 : 8;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <strong>{title}</strong>
          <div className="spacer" />
          <span className="hint" style={{ margin: 0 }}>
            {width}×{height}
          </span>
        </div>
        <div className="editor-row">
          <div className="canvas-wrap">
            <canvas
              ref={canvas}
              className="paint"
              width={width}
              height={height}
              style={{ width: width * scale, height: height * scale }}
              onPointerDown={(e) => {
                painting.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                paint(e);
              }}
              onPointerMove={(e) => painting.current && paint(e)}
              onPointerUp={() => (painting.current = false)}
            />
          </div>
          <div>
            <div className="swatches">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className={!erase && c === color ? "swatch on" : "swatch"}
                  style={{
                    background:
                      c === "#00000000" ? "repeating-conic-gradient(#555 0% 25%, #888 0% 50%) 0 0 / 10px 10px" : c,
                  }}
                  onClick={() => {
                    if (c === "#00000000") setErase(true);
                    else {
                      setErase(false);
                      setColor(c);
                    }
                  }}
                />
              ))}
            </div>
            <div className="tools">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setErase(false);
                }}
                style={{ width: 44, height: 32, padding: 2 }}
              />
              <button
                type="button"
                className={erase ? "btn sm primary" : "btn sm"}
                onClick={() => setErase(!erase)}
              >
                Radierer
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={() => canvas.current?.getContext("2d")?.clearRect(0, 0, width, height)}
              >
                Leeren
              </button>
            </div>
            <p className="hint" style={{ maxWidth: 240 }}>
              Ohne eigene Textur erzeugt ModForge automatisch eine passende Platzhalter-Grafik.
            </p>
            <div className="row">
              <button type="button" className="btn go" onClick={save}>
                Übernehmen
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clickable sprite preview that opens the pixel editor. */
export function TextureSlot({
  label,
  value,
  onChange,
  width = 16,
  height = 16,
  preview = 48,
}: {
  label: string;
  value: Texture | null;
  onChange: (t: Texture | null) => void;
  width?: number;
  height?: number;
  preview?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <span style={{ color: "var(--muted)", fontSize: 12 }}>{label}</span>
      {value ? (
        <img
          className="sprite"
          src={value.png}
          width={preview}
          height={(preview * height) / width}
          onClick={() => setOpen(true)}
          alt={label}
        />
      ) : (
        <button
          type="button"
          className="btn sm"
          style={{ height: preview, width: preview }}
          onClick={() => setOpen(true)}
          title="Automatisch erzeugt — klicken zum Zeichnen"
        >
          auto
        </button>
      )}
      {open && (
        <PixelEditor
          title={label}
          value={value}
          width={width}
          height={height}
          onSave={(t) => {
            onChange(t);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
