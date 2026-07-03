import type { ReactNode } from 'react';

type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

const TONE_STYLES: Record<Tone, string> = {
  good: 'bg-[var(--status-good)]/15 text-[var(--status-good)] ring-1 ring-inset ring-[var(--status-good)]/30',
  warning: 'bg-[var(--status-warning)]/15 text-[var(--status-warning)] ring-1 ring-inset ring-[var(--status-warning)]/30',
  serious: 'bg-[var(--status-serious)]/15 text-[var(--status-serious)] ring-1 ring-inset ring-[var(--status-serious)]/30',
  critical: 'bg-[var(--status-critical)]/15 text-[var(--status-critical)] ring-1 ring-inset ring-[var(--status-critical)]/30',
  neutral: 'bg-white/8 text-[var(--text-secondary)] ring-1 ring-inset ring-white/15',
};

export function Badge({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
