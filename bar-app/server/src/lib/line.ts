import { randomUUID } from 'node:crypto'
import type { Db } from '../db/driver.ts'
import { recordOutbox } from '../db/repository.ts'

/**
 * LINE配信クライアント（Phase 2）。
 *
 * LINE_CHANNEL_ACCESS_TOKEN が設定されていれば Messaging API へ実push、
 * 未設定なら outbox に記録するだけの「モードmock」で動く。
 * いずれの場合も line_outbox に記録するため、送信内容を後から検証できる。
 *
 * fetch を使うため Node（@hono/node-server）・Cloudflare Workers の両方で動作する。
 */
export interface LineSendResult {
  status: 'sent' | 'mock' | 'failed'
  detail?: string
}

const LINE_PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push'

export async function pushText(
  db: Db,
  opts: { token?: string; to: string; text: string; kind: string; now: number },
): Promise<LineSendResult> {
  const { token, to, text, kind, now } = opts

  // 宛先が未設定なら送らない（設定漏れを検知しやすいようfailedで記録）
  if (!to) {
    await recordOutbox(db, { id: randomUUID(), createdAt: now, target: '(未設定)', kind, body: text, status: 'failed' })
    return { status: 'failed', detail: '配信先グループIDが未設定です。' }
  }

  // トークン未設定 = モックモード（この環境での検証用）
  if (!token) {
    await recordOutbox(db, { id: randomUUID(), createdAt: now, target: to, kind, body: text, status: 'mock' })
    return { status: 'mock' }
  }

  try {
    const res = await fetch(LINE_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    })
    if (!res.ok) {
      const detail = `LINE API ${res.status}: ${await res.text().catch(() => '')}`.slice(0, 300)
      await recordOutbox(db, { id: randomUUID(), createdAt: now, target: to, kind, body: text, status: 'failed' })
      return { status: 'failed', detail }
    }
    await recordOutbox(db, { id: randomUUID(), createdAt: now, target: to, kind, body: text, status: 'sent' })
    return { status: 'sent' }
  } catch (e) {
    await recordOutbox(db, { id: randomUUID(), createdAt: now, target: to, kind, body: text, status: 'failed' })
    return { status: 'failed', detail: (e as Error).message }
  }
}
