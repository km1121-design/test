import type { SessionUser } from './types.ts'

const USER_KEY = 'bar-app:user'

export function loadUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function saveUser(user: SessionUser | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

function headers(): HeadersInit {
  const user = loadUser()
  const h: Record<string, string> = { 'content-type': 'application/json' }
  // 開発中のモック認証。本番（LIFF）では ID トークンを Authorization に載せる。
  if (user) h['x-user-id'] = user.id
  return h
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `エラー (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => fetch(path, { headers: headers() }).then((r) => handle<T>(r)),
  post: <T>(path: string, body: unknown) =>
    fetch(path, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then((r) => handle<T>(r)),
  put: <T>(path: string, body: unknown) =>
    fetch(path, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then((r) => handle<T>(r)),
  /** CSVダウンロード（Blob） */
  download: async (path: string, filename: string) => {
    const res = await fetch(path, { headers: headers() })
    if (!res.ok) throw new Error(`ダウンロード失敗 (${res.status})`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export function formatCurrency(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function listRecentMonthKeys(count: number): string[] {
  const base = new Date()
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  return `${y}年${Number(m)}月`
}
