import { useEffect, useState } from 'react'
import { GlassWater, LogIn } from 'lucide-react'
import type { SessionUser } from '../lib/types.ts'
import { api } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'

export function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const [users, setUsers] = useState<SessionUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<SessionUser[]>('/api/auth/users')
      .then(setUsers)
      .catch((e: Error) => showToast(e.message, 'warning'))
      .finally(() => setLoading(false))
  }, [showToast])

  const reps = users.filter((u) => u.role === '代表')
  const staff = users.filter((u) => u.role === 'スタッフ')

  const doLogin = async (u: SessionUser) => {
    try {
      const res = await api.post<SessionUser>('/api/auth/login', { staffId: u.id })
      login(res)
      showToast(`${res.name} としてログインしました`, 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--page)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30">
            <GlassWater className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">BAR 日報・経営分析アプリ</h1>
            <p className="text-xs text-[var(--muted)]">ログインする名前を選んでください（開発用モック）</p>
          </div>
        </div>

        <p className="mt-4 rounded-md border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)]">
          本番では LINEログイン（LIFF）で自動認証します。この画面は開発・デモ用に、
          スタッフマスターから選んでログインするモックです。
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-[var(--muted)]">読み込み中…</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <Section title="代表" users={reps} onPick={doLogin} />
            <Section title="スタッフ" users={staff} onPick={doLogin} />
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, users, onPick }: { title: string; users: SessionUser[]; onPick: (u: SessionUser) => void }) {
  if (!users.length) return null
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold tracking-wide text-[var(--muted)]">{title}</div>
      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onPick(u)}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-2)] px-4 py-3 text-left text-sm text-white transition hover:border-amber-500/50 hover:bg-white/5"
          >
            <span>
              {u.name}
              <span className="ml-2 text-xs text-[var(--muted)]">{u.department}</span>
            </span>
            <LogIn className="h-4 w-4 text-[var(--muted)]" />
          </button>
        ))}
      </div>
    </div>
  )
}
