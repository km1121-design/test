import { useMemo, useState } from 'react'

export interface TrendPoint {
  date: string
  overallSales: number
  dailyProfit: number
  cumulative: number
  unitPrice: number
}

type MetricKey = 'overallSales' | 'dailyProfit' | 'cumulative' | 'unitPrice'

const METRICS: { key: MetricKey; label: string; mode: 'bar' | 'line' }[] = [
  { key: 'overallSales', label: '日次売上', mode: 'bar' },
  { key: 'dailyProfit', label: '日次利益', mode: 'bar' },
  { key: 'cumulative', label: '累計売上', mode: 'line' },
  { key: 'unitPrice', label: '客単価', mode: 'bar' },
]

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>('cumulative')
  const meta = METRICS.find((m) => m.key === metric)!

  const W = 720
  const H = 240
  const padL = 56
  const padR = 16
  const padT = 16
  const padB = 28

  const geom = useMemo(() => {
    const values = points.map((p) => p[metric])
    const max = Math.max(1, ...values)
    const n = points.length
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1))
    const xBar = (i: number) => padL + (n === 0 ? 0 : (innerW * (i + 0.5)) / n)
    const y = (v: number) => padT + innerH - (innerH * v) / max
    return { values, max, n, innerW, innerH, x, xBar, y }
  }, [points, metric])

  if (!points.length) return <p className="text-sm text-[var(--muted)]">この部門・月の日報データがありません。</p>

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, v: geom.max * f, y: padT + geom.innerH - geom.innerH * f }))
  const barW = Math.max(2, (geom.innerW / geom.n) * 0.6)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${geom.x(i).toFixed(1)} ${geom.y(p[metric]).toFixed(1)}`).join(' ')
  const areaPath =
    `M ${geom.x(0).toFixed(1)} ${(padT + geom.innerH).toFixed(1)} ` +
    points.map((p, i) => `L ${geom.x(i).toFixed(1)} ${geom.y(p[metric]).toFixed(1)}`).join(' ') +
    ` L ${geom.x(points.length - 1).toFixed(1)} ${(padT + geom.innerH).toFixed(1)} Z`

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${metric === m.key ? 'bg-amber-500 text-black' : 'bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-white/5'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[var(--surface-2)] p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }} role="img" aria-label={`${meta.label}の推移`}>
          {gridY.map((g) => (
            <g key={g.f}>
              <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="var(--gridline)" strokeWidth="1" />
              <text x={padL - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill="var(--muted)">
                {g.v >= 10000 ? `${Math.round(g.v / 1000)}k` : Math.round(g.v)}
              </text>
            </g>
          ))}
          {meta.mode === 'line' ? (
            <>
              <path d={areaPath} fill="var(--cat-yellow)" opacity="0.12" />
              <path d={linePath} fill="none" stroke="var(--cat-yellow)" strokeWidth="2" />
              <circle cx={geom.x(points.length - 1)} cy={geom.y(points[points.length - 1][metric])} r="3.5" fill="var(--cat-yellow)" />
            </>
          ) : (
            points.map((p, i) => (
              <rect
                key={p.date}
                x={geom.xBar(i) - barW / 2}
                y={geom.y(p[metric])}
                width={barW}
                height={Math.max(0, padT + geom.innerH - geom.y(p[metric]))}
                rx="1.5"
                fill={p[metric] < 0 ? 'var(--status-critical)' : 'var(--cat-yellow)'}
                opacity="0.85"
              />
            ))
          )}
          {points.map((p, i) =>
            i % Math.ceil(points.length / 8) === 0 || i === points.length - 1 ? (
              <text key={`x${p.date}`} x={meta.mode === 'line' ? geom.x(i) : geom.xBar(i)} y={H - 10} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {Number(p.date.slice(8, 10))}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        {meta.label}：最新 {yen(points[points.length - 1][metric])}（{points.length}日分）
      </p>
    </div>
  )
}
