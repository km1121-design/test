import { Sliders, RotateCcw, ClipboardCopy, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader } from './ui/Card';
import { Slider } from './ui/Slider';
import { ProgressBar } from './ui/ProgressBar';
import { StatTile } from './ui/StatTile';
import { SIMULATOR_RANGES } from '../hooks/useSimulator';
import type { SimulatorInputs, SimulatorResult } from '../types';
import { formatYen, formatPercent } from '../utils/format';
import { copyReportToClipboard } from '../utils/export';
import { useToast } from './ToastProvider';
import { YAMATO_TARGET_DRIVER_COUNT } from '../data/constants';

interface Props {
  inputs: SimulatorInputs;
  result: SimulatorResult;
  update: <K extends keyof SimulatorInputs>(key: K, value: SimulatorInputs[K]) => void;
  reset: () => void;
}

export function SimulatorPanel({ inputs, result, update, reset }: Props) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await copyReportToClipboard(result);
      showToast('シミュレーション結果をクリップボードにコピーしました', 'success');
    } catch {
      showToast('コピーに失敗しました。ブラウザの権限設定をご確認ください', 'warning');
    }
  };

  const isBlackInk = result.netProfit >= result.goal;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="What-If シミュレーター"
          subtitle="スライダーを動かすと月間経常損益がリアルタイムに再計算されます"
          icon={<Sliders className="h-4 w-4" />}
        />

        <div className="flex flex-col gap-5">
          <Slider
            label="ヤマト稼働人数"
            value={inputs.yamatoDriverCount}
            {...SIMULATOR_RANGES.yamatoDriverCount}
            onChange={(v) => update('yamatoDriverCount', v)}
            formatValue={(v) => `${v}名`}
            accent="var(--cat-blue)"
            hint={`目標 ${YAMATO_TARGET_DRIVER_COUNT}名（現在比 あと${Math.max(0, YAMATO_TARGET_DRIVER_COUNT - inputs.yamatoDriverCount)}名）`}
          />
          <Slider
            label="1人1日あたり配完数"
            value={inputs.packagesPerDriverPerDay}
            {...SIMULATOR_RANGES.packagesPerDriverPerDay}
            onChange={(v) => update('packagesPerDriverPerDay', v)}
            formatValue={(v) => `${v}個/日`}
            accent="var(--cat-blue)"
          />
          <Slider
            label="企業配平均手数料率"
            value={inputs.enterpriseFeeRate}
            {...SIMULATOR_RANGES.enterpriseFeeRate}
            onChange={(v) => update('enterpriseFeeRate', v)}
            formatValue={(v) => formatPercent(v, 1)}
            accent="var(--cat-aqua)"
          />
          <Slider
            label="管理者人件費削減率"
            value={inputs.adminCostReductionRate}
            {...SIMULATOR_RANGES.adminCostReductionRate}
            onChange={(v) => update('adminCostReductionRate', v)}
            formatValue={(v) => formatPercent(v, 0)}
            accent="var(--cat-yellow)"
          />
          <Slider
            label="車両関連固定費削減額"
            value={inputs.fixedCostReduction}
            {...SIMULATOR_RANGES.fixedCostReduction}
            onChange={(v) => update('fixedCostReduction', v)}
            formatValue={(v) => formatYen(v)}
            accent="var(--cat-violet)"
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-3)] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            リセット
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-400"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            結果をコピー
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="月間最終経常損益（予測）" icon={<TrendingUp className="h-4 w-4" />} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="最終経常損益"
            value={formatYen(result.netProfit)}
            tone={result.netProfit >= 0 ? 'good' : 'critical'}
          />
          <StatTile
            label="黒字化目標とのGAP"
            value={formatYen(result.gapToGoal)}
            tone={result.gapToGoal <= 0 ? 'good' : 'warning'}
          />
        </div>

        <div className="mt-4">
          <ProgressBar pct={result.progressPct} positive={isBlackInk || result.netProfit >= 0} label={`目標達成率（目標 ${formatYen(result.goal)}）`} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-[var(--surface-2)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cat-blue)]" />
          <span>
            他条件を現状のまま維持する場合、月利{formatYen(result.goal)}の黒字化には
            <strong className="text-white"> ヤマト稼働人数 {result.driversNeededForGoal}名</strong>
            が必要です（
            {result.additionalDriversNeeded > 0
              ? <>現状比 <strong className="text-[var(--status-warning)]">あと{result.additionalDriversNeeded}名の増員</strong>が必要</>
              : '既に必要人数を満たしています'}
            ）。
          </span>
        </div>
      </Card>
    </div>
  );
}
