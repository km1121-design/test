import { Award, Truck, UserPlus } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { Badge } from '../ui/Badge';
import { useDashboardData } from '../../context/DashboardDataContext';
import { YAMATO_CURRENT_AVG_PACKAGES, YAMATO_STAFF_TARGET_PACKAGES, YAMATO_TARGET_DRIVER_COUNT } from '../../data/constants';
import { formatYen } from '../../utils/format';

export function YamatoTab() {
  const { yamatoDrivers, yamatoActuals, isYamatoLive } = useDashboardData();
  const currentDriverCount = yamatoDrivers.length;
  const additionalNeeded = Math.max(0, YAMATO_TARGET_DRIVER_COUNT - currentDriverCount);
  const sorted = [...yamatoDrivers].sort((a, b) => (b.actualSales - b.actualOutsource - b.actualExpense) - (a.actualSales - a.actualOutsource - a.actualExpense));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="KPIサマリー（ヤマト宅配）" icon={<Truck className="h-4 w-4" />} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="売上高（半月実績）" value={formatYen(yamatoActuals.sales)} />
          <StatTile label="部門粗利（半月実績）" value={formatYen(yamatoActuals.margin)} tone={yamatoActuals.margin >= 0 ? 'good' : 'critical'} />
          <StatTile
            label="現在人員"
            value={`${currentDriverCount}名`}
            hint={isYamatoLive ? `実データ連携中・目標 ${YAMATO_TARGET_DRIVER_COUNT}名` : `目標 ${YAMATO_TARGET_DRIVER_COUNT}名`}
          />
        </div>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader title="ボトルネック解決策：課題は「生産性」ではなく「採用」" icon={<Award className="h-4 w-4 text-amber-400" />} />
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          1人あたりの配送完了数はすでに平均<strong className="text-white">{YAMATO_CURRENT_AVG_PACKAGES}個</strong>に達しており、
          ヤマト正社員目標（<strong className="text-white">{YAMATO_STAFF_TARGET_PACKAGES}個</strong>）を上回る優秀な稼働状態にある。
          したがって現場に更なる生産性向上を求めるのではなく、
          <strong className="text-white">フルコミ人員の純増（採用）</strong>こそが黒字化への最短ルートである。
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-black/20 px-3 py-2.5">
          <UserPlus className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-sm text-white">
            目標 {YAMATO_TARGET_DRIVER_COUNT}名 ／ 現状 {currentDriverCount}名 ⇒
            <strong className="ml-1 text-amber-400">あと{additionalNeeded}名の増員</strong>が最優先アクション
          </span>
        </div>
      </Card>

      <Card>
        <CardHeader title="ドライバー個別貢献度一覧" subtitle="会社への利益貢献額（マージン）が高い順" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-4 font-medium">氏名</th>
                <th className="py-2 pr-4 font-medium">等級</th>
                <th className="py-2 pr-4 font-medium">委託会社</th>
                <th className="py-2 pr-4 text-right font-medium">売上</th>
                <th className="py-2 pr-4 text-right font-medium">外注費</th>
                <th className="py-2 text-right font-medium">利益貢献</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => {
                const margin = d.actualSales - d.actualOutsource - d.actualExpense;
                return (
                  <tr key={d.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-white">{d.name}</td>
                    <td className="py-2.5 pr-4"><Badge tone="neutral">{d.role}</Badge></td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{d.subSegment}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatYen(d.actualSales)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatYen(d.actualOutsource)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-[var(--status-good)]">{formatYen(margin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
