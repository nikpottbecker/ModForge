import { allItemIds } from "../../core/generator/index.js";
import type { ModSpec } from "../../core/spec.js";
import { slug } from "../lib.js";
import { Check, Field, Section, TextInput } from "../widgets.js";

export function ModSection({
  spec,
  set,
}: {
  spec: ModSpec;
  set: (patch: Partial<ModSpec>) => void;
}) {
  const ids = allItemIds(spec);
  return (
    <Section title="Mod" hint="Name, Version und Autor deiner Mod. Die Mod-ID muss eindeutig sein.">
      <div className="card">
        <div className="grid">
          <TextInput
            label="Anzeigename"
            value={spec.name}
            onChange={(name) => set({ name })}
            placeholder="Mein Mod"
          />
          <TextInput
            label="Mod-ID (a–z, 0–9, _)"
            value={spec.modId}
            onChange={(modId) => set({ modId: slug(modId) })}
          />
          <TextInput label="Version" value={spec.version} onChange={(version) => set({ version })} />
          <TextInput
            label="Java-Package"
            value={spec.groupId}
            onChange={(groupId) => set({ groupId })}
            placeholder="de.name.meinmod"
          />
          <TextInput label="Autor" value={spec.authors} onChange={(authors) => set({ authors })} />
          <TextInput label="Lizenz" value={spec.license} onChange={(license) => set({ license })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Beschreibung">
            <textarea
              rows={2}
              value={spec.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <strong>Kreativ-Tab</strong>
        </div>
        <div className="grid">
          <Check
            label="Eigenen Kreativ-Tab anlegen"
            value={spec.creativeTab.enabled}
            onChange={(enabled) => set({ creativeTab: { ...spec.creativeTab, enabled } })}
          />
          <TextInput
            label="Tab-Name (leer = Mod-Name)"
            value={spec.creativeTab.name}
            onChange={(name) => set({ creativeTab: { ...spec.creativeTab, name } })}
          />
          <Field label="Symbol">
            <select
              value={spec.creativeTab.icon}
              onChange={(e) => set({ creativeTab: { ...spec.creativeTab, icon: e.target.value } })}
            >
              <option value="">erster Eintrag</option>
              {ids.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <p className="hint">
        Zielversion: Minecraft {spec.minecraftVersion} mit NeoForge. Das erzeugte Projekt lässt sich
        direkt in IntelliJ öffnen.
      </p>
    </Section>
  );
}
