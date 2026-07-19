/**
 * LIFF SDK ローダー（STEP 6）。
 * VITE_LIFF_ID が設定されているときだけ LIFF を使う。未設定なら null を返し、
 * 呼び出し側は従来のモックログインにフォールバックする。
 *
 * SDK は LINE のCDNから動的に読み込む（Pages公開時は外部スクリプト可）。
 */
interface Liff {
  init(config: { liffId: string }): Promise<void>
  isLoggedIn(): boolean
  login(config?: { redirectUri?: string }): void
  getIDToken(): string | null
  logout(): void
}

declare global {
  interface Window {
    liff?: Liff
  }
}

export const LIFF_ID: string | undefined = import.meta.env.VITE_LIFF_ID

let loaded: Promise<Liff | null> | null = null

function loadSdk(): Promise<Liff | null> {
  if (window.liff) return Promise.resolve(window.liff)
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    s.onload = () => resolve(window.liff ?? null)
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
}

/**
 * LIFFを初期化し、ログイン済みならIDトークンを返す。
 * - LIFF未設定 → null（モックへ）
 * - 未ログイン → liff.login() へリダイレクト（この関数は解決しない）
 */
export async function initLiffAndGetIdToken(): Promise<string | null> {
  if (!LIFF_ID) return null
  if (!loaded) loaded = loadSdk()
  const liff = await loaded
  if (!liff) throw new Error('LIFF SDK の読み込みに失敗しました。')
  await liff.init({ liffId: LIFF_ID })
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href })
    return null // リダイレクトされるため以降は実行されない
  }
  const token = liff.getIDToken()
  if (!token) throw new Error('IDトークンを取得できませんでした。')
  return token
}

export function liffLogout(): void {
  if (window.liff && LIFF_ID) {
    try {
      window.liff.logout()
    } catch {
      // no-op
    }
  }
}
