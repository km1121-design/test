import { Building2, Percent, Wallet } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { Badge } from '../ui/Badge';
import { enterpriseDrivers, enterpriseActuals } from '../../data/aggregates';
import { PROJECT_MASTER } from '../../data/projectMaster';
import { formatYen, formatPercent } from '../../utils/format';

export function EnterpriseTab() {
  const expenseBorneDrivers = enterpriseDrivers.filter((d) => d.type === '経費会社持ち');
  const sortedProjects = [...PROJECT_MASTER].sort((a, b) => b.feeRate - a.feeRate);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="KPIサマリー（企業配・スポット）" icon={<Building2 className="h-4 w-4" />} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="企業配・スポット実績" value={formatYen(enterpriseActuals.sales)} />
          <StatTile label="部門利益" value={formatYen(enterpriseActuals.margin)} tone={enterpriseActuals.margin >= 0 ? 'good' : 'critical'} />
          <StatTile label="担当人員" value={`${enterpriseDrivers.length}名`} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="経費会社持ちドライバーの収支採算"
          subtitle="実売上からドライバー支払額・会社負担経費（ガソリン・駐車料金）を差し引いた実質利益"
          icon={<Wallet className="h-4 w-4" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-4 font-medium">氏名</th>
                <th className="py-2 pr-4 font-medium">案件</th>
                <th className="py-2 pr-4 text-right font-medium">実売上</th>
                <th className="py-2 pr-4 text-right font-medium">ドライバー支払額</th>
                <th className="py-2 pr-4 text-right font-medium">会社負担経費</th>
                <th className="py-2 text-right font-medium">実質会社利益</th>
              </tr>
            </thead>
            <tbody>
              {expenseBorneDrivers.map((d) => {
                const net = d.actualSales - d.actualOutsource - d.actualExpense;
                return (
                  <tr key={d.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-white">{d.name}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{d.subSegment}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatYen(d.actualSales)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatYen(d.actualOutsource)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--status-warning)]">{formatYen(d.actualExpense)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-[var(--status-good)]">{formatYen(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="案件マスタの中抜き率比較" subtitle="会社手数料率（高い順）と経費負担区分" icon={<Percent className="h-4 w-4" />} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-4 font-medium">案件名</th>
                <th className="py-2 pr-4 font-medium">案件詳細</th>
                <th className="py-2 pr-4 text-right font-medium">基本受託単価</th>
                <th className="py-2 pr-4 text-right font-medium">会社手数料率</th>
                <th className="py-2 font-medium">経費負担区分</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-white">{p.name}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{p.detail}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatYen(p.basePrice)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-white">{formatPercent(p.feeRate, 2)}</td>
                  <td className="py-2.5">
                    <Badge tone={p.expenseBearer === '経費会社持ち' ? 'warning' : 'neutral'}>{p.expenseBearer}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
          「たいやき案件（{formatPercent(0.3333, 2)}）」は最も手数料率が高く採算性が良い一方、
          「日比谷案件（{formatPercent(0.1935, 2)}・経費会社持ち）」は手数料率に加えて会社側のガソリン・駐車料金負担が発生するため、実質採算はさらに低くなる点に留意する。
        </p>
      </Card>
    </div>
  );
}
