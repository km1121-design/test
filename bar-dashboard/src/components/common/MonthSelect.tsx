import { formatMonthLabel, listRecentMonthKeys } from '../../lib/dateUtils'

export function MonthSelect({ value, onChange, count = 6 }: { value: string; onChange: (month: string) => void; count?: number }) {
  const months = listRecentMonthKeys(count)
  return (
    <select
      className="rounded-md border border-white/10 bg-[var(--surface-3)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {months.map((m) => (
        <option key={m} value={m}>
          {formatMonthLabel(m)}
        </option>
      ))}
    </select>
  )
}
