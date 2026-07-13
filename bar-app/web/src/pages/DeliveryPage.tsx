import { useEffect, useState } from 'react'
import { Send, RefreshCw } from 'lucide-react'
import { api, todayISO } from '../lib/api.ts'
import { useToast } from '../components/ToastProvider.tsx'
import { NumberField, TextField, TimeField } from '../components/FormControls.tsx'

interface DeliverySettings {
  reportGroupId: string
  staffReportGroupId: string
  forwardRepEnabled: boolean
  dailySummaryEnabled: boolean
  staffDigestEnabled: boolean
  summaryTime: string
  reminderEnabled: boolean
  reminderTime: string
  alertEnabled: boolean
  paceDropThreshold: number
}

interface OutboxData {
  entries: { id: string; createdAt: number; target: string; kind: string; body: string; status: string }[]
  monthlyCount: number
  freeQuota: number
  mockMode: boolean
}

const KIND_LABEL: Record<string, string> = {
  'rep-forward': '①代表日報転送',
  'daily-summary': '②日次サマリー',
  'staff-digest': '⑤スタッフ日報まとめ',
  reminder: '③未提出リマインド',
  alert: '④異常アラート',
}
const STATUS_LABEL: Record<string, string> = { sent: '送信済', mock: 'モック', failed: '失敗' }

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-[var(--surface-3)] px-3 py-2.5">
      <span>
        <span className="text-sm text-white">{label}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{desc}</span>
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-500" />
    </label>
  )
}

export function DeliveryPage() {
  const { showToast } = useToast()
  const [settings, setSettings] = useState<DeliverySettings | null>(null)
  const [outbox, setOutbox] = useState<OutboxData | null>(null)
  const [runDate, setRunDate] = useState(todayISO())
  const [preview, setPreview] = useState<string>('')

  const loadOutbox = () => api.get<OutboxData>('/api/delivery/outbox').then(setOutbox).catch(() => {})

  useEffect(() => {
    api.get<DeliverySettings>('/api/delivery/settings').then(setSettings).catch((e: Error) => showToast(e.message, 'warning'))
    loadOutbox()
  }, [showToast])

  if (!settings) return <p className="text-sm text-[var(--muted)]">読み込み中…</p>

  const patch = (p: Partial<DeliverySettings>) => setSettings((s) => (s ? { ...s, ...p } : s))

  const save = async () => {
    try {
      await api.put('/api/delivery/settings', settings)
      showToast('配信設定を保存しました', 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  const runDaily = async () => {
    try {
      const res = await api.post<{ summary: { text: string } | null; digest: { text: string } | null }>('/api/delivery/run-daily', { date: runDate })
      const parts = [res.summary?.text, res.digest?.text].filter(Boolean) as string[]
      setPreview(parts.join('\n\n──────────\n\n'))
      showToast('日次配信を実行しました', 'success')
      loadOutbox()
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  const runReminders = async () => {
    try {
      const res = await api.post<{ reminded: { name: string; status: string; target: string }[] }>('/api/delivery/run-reminders', { date: runDate })
      const lines = res.reminded.map((r) => `[${r.status}] ${r.name} → ${r.target}`)
      setPreview(res.reminded.length ? `【未提出リマインド】${runDate}\n\n${lines.join('\n')}` : `${runDate} は未提出者なし（全員提出済み）`)
      showToast(`リマインド ${res.reminded.length}件を実行しました`, 'success')
      loadOutbox()
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  const runAlerts = async () => {
    try {
      const res = await api.post<{ alerts: { message: string }[] }>('/api/delivery/run-alerts', { date: runDate })
      setPreview(res.alerts.length ? res.alerts.map((a) => a.message).join('\n\n──────────\n\n') : `${runDate} 時点でアラート対象なし`)
      showToast(`アラート ${res.alerts.length}件を実行しました`, 'success')
      loadOutbox()
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <h2 className="text-sm font-bold text-white">LINE配信設定</h2>
        {outbox?.mockMode && (
          <p className="mt-2 rounded-md border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-[11px] text-sky-200">
            現在モックモードです（LINE_CHANNEL_ACCESS_TOKEN 未設定）。送信内容は下の履歴に記録されますが、実際のLINE送信は行われません。
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="日報グループID" value={settings.reportGroupId} onChange={(v) => patch({ reportGroupId: v })} placeholder="Cxxxxxxxx" />
          <TextField label="スタッフ日報グループID" value={settings.staffReportGroupId} onChange={(v) => patch({ staffReportGroupId: v })} placeholder="Cxxxxxxxx" />
          <TimeField label="サマリー配信時刻" value={settings.summaryTime} onChange={(v) => patch({ summaryTime: v })} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Toggle label="①日報転送" desc="代表日報の提出時に即時転送" value={settings.forwardRepEnabled} onChange={(v) => patch({ forwardRepEnabled: v })} />
          <Toggle label="②日次サマリー" desc="毎日定時に日報グループへ" value={settings.dailySummaryEnabled} onChange={(v) => patch({ dailySummaryEnabled: v })} />
          <Toggle label="⑤スタッフ日報まとめ" desc="専用グループへ1日1通" value={settings.staffDigestEnabled} onChange={(v) => patch({ staffDigestEnabled: v })} />
          <Toggle label="③未提出リマインド" desc="締め時刻に未提出者へ個別通知" value={settings.reminderEnabled} onChange={(v) => patch({ reminderEnabled: v })} />
          <Toggle label="④異常アラート" desc="達成ペース急落時に代表へ通知" value={settings.alertEnabled} onChange={(v) => patch({ alertEnabled: v })} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TimeField label="締め時刻（リマインド発火）" value={settings.reminderTime} onChange={(v) => patch({ reminderTime: v })} />
          <NumberField label="アラート発火しきい値（ペース下振れ）" value={Math.round(settings.paceDropThreshold * 100)} onChange={(v) => patch({ paceDropThreshold: v / 100 })} suffix="%" />
        </div>
        <button type="button" onClick={save} className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">保存</button>
      </section>

      <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <h2 className="text-sm font-bold text-white">日次配信を今すぐ実行（②＋⑤）</h2>
        <p className="mt-1 text-[11px] text-[var(--muted)]">本番は毎日{settings.summaryTime}にCronで自動実行されます。ここでは任意の日付で手動プレビューできます。</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              対象日
              <input type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-[var(--surface-3)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60" />
            </label>
          </div>
          <button type="button" onClick={runDaily} className="flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">
            <Send className="h-4 w-4" />
            ②＋⑤配信
          </button>
          <button type="button" onClick={runReminders} className="flex items-center gap-1.5 rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5">
            <Send className="h-4 w-4" />
            ③リマインド
          </button>
          <button type="button" onClick={runAlerts} className="flex items-center gap-1.5 rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5">
            <Send className="h-4 w-4" />
            ④アラート
          </button>
        </div>
        {preview && (
          <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-black/40 p-3 text-xs whitespace-pre-wrap text-[var(--text-secondary)]">{preview}</pre>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">送信履歴（outbox）</h2>
          <button type="button" onClick={loadOutbox} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-white/5">
            <RefreshCw className="h-3.5 w-3.5" />
            更新
          </button>
        </div>
        {outbox && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            当月のグループ配信通数: <span className="font-bold text-white tabular-nums">{outbox.monthlyCount}</span> / 無料枠 {outbox.freeQuota}通
            {outbox.monthlyCount > outbox.freeQuota * 0.8 && <span className="ml-2 text-[var(--status-serious)]">⚠ 無料枠に近づいています</span>}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {outbox?.entries.length === 0 && <p className="text-sm text-[var(--muted)]">まだ送信履歴はありません。</p>}
          {outbox?.entries.map((e) => (
            <details key={e.id} className="rounded-md border border-white/10 bg-[var(--surface-3)] px-3 py-2">
              <summary className="cursor-pointer text-xs text-white">
                <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5">{STATUS_LABEL[e.status] ?? e.status}</span>
                {KIND_LABEL[e.kind] ?? e.kind}
                <span className="ml-2 text-[var(--muted)]">→ {e.target}</span>
              </summary>
              <pre className="mt-2 overflow-auto text-[11px] whitespace-pre-wrap text-[var(--text-secondary)]">{e.body}</pre>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
