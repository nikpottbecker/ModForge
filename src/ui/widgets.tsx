import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    </Field>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  labels,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={on ? "chip on" : "chip"}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

/** Card wrapper for one entry in a list, with a delete button. */
export function EntryCard({
  title,
  onRemove,
  actions,
  children,
}: {
  title: ReactNode;
  onRemove: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <strong>{title}</strong>
        <div className="spacer" />
        {actions}
        <button type="button" className="btn sm danger" onClick={onRemove}>
          Löschen
        </button>
      </div>
      {children}
    </div>
  );
}

export function Section({
  title,
  hint,
  onAdd,
  addLabel,
  actions,
  children,
}: {
  title: string;
  hint: string;
  onAdd?: () => void;
  addLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="section-head">
        <h2>{title}</h2>
        <div className="spacer" />
        {actions}
        {onAdd && (
          <button type="button" className="btn primary" onClick={onAdd}>
            {addLabel ?? "Hinzufügen"}
          </button>
        )}
      </div>
      <p className="hint">{hint}</p>
      {children}
    </>
  );
}
