import 'dotenv/config'
import express from 'express'
import { messagingApi, middleware, type MiddlewareConfig, type WebhookEvent } from '@line/bot-sdk'
import { processIncomingText } from './line/handler.js'

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
const channelSecret = process.env.LINE_CHANNEL_SECRET
const reportGroupId = process.env.REPORT_GROUP_ID || undefined
const port = Number(process.env.PORT ?? 3000)

if (!channelAccessToken || !channelSecret) {
  console.error(
    '環境変数 LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET が設定されていません。.env を用意してください（.env.example を参照）。',
  )
  process.exit(1)
}

const lineConfig: MiddlewareConfig = { channelSecret }
const client = new messagingApi.MessagingApiClient({ channelAccessToken })

function resolveSourceId(source: WebhookEvent['source']): string | undefined {
  if (source.type === 'group') return source.groupId
  if (source.type === 'room') return source.roomId
  if (source.type === 'user') return source.userId
  return undefined
}

async function handleEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== 'message' || event.message.type !== 'text') return

  const sourceChatId = resolveSourceId(event.source)
  const result = processIncomingText(event.message.text, sourceChatId)

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: result.replyText }],
  })

  // 6. 集計結果から生成した報告用テキストを「日報グループ」へ転送する
  if (result.forwardText && reportGroupId && reportGroupId !== sourceChatId) {
    await client.pushMessage({
      to: reportGroupId,
      messages: [{ type: 'text', text: result.forwardText }],
    })
  }
}

const app = express()

app.get('/', (_req, res) => {
  res.send('BAR業務日報 LINE Bot is running.')
})

app.post('/webhook', middleware(lineConfig), (req, res) => {
  const events = (req.body?.events ?? []) as WebhookEvent[]
  Promise.all(events.map(handleEvent))
    .then(() => res.sendStatus(200))
    .catch((err: unknown) => {
      console.error('イベント処理中にエラーが発生しました:', err)
      res.sendStatus(200) // LINEにはリトライさせず200を返す。エラー内容はログで確認する
    })
})

app.listen(port, () => {
  console.log(`BAR業務日報 LINE Bot listening on port ${port}`)
})
