import { useState } from 'react'
import { Header } from './components/Header'
import { TabNav, type TabKey } from './components/TabNav'
import { ToastProvider } from './components/ToastProvider'
import { AppDataProvider } from './context/AppDataContext'
import { ReportIntakeTab } from './components/tabs/ReportIntakeTab'
import { SummaryTab } from './components/tabs/SummaryTab'
import { DashboardTab } from './components/tabs/DashboardTab'
import { DailyProgressTab } from './components/tabs/DailyProgressTab'
import { RepProgressTab } from './components/tabs/RepProgressTab'
import { StaffProgressTab } from './components/tabs/StaffProgressTab'
import { MasterTab } from './components/tabs/MasterTab'

function DashboardBody() {
  const [tab, setTab] = useState<TabKey>('intake')

  return (
    <div className="min-h-full bg-[var(--page)]">
      <Header />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="flex flex-col gap-5">
          <TabNav active={tab} onChange={setTab} />
          {tab === 'intake' && <ReportIntakeTab />}
          {tab === 'summary' && <SummaryTab />}
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'daily' && <DailyProgressTab />}
          {tab === 'rep' && <RepProgressTab />}
          {tab === 'staff' && <StaffProgressTab />}
          {tab === 'master' && <MasterTab />}
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AppDataProvider>
      <ToastProvider>
        <DashboardBody />
      </ToastProvider>
    </AppDataProvider>
  )
}

export default App
