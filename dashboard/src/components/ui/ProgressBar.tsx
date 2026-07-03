export function ProgressBar({
  pct,
  positive = true,
  label,
}: {
  pct: number;
  positive?: boolean;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor = positive
    ? clamped >= 100
      ? 'var(--status-good)'
      : 'var(--cat-blue)'
    : 'var(--status-critical)';

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>{label}</span>
          <span className="tabular-nums font-medium text-white">{clamped.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className="h-full rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
