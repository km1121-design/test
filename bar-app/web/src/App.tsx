import { useState } from 'react'
import { GlassWater, LogOut } from 'lucide-react'
import { AuthProvider, useAuth } from './lib/auth.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { RepReportPage } from './pages/RepReportPage.tsx'
import { StaffReportPage } from './pages/StaffReportPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { DailyPage } from './pages/DailyPage.tsx'
import { StaffProgressPage } from './pages/StaffProgressPage.tsx'
import { MasterPage } from './pages/MasterPage.tsx'
import { ExportPage } from './pages/ExportPage.tsx'

type TabKey = 'report' | 'dashboard' | 'daily' | 'staff' | 'master' | 'export'

interface Tab {
  key: TabKey
  label: string
  repOnly?: boolean
}

const TABS: Tab[] = [
  { key: 'report', label: '日報入力' },
  { key: 'dashboard', label: 'ダッシュボード', repOnly: true },
  { key: 'daily', label: '日次進捗', repOnly: true },
  { key: 'staff', label: '個人進捗' },
  { key: 'master', label: 'マスター管理', repOnly: true },
  { key: 'export', label: 'CSV出力', repOnly: true },
]

function Shell() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<TabKey>('report')

  if (!user) return <LoginPage />

  const isRep = user.role === '代表'
  const visibleTabs = TABS.filter((t) => !t.repOnly || isRep)

  return (
    <div className="min-h-full bg-[var(--page)]">
      <header className="border-b border-white/10 bg-[var(--surface)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30">
              <GlassWater className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">BAR 日報・経営分析アプリ</h1>
              <p className="text-[11px] text-[var(--muted)]">
                {user.name}（{user.department}・{user.role}）
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            ログアウト
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-[var(--surface-2)] p-1">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                tab === t.key ? 'bg-amber-500 text-black shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'report' && (isRep ? <RepReportPage /> : <StaffReportPage />)}
        {tab === 'dashboard' && isRep && <DashboardPage />}
        {tab === 'daily' && isRep && <DailyPage />}
        {tab === 'staff' && <StaffProgressPage />}
        {tab === 'master' && isRep && <MasterPage />}
        {tab === 'export' && isRep && <ExportPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  )
}
