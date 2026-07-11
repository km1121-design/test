import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Db } from './db/driver.ts'
import type { SessionUser } from './types.ts'
import { findStaffById } from './db/repository.ts'
import { registerAuthRoutes } from './routes/auth.ts'
import { registerReportRoutes } from './routes/reports.ts'
import { registerAggregateRoutes } from './routes/aggregate.ts'
import { registerMasterRoutes } from './routes/master.ts'
import { registerCsvRoutes } from './routes/csv.ts'

export interface Env {
  Variables: {
    db: Db
    user: SessionUser | null
  }
}

/**
 * DBドライバを注入してHonoアプリを構築する。
 * Node（better-sqlite3）でもCloudflare Workers（D1）でも同じappを使えるようにする。
 */
export function createApp(getDbForRequest: () => Db) {
  const app = new Hono<Env>()

  app.use('*', cors())

  // DB注入 + 簡易セッション解決（開発中はモック: x-user-id ヘッダ）
  // 本番では LIFF の ID トークンを検証して user を解決する（routes/auth.ts のコメント参照）。
  app.use('*', async (c, next) => {
    const db = getDbForRequest()
    c.set('db', db)
    const userId = c.req.header('x-user-id')
    if (userId) {
      const staff = await findStaffById(db, userId)
      c.set('user', staff ? { id: staff.id, name: staff.name, role: staff.role, department: staff.department } : null)
    } else {
      c.set('user', null)
    }
    await next()
  })

  app.get('/api/health', (c) => c.json({ ok: true }))

  registerAuthRoutes(app)
  registerReportRoutes(app)
  registerAggregateRoutes(app)
  registerMasterRoutes(app)
  registerCsvRoutes(app)

  return app
}

/** 認証必須ガード */
export function requireUser(c: { get: (k: 'user') => SessionUser | null }): SessionUser {
  const user = c.get('user')
  if (!user) throw new HttpError(401, 'ログインが必要です。')
  return user
}

export function requireRep(c: { get: (k: 'user') => SessionUser | null }): SessionUser {
  const user = requireUser(c)
  if (user.role !== '代表') throw new HttpError(403, 'この操作は代表のみ可能です。')
  return user
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
