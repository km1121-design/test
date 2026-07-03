import { Gauge, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useDashboardData } from '../context/DashboardDataContext';
import { formatYen, formatPercent } from '../utils/format';

export function Header() {
  const { overallActuals, isYamatoLive, liveStatus } = useDashboardData();
  const isDeficit = overallActuals.profit < 0;

  return (
    <header className="border-b border-white/10 bg-[var(--surface)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">Gooner運送事業部 経営分析ダッシュボード</h1>
              <LiveStatusBadge status={liveStatus} isLive={isYamatoLive} />
            </div>
            <p className="text-xs text-[var(--muted)]">月利100万円の黒字化を最速で達成するための経営判断支援システム</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-[var(--surface-2)] px-4 py-2">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">半月実績（現状）</div>
            <div className={`text-sm font-bold tabular-nums ${isDeficit ? 'text-[var(--status-critical)]' : 'text-[var(--status-good)]'}`}>
              {formatYen(overallActuals.profit)}（{formatPercent(overallActuals.marginRate, 2)}）
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function LiveStatusBadge({ status, isLive }: { status: string; isLive: boolean }) {
  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] ring-1 ring-inset ring-white/15">
        <Loader2 className="h-3 w-3 animate-spin" />
        実データ取得中
      </span>
    );
  }
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--status-good)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--status-good)] ring-1 ring-inset ring-[var(--status-good)]/30">
        <Wifi className="h-3 w-3" />
        ヤマト実データ連携中
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--status-warning)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--status-warning)] ring-1 ring-inset ring-[var(--status-warning)]/30">
        <WifiOff className="h-3 w-3" />
        実データ取得失敗（モック表示中）
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] ring-1 ring-inset ring-white/15">
      <WifiOff className="h-3 w-3" />
      モックデータ表示中
    </span>
  );
}
