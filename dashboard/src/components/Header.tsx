import { Gauge } from 'lucide-react';
import { overallActuals } from '../data/aggregates';
import { formatYen, formatPercent } from '../utils/format';

export function Header() {
  const isDeficit = overallActuals.profit < 0;

  return (
    <header className="border-b border-white/10 bg-[var(--surface)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">Gooner運送事業部 経営分析ダッシュボード</h1>
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
