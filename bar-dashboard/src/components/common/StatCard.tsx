export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  const toneClass =
    tone === 'good' ? 'text-[var(--status-good)]' : tone === 'bad' ? 'text-[var(--status-critical)]' : 'text-white'

  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
      <div className="text-[11px] tracking-wide text-[var(--muted)] uppercase">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  )
}
