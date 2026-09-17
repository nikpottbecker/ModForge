import { useEffect, useRef, useState } from "react";
import { validateSpec } from "../../core/generator/index.js";
import type { ModSpec } from "../../core/spec.js";
import { IconError, IconOk, IconWarn } from "../icons.js";
import { download, saveBlob, streamBuild } from "../lib.js";
import { Section } from "../widgets.js";

export function BuildSection({ spec }: { spec: ModSpec }) {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [jar, setJar] = useState<{ id: string; name: string } | null>(null);
  const [java, setJava] = useState<string | null | undefined>(undefined);
  const logEl = useRef<HTMLDivElement>(null);

  const issues = validateSpec(spec);
  const errors = issues.filter((i) => i.level === "error");

  useEffect(() => {
    fetch("/api/env")
      .then((r) => r.json())
      .then((e) => setJava(e.java))
      .catch(() => setJava(null));
  }, []);

  useEffect(() => {
    if (logEl.current) logEl.current.scrollTop = logEl.current.scrollHeight;
  }, [log]);

  const build = async () => {
    setBusy(true);
    setJar(null);
    setLog(["Build gestartet — der erste Lauf lädt Minecraft und dauert einige Minuten."]);
    try {
      for await (const e of streamBuild(spec)) {
        if (e.type === "line") setLog((l) => [...l, e.line]);
        else {
          setLog((l) => [...l, e.ok ? "✓ BUILD ERFOLGREICH" : `✗ FEHLGESCHLAGEN ${e.error ?? ""}`]);
          if (e.ok && e.id && e.jar) setJar({ id: e.id, name: e.jar });
        }
      }
    } catch (err) {
      setLog((l) => [...l, `Fehler: ${String(err)}`]);
    }
    setBusy(false);
  };

  const getJar = async () => {
    if (!jar) return;
    const res = await fetch(`/api/build/${jar.id}/jar`);
    saveBlob(await res.blob(), jar.name);
  };

  return (
    <Section title="Bauen" hint="Prüfen, exportieren und als fertiges .jar kompilieren.">
      {issues.length > 0 ? (
        <div className="issues">
          {issues.map((it, i) => (
            <div key={i} className={`issue ${it.level}`}>
              {it.level === "error" ? <IconError /> : <IconWarn />}
              <div>
                {it.message}
                {it.hint && (
                  <div style={{ color: "var(--text-muted)", marginTop: 2 }}>{it.hint}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="issues">
          <div className="issue ok">
            <IconOk />
            <div>Alles in Ordnung — bereit zum Bauen.</div>
          </div>
        </div>
      )}

      <div className="glass">
        <div className="build-row">
          <button
            type="button"
            className={busy ? "btn go loading" : "btn go"}
            disabled={busy || errors.length > 0 || java === null}
            onClick={build}
          >
            Mod bauen (.jar)
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={errors.length > 0}
            onClick={() => download("/api/export", spec, `${spec.modId}-src.zip`)}
          >
            Projekt als ZIP
          </button>
          {jar && (
            <button type="button" className="btn primary" onClick={getJar}>
              {jar.name} herunterladen
            </button>
          )}
          <div className="spacer" />
          <span className="tag">
            {java === undefined
              ? "prüfe Java …"
              : java
                ? `JDK ${java}`
                : "Kein JDK 21 — nur ZIP-Export"}
          </span>
        </div>
      </div>

      <div className="log" ref={logEl}>
        {log.length === 0 ? "Noch kein Build gelaufen." : log.join("\n")}
      </div>
    </Section>
  );
}
