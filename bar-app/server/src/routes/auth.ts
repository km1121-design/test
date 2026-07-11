import type { Hono } from 'hono'
import type { Env } from '../app.ts'
import { findStaffById, getAllStaff } from '../db/repository.ts'

/**
 * 認証ルート。
 *
 * 【本番（LIFF）】フロントは LIFF SDK で取得した ID トークンを Authorization に載せて送る。
 * ここで LINE の検証エンドポイント（https://api.line.me/oauth2/v2.1/verify）にかけ、
 * 得られた sub（lineUserId）で staff を引き当てて SessionUser を確立する。
 *
 * 【開発（この環境）】LINEチャネルなしで動かすため、スタッフ一覧から選んで「ログイン」する
 * モックを提供する。フロントは返ってきた user.id を x-user-id ヘッダに付けて以降のAPIを呼ぶ。
 */
export function registerAuthRoutes(app: Hono<Env>) {
  // ログイン可能なユーザー一覧（モックログインのセレクタ用）
  app.get('/api/auth/users', async (c) => {
    const staff = await getAllStaff(c.get('db'))
    return c.json(staff.map((s) => ({ id: s.id, name: s.name, role: s.role, department: s.department })))
  })

  // モックログイン: staffId を検証して SessionUser を返す
  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json<{ staffId?: string }>()
    if (!body.staffId) return c.json({ error: 'staffId が必要です。' }, 400)
    const staff = await findStaffById(c.get('db'), body.staffId)
    if (!staff || !staff.active) return c.json({ error: 'ユーザーが見つかりません。' }, 404)
    return c.json({ id: staff.id, name: staff.name, role: staff.role, department: staff.department })
  })

  // 現在のセッション確認
  app.get('/api/auth/me', (c) => {
    const user = c.get('user')
    if (!user) return c.json({ error: '未ログイン' }, 401)
    return c.json(user)
  })
}
