import type { Hono } from 'hono'
import type { Env } from '../app.ts'
import { saveReceipt, type SaveReceiptInput } from '../lib/storage.ts'

export function registerUploadRoutes(app: Hono<Env>) {
  // 領収書・伝票のアップロード（代表のみ）。base64で受け取り、共有ドライブ or モック保存。
  app.post('/api/upload/receipt', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== '代表') return c.json({ error: '権限がありません。' }, 403)

    const body = await c.req.json<Partial<SaveReceiptInput>>()
    if (!body.date || !body.bytesBase64 || !body.contentType) {
      return c.json({ error: 'date, contentType, bytesBase64 が必要です。' }, 400)
    }
    const input: SaveReceiptInput = {
      date: body.date,
      department: body.department || user.department,
      reporterName: body.reporterName || user.name,
      kind: body.kind || '領収書',
      seq: body.seq ?? 1,
      contentType: body.contentType,
      bytesBase64: body.bytesBase64,
    }
    try {
      const result = await saveReceipt(c.get('config'), input, Date.now())
      return c.json(result)
    } catch (e) {
      return c.json({ error: `アップロードに失敗しました: ${(e as Error).message}` }, 500)
    }
  })
}
