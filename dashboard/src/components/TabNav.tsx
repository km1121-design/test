import type { ReactNode } from 'react';

export type TabKey = 'overall' | 'yamato' | 'enterprise' | 'friction';

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'overall', label: '全体PL' },
  { key: 'yamato', label: 'ヤマト' },
  { key: 'enterprise', label: '企業配' },
  { key: 'friction', label: '現場' },
];

export function TabNav({ active, onChange, badges }: { active: TabKey; onChange: (key: TabKey) => void; badges?: Partial<Record<TabKey, ReactNode>> }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/10 bg-[var(--surface-2)] p-1" role="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-amber-500 text-black shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
            }`}
          >
            {tab.label}
            {badges?.[tab.key]}
          </button>
        );
      })}
    </div>
  );
}
