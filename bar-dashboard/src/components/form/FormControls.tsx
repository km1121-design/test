import type { ChangeEvent, ReactNode } from 'react'

const LABEL_CLASS = 'block text-xs font-medium text-[var(--text-secondary)]'
const INPUT_CLASS =
  'mt-1 w-full rounded-md border border-white/10 bg-[var(--surface-3)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60'

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <input
        type="text"
        className={INPUT_CLASS}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </label>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
}) {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <div className="relative mt-1">
        <input
          type="number"
          className={INPUT_CLASS + ' mt-0'}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.valueAsNumber || 0)}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <input type="date" className={INPUT_CLASS} value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} />
    </label>
  )
}

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <input type="time" className={INPUT_CLASS} value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} />
    </label>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <textarea
        className={INPUT_CLASS}
        rows={rows}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
    </label>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <label className={LABEL_CLASS}>
      {label}
      <select className={INPUT_CLASS} value={value} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
      <legend className="px-1 text-sm font-bold text-white">{title}</legend>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  )
}
