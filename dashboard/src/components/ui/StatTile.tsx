import type { ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'critical' | 'warning';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-white',
  good: 'text-[var(--status-good)]',
  critical: 'text-[var(--status-critical)]',
  warning: 'text-[var(--status-warning)]',
};

export function StatTile({
  label,
  value,
  tone = 'neutral',
  hint,
  icon,
}: {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface-2)] px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}
