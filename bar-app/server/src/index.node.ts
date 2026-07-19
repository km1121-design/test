import { serve } from '@hono/node-server'
import { createApp, type AppConfig } from './app.ts'
import { getDb } from './db/sqlite.node.ts'

const port = Number(process.env.PORT ?? 8787)

const config: AppConfig = {
  lineToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || undefined,
  cronSecret: process.env.CRON_SECRET || undefined,
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || undefined,
  gdriveRootFolderId: process.env.GDRIVE_ROOT_FOLDER_ID || undefined,
  liffChannelId: process.env.LIFF_CHANNEL_ID || undefined,
}

const app = createApp(() => getDb(), () => config)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`bar-app server listening on http://localhost:${info.port}`)
  console.log(`LINE配信モード: ${config.lineToken ? '実push' : 'モック（outbox記録のみ）'}`)
})
