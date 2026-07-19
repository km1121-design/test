import { useEffect, useState } from 'react'
import { GlassWater, LogIn, Link2 } from 'lucide-react'
import type { SessionUser } from '../lib/types.ts'
import { api } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'
import { initLiffAndGetIdToken } from '../lib/liff.ts'

interface AuthUser extends SessionUser {
  bound?: boolean
}

type Phase = 'loading' | 'mock' | 'liff-binding'

export function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [idToken, setIdToken] = useState<string>('')
  const [lineName, setLineName] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mode = await api.get<{ mode: 'liff' | 'mock' }>('/api/auth/mode')
        const list = await api.get<AuthUser[]>('/api/auth/users')
        if (cancelled) return
        setUsers(list)

        if (mode.mode === 'mock') {
          setPhase('mock')
          return
        }

        // LIFF モード
        const token = await initLiffAndGetIdToken()
        if (!token) {
          // VITE_LIFF_ID 未設定などでトークンが取れない場合はモックにフォールバック
          setPhase('mock')
          return
        }
        setIdToken(token)
        const res = await api.post<
          { bound: true; user: SessionUser } | { bound: false; lineUserId: string; displayName: string }
        >('/api/auth/liff-login', { idToken: token })
        if (cancelled) return
        if (res.bound) {
          login(res.user)
        } else {
          setLineName(res.displayName || 'あなた')
          setPhase('liff-binding')
        }
      } catch (e) {
        if (!cancelled) {
          showToast((e as Error).message, 'warning')
          setPhase('mock')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [login, showToast])

  const reps = users.filter((u) => u.role === '代表')
  const staff = users.filter((u) => u.role === 'スタッフ')

  const doMockLogin = async (u: AuthUser) => {
    try {
      const res = await api.post<SessionUser>('/api/auth/login', { staffId: u.id })
      login(res)
      showToast(`${res.name} としてログインしました`, 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  const doBind = async (u: AuthUser) => {
    try {
      const res = await api.post<{ bound: true; user: SessionUser }>('/api/auth/liff-bind', { idToken, staffId: u.id })
      login(res.user)
      showToast(`${res.user.name} にLINEを紐付けてログインしました`, 'success')
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
            <p className="text-xs text-[var(--muted)]">
              {phase === 'liff-binding' ? 'LINEアカウントとスタッフを紐付けます' : 'ログインする名前を選んでください'}
            </p>
          </div>
        </div>

        {phase === 'loading' && <p className="mt-6 text-sm text-[var(--muted)]">読み込み中…</p>}

        {phase === 'mock' && (
          <>
            <p className="mt-4 rounded-md border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)]">
              本番では LINEログイン（LIFF）で自動認証します。この画面は開発・デモ用に、
              スタッフマスターから選んでログインするモックです。
            </p>
            <div className="mt-6 flex flex-col gap-4">
              <Section title="代表" users={reps} onPick={doMockLogin} />
              <Section title="スタッフ" users={staff} onPick={doMockLogin} />
            </div>
          </>
        )}

        {phase === 'liff-binding' && (
          <>
            <p className="mt-4 rounded-md border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-[11px] leading-relaxed text-sky-200">
              LINE（{lineName}）でログインしました。初回のみ、あなたがマスター上のどのスタッフか
              選んで紐付けてください。次回以降は自動でログインされます。
            </p>
            <div className="mt-6 flex flex-col gap-4">
              <Section title="代表" users={reps.filter((u) => !u.bound)} onPick={doBind} bind />
              <Section title="スタッフ" users={staff.filter((u) => !u.bound)} onPick={doBind} bind />
              {users.every((u) => u.bound) && (
                <p className="text-xs text-[var(--muted)]">紐付け可能な未割当スタッフがいません。代表にマスター登録を依頼してください。</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, users, onPick, bind }: { title: string; users: AuthUser[]; onPick: (u: AuthUser) => void; bind?: boolean }) {
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
            {bind ? <Link2 className="h-4 w-4 text-[var(--muted)]" /> : <LogIn className="h-4 w-4 text-[var(--muted)]" />}
          </button>
        ))}
      </div>
    </div>
  )
}
