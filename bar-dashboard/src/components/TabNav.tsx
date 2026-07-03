export type TabKey = 'intake' | 'summary' | 'dashboard' | 'daily' | 'rep' | 'staff' | 'master'

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'intake', label: '日報入力' },
  { key: 'summary', label: 'サマリー' },
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'daily', label: '日次進捗管理' },
  { key: 'rep', label: '代表個人進捗管理' },
  { key: 'staff', label: 'スタッフ個人進捗管理' },
  { key: 'master', label: 'マスター管理' },
]

export function TabNav({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-[var(--surface-2)] p-1" role="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
              isActive ? 'bg-amber-500 text-black shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
