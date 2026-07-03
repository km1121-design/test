import { useState } from 'react';
import { Header } from './components/Header';
import { TabNav, type TabKey } from './components/TabNav';
import { SimulatorPanel } from './components/SimulatorPanel';
import { OverallPLTab } from './components/tabs/OverallPLTab';
import { YamatoTab } from './components/tabs/YamatoTab';
import { EnterpriseTab } from './components/tabs/EnterpriseTab';
import { FrictionLogTab } from './components/tabs/FrictionLogTab';
import { ToastProvider } from './components/ToastProvider';
import { useSimulator } from './hooks/useSimulator';

function DashboardBody() {
  const [tab, setTab] = useState<TabKey>('overall');
  const { inputs, update, reset, result } = useSimulator();

  return (
    <div className="min-h-full bg-[var(--page)]">
      <Header />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <SimulatorPanel inputs={inputs} result={result} update={update} reset={reset} />
          </aside>

          <section className="flex flex-col gap-5">
            <TabNav active={tab} onChange={setTab} />
            {tab === 'overall' && <OverallPLTab />}
            {tab === 'yamato' && <YamatoTab />}
            {tab === 'enterprise' && <EnterpriseTab />}
            {tab === 'friction' && <FrictionLogTab />}
          </section>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <DashboardBody />
    </ToastProvider>
  );
}

export default App;
