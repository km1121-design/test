import type { Hono } from 'hono'
import type { Env } from '../app.ts'
import { bindStaffLineUserId, findStaffById, findStaffByLineUserId, getAllStaff } from '../db/repository.ts'
import { verifyLiffIdToken } from '../lib/lineLogin.ts'

/**
 * 認証ルート。
 *
 * 【本番（LIFF）】フロントは LIFF SDK で取得した ID トークンを /api/auth/liff-login に送る。
 * サーバーは LINE の verify エンドポイントで検証し、sub（lineUserId）で staff を引き当てる。
 * 未紐付けの場合は /api/auth/liff-bind で初回紐付けする。
 *
 * 【開発（この環境）】LINEチャネルなしで動かすため、スタッフ一覧から選んで「ログイン」する
 * モックを提供する。フロントは返ってきた user.id を x-user-id ヘッダに付けて以降のAPIを呼ぶ。
 *
 * ※ ログイン後のセッションは x-user-id ヘッダ方式（店舗内ツール前提）。より厳格にする場合は
 *   各リクエストで ID トークンを検証する方式へ拡張できる（app.ts のミドルウェア差し替え）。
 */
export function registerAuthRoutes(app: Hono<Env>) {
  // 認証モード（フロントがLIFF/モックを判定するのに使う）
  app.get('/api/auth/mode', (c) => {
    return c.json({ mode: c.get('config').liffChannelId ? 'liff' : 'mock' })
  })

  // ログイン可能なユーザー一覧（モックログイン / 未紐付け時の紐付けセレクタ用）
  app.get('/api/auth/users', async (c) => {
    const staff = await getAllStaff(c.get('db'))
    return c.json(staff.map((s) => ({ id: s.id, name: s.name, role: s.role, department: s.department, bound: !!s.lineUserId })))
  })

  // モックログイン: staffId を検証して SessionUser を返す
  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json<{ staffId?: string }>()
    if (!body.staffId) return c.json({ error: 'staffId が必要です。' }, 400)
    const staff = await findStaffById(c.get('db'), body.staffId)
    if (!staff || !staff.active) return c.json({ error: 'ユーザーが見つかりません。' }, 404)
    return c.json({ id: staff.id, name: staff.name, role: staff.role, department: staff.department })
  })

  // LIFFログイン: IDトークンを検証し、紐付け済みならSessionUserを返す。
  // 未紐付けなら bound:false と本人のLINE情報を返す（フロントで紐付けUIへ）。
  app.post('/api/auth/liff-login', async (c) => {
    const channelId = c.get('config').liffChannelId
    if (!channelId) return c.json({ error: 'LIFFログインは未設定です。' }, 400)
    const body = await c.req.json<{ idToken?: string }>()
    if (!body.idToken) return c.json({ error: 'idToken が必要です。' }, 400)
    let profile
    try {
      profile = await verifyLiffIdToken(body.idToken, channelId)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 401)
    }
    const staff = await findStaffByLineUserId(c.get('db'), profile.userId)
    if (staff) {
      return c.json({ bound: true, user: { id: staff.id, name: staff.name, role: staff.role, department: staff.department } })
    }
    return c.json({ bound: false, lineUserId: profile.userId, displayName: profile.displayName })
  })

  // LIFF初回紐付け: IDトークンを再検証し、未紐付けスタッフに lineUserId を保存してログイン。
  app.post('/api/auth/liff-bind', async (c) => {
    const channelId = c.get('config').liffChannelId
    if (!channelId) return c.json({ error: 'LIFFログインは未設定です。' }, 400)
    const body = await c.req.json<{ idToken?: string; staffId?: string }>()
    if (!body.idToken || !body.staffId) return c.json({ error: 'idToken と staffId が必要です。' }, 400)
    let profile
    try {
      profile = await verifyLiffIdToken(body.idToken, channelId)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 401)
    }
    // 既に他のスタッフがこのLINEに紐付いていないか
    const existing = await findStaffByLineUserId(c.get('db'), profile.userId)
    if (existing) return c.json({ error: 'このLINEアカウントは既に別のスタッフに紐付いています。' }, 409)
    const staff = await bindStaffLineUserId(c.get('db'), body.staffId, profile.userId)
    if (!staff) return c.json({ error: '紐付けできませんでした（対象が無効か、既に別IDに紐付け済み）。' }, 409)
    return c.json({ bound: true, user: { id: staff.id, name: staff.name, role: staff.role, department: staff.department } })
  })

  // 現在のセッション確認
  app.get('/api/auth/me', (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: '未ログイン' }, 401)
    return c.json(user)
  })
}
