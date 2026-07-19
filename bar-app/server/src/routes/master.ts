import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'
import type { Env } from '../app.ts'
import type { DepartmentGoal, RateMaster, StaffMember } from '../types.ts'
import {
  getAllDepartmentGoals,
  getAllStaff,
  getRates,
  upsertDepartmentGoal,
  upsertRates,
  upsertStaff,
} from '../db/repository.ts'

function repOnly(c: { get: (k: 'user') => Env['Variables']['user'] }) {
  const user = c.get('user')
  return user && user.role === '代表' ? user : null
}

export function registerMasterRoutes(app: Hono<Env>) {
  app.get('/api/master/all', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const db = c.get('db')
    return c.json({
      staff: await getAllStaff(db, true),
      goals: await getAllDepartmentGoals(db),
      rates: await getRates(db),
    })
  })

  app.put('/api/master/staff', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const list = await c.req.json<StaffMember[]>()
    const db = c.get('db')
    for (const s of list) {
      await upsertStaff(db, { ...s, id: s.id || randomUUID(), active: s.active ?? true })
    }
    return c.json({ ok: true })
  })

  app.put('/api/master/goals', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const list = await c.req.json<DepartmentGoal[]>()
    const db = c.get('db')
    for (const g of list) await upsertDepartmentGoal(db, g)
    return c.json({ ok: true })
  })

  app.put('/api/master/rates', async (c) => {
    if (!repOnly(c)) return c.json({ error: '権限がありません。' }, 403)
    const rates = await c.req.json<RateMaster>()
    await upsertRates(c.get('db'), rates)
    return c.json({ ok: true })
  })
}
