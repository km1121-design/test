import type { Department } from '../lib/types.ts'
import { formatMonthLabel, listRecentMonthKeys } from '../lib/api.ts'

const DEPARTMENTS: Department[] = ['1部', '2部']

export function DepartmentToggle({ value, onChange }: { value: Department; onChange: (d: Department) => void }) {
  return (
    <div className="flex gap-1 rounded-md border border-white/10 bg-[var(--surface-3)] p-1">
      {DEPARTMENTS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`rounded px-3 py-1.5 text-sm font-medium ${value === d ? 'bg-amber-500 text-black' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

export function MonthSelect({ value, onChange, count = 6 }: { value: string; onChange: (m: string) => void; count?: number }) {
  return (
    <select
      className="rounded-md border border-white/10 bg-[var(--surface-3)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {listRecentMonthKeys(count).map((m) => (
        <option key={m} value={m}>
          {formatMonthLabel(m)}
        </option>
      ))}
    </select>
  )
}
