import { useMemo, useState } from 'react';
import { AlertOctagon, MessageCircleWarning, Siren } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { StatTile } from '../ui/StatTile';
import { Badge } from '../ui/Badge';
import { FIELDBUGS_LOG } from '../../data/fieldBugs';
import { RECRUIT_AD_COST } from '../../data/constants';
import { formatYen } from '../../utils/format';
import type { BugStatus } from '../../types';

const STATUS_TONE: Record<BugStatus, 'critical' | 'warning' | 'good'> = {
  未対応: 'critical',
  保留: 'warning',
  修正済み: 'good',
};

const SEVERITY_TONE: Record<string, 'critical' | 'warning' | 'neutral'> = {
  高: 'critical',
  中: 'warning',
  低: 'neutral',
};

const STATUS_FILTERS: (BugStatus | '全て')[] = ['全て', '未対応', '保留', '修正済み'];

export function FrictionLogTab() {
  const [filter, setFilter] = useState<BugStatus | '全て'>('全て');

  const counts = useMemo(() => {
    return FIELDBUGS_LOG.reduce(
      (acc, bug) => {
        acc[bug.status] += 1;
        return acc;
      },
      { 未対応: 0, 保留: 0, 修正済み: 0 } as Record<BugStatus, number>,
    );
  }, []);

  const visible = filter === '全て' ? FIELDBUGS_LOG : FIELDBUGS_LOG.filter((b) => b.status === filter);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="現場イライラ検知サマリー" subtitle="LINE Bot・Webフォームへの報告集計" icon={<MessageCircleWarning className="h-4 w-4" />} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="未対応" value={`${counts.未対応}件`} tone={counts.未対応 > 0 ? 'critical' : 'good'} />
          <StatTile label="保留" value={`${counts.保留}件`} tone="warning" />
          <StatTile label="修正済み" value={`${counts.修正済み}件`} tone="good" />
        </div>
      </Card>

      <Card className="border-red-500/30 bg-red-500/[0.04]">
        <CardHeader title="経営リスクの警鐘" icon={<Siren className="h-4 w-4 text-red-400" />} />
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          報告フォームの重複エラーやシステム遅延はドライバーの不満を蓄積させ、離職に直結する。
          離職が発生した場合、再採用のために求人・広告ランニングコスト（Indeed・バイトル合計
          <strong className="text-white"> {formatYen(RECRUIT_AD_COST)}/月</strong>）が突発的に発生し、
          黒字化を妨げるボトルネックとなる。現場摩擦の早期解消は採用コスト抑制に直結する経営課題である。
        </p>
      </Card>

      <Card>
        <CardHeader title="現場課題・バグトラッカー" icon={<AlertOctagon className="h-4 w-4" />} />
        <div className="mb-4 flex gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === s ? 'bg-amber-500 text-black' : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {visible.map((bug) => (
            <div key={bug.id} className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[bug.status]}>{bug.status}</Badge>
                <Badge tone={SEVERITY_TONE[bug.severity]}>重要度: {bug.severity}</Badge>
                <span className="text-xs text-[var(--muted)]">{bug.category} ・ {bug.channel}</span>
                <span className="ml-auto text-xs tabular-nums text-[var(--muted)]">{bug.reportedDate}</span>
              </div>
              <p className="mt-2 text-sm text-white">{bug.description}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">報告者: {bug.reporter}</p>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--muted)]">該当する報告はありません</p>
          )}
        </div>
      </Card>
    </div>
  );
}
