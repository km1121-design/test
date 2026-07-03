import { AlertTriangle, TrendingDown, Truck, Users2 } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { overallActuals, yamatoActuals } from '../../data/aggregates';
import { VEHICLE_EXPENSE_DETAIL, VEHICLE_EXPENSE_TOTAL } from '../../data/vehicleExpense';
import { ADMIN_BASE_COST } from '../../data/constants';
import { formatYen, formatPercent } from '../../utils/format';
import type { ExpenseCategory } from '../../types';

const CATEGORY_TONE: Record<ExpenseCategory, string> = {
  固定車両費: 'text-[var(--cat-blue)]',
  固定経費: 'text-[var(--cat-aqua)]',
  '変動・突発': 'text-[var(--status-warning)]',
  広告経費: 'text-[var(--cat-violet)]',
  控除項目: 'text-[var(--status-good)]',
};

export function OverallPLTab() {
  const marginPerPackageMin = 7;
  const marginPerPackageMax = 12;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="財務サマリー（半月実績）" subtitle="16日間時点のドライバー実績を集計した現状値" icon={<TrendingDown className="h-4 w-4" />} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="売上額" value={formatYen(overallActuals.sales)} />
          <StatTile label="外注支払原価" value={formatYen(overallActuals.outsourceCost)} />
          <StatTile
            label="全体利益"
            value={formatYen(overallActuals.profit)}
            tone={overallActuals.profit >= 0 ? 'good' : 'critical'}
          />
          <StatTile
            label="利益率"
            value={formatPercent(overallActuals.marginRate, 2)}
            tone={overallActuals.marginRate >= 0 ? 'good' : 'critical'}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="構造的ボトルネックの分析" icon={<AlertTriangle className="h-4 w-4" />} />
        <ul className="flex flex-col gap-3">
          <li className="flex gap-3 rounded-lg border border-white/10 bg-[var(--surface-2)] p-3">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cat-blue)]" />
            <div className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-white">ヤマトの低マージン構造：</span>
              現状は1個あたり¥{marginPerPackageMin}〜¥{marginPerPackageMax}の中抜きにとどまっており、
              半月実績のヤマト部門粗利は{formatYen(yamatoActuals.margin)}。目標水準（¥14/個）まで単価差を改善しない限り、車両・管理諸経費を賄いきれない。
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-white/10 bg-[var(--surface-2)] p-3">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
            <div className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-white">車両・間接経費の過多：</span>
              固定車両管理諸経費は月{formatYen(VEHICLE_EXPENSE_TOTAL)}に達し、車検・修理などの突発費用も含めて恒常的にキャッシュを圧迫している。
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-white/10 bg-[var(--surface-2)] p-3">
            <Users2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cat-violet)]" />
            <div className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-white">管理者人件費の重荷：</span>
              赤羽・小川・三田の合計固定人件費は月{formatYen(ADMIN_BASE_COST)}。売上成長のスピードに対して先行負担が大きく、黒字化のハードルを引き上げている。
            </div>
          </li>
        </ul>
      </Card>

      <Card>
        <CardHeader title="固定費内訳（VEHICLE_EXPENSE_DETAIL）" subtitle={`合計 ${formatYen(VEHICLE_EXPENSE_TOTAL)} / 月`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-4 font-medium">項目名</th>
                <th className="py-2 pr-4 font-medium">区分</th>
                <th className="py-2 pr-4 text-right font-medium">金額</th>
                <th className="py-2 font-medium">説明</th>
              </tr>
            </thead>
            <tbody>
              {VEHICLE_EXPENSE_DETAIL.map((item) => (
                <tr key={item.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-white">{item.name}</td>
                  <td className={`py-2.5 pr-4 ${CATEGORY_TONE[item.category]}`}>{item.category}</td>
                  <td className={`py-2.5 pr-4 text-right tabular-nums font-semibold ${item.amount < 0 ? 'text-[var(--status-good)]' : 'text-white'}`}>
                    {formatYen(item.amount)}
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)]">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
