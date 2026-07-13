import type { Hono } from 'hono'
import type { Env } from '../app.ts'
import type { DeliverySettings } from '../types.ts'
import { getDeliverySettings, getRecentOutbox, countOutboxThisMonth, upsertDeliverySettings } from '../db/repository.ts'
import { runDailyDelivery, runReminders, runAlerts } from '../lib/delivery.ts'

function repOnly(c: { get: (k: 'user') => Env['Variables']['user'] }) {
  const u = c.get('user')
  return u && u.role === '代表' ? u : null
}

function monthStartMs(now: number): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

export function registerDeliveryRoutes(app: Hono<Env>) {
  // 配信設定の取得
  app.get('/api/delivery/settings', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    return c.json(await getDeliverySettings(c.get('db')))
  })

  // 配信設定の保存
  app.put('/api/delivery/settings', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const body = await c.req.json<DeliverySettings>()
    await upsertDeliverySettings(c.get('db'), body)
    return c.json({ ok: true })
  })

  // 送信記録（outbox）＋当月通数
  app.get('/api/delivery/outbox', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const db = c.get('db')
    const now = Date.now()
    return c.json({
      entries: await getRecentOutbox(db, 30),
      monthlyCount: await countOutboxThisMonth(db, monthStartMs(now)),
      // LINE無料枠（決定G）
      freeQuota: 200,
      mockMode: !c.get('config').lineToken,
    })
  })

  // 日次配信の手動実行（②サマリー＋⑤まとめ）。cronと同じ処理を代表が任意に叩ける。
  app.post('/api/delivery/run-daily', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const body = await c.req.json<{ date?: string }>().catch(() => ({}) as { date?: string })
    const result = await runDailyDelivery(c.get('db'), c.get('config'), body.date, Date.now())
    return c.json(result)
  })

  // ③ 未提出リマインドの手動実行
  app.post('/api/delivery/run-reminders', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const body = await c.req.json<{ date?: string }>().catch(() => ({}) as { date?: string })
    const result = await runReminders(c.get('db'), c.get('config'), body.date, Date.now())
    return c.json(result)
  })

  // ④ 異常アラートの手動実行
  app.post('/api/delivery/run-alerts', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const body = await c.req.json<{ date?: string }>().catch(() => ({}) as { date?: string })
    const result = await runAlerts(c.get('db'), c.get('config'), body.date, Date.now())
    return c.json(result)
  })

  // 日次配信のHTTPエンドポイント（開発・外部cron用）。
  // 本番のCloudflare Cron Triggerは Workers の scheduled() ハンドラから
  // runDailyDelivery() を直接呼ぶ（index.workers.ts）ため、この経路は使わない。
  // 外部cronから叩く場合は CRON_SECRET で保護する。
  app.post('/api/cron/daily', async (c) => {
    const configured = c.get('config').cronSecret
    if (configured && c.req.header('x-cron-secret') !== configured) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    const db = c.get('db')
    const cfg = c.get('config')
    const now = Date.now()
    // 22:00: ②日次サマリー＋⑤スタッフ日報まとめ ＋ ④異常アラート
    const daily = await runDailyDelivery(db, cfg, undefined, now)
    const alerts = await runAlerts(db, cfg, undefined, now)
    return c.json({ daily, alerts })
  })

  // 締め時刻(19:00)のリマインドCron
  app.post('/api/cron/reminder', async (c) => {
    const configured = c.get('config').cronSecret
    if (configured && c.req.header('x-cron-secret') !== configured) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    const result = await runReminders(c.get('db'), c.get('config'), undefined, Date.now())
    return c.json(result)
  })
}
