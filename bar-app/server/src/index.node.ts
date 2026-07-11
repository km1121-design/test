import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { getDb } from './db/sqlite.node.ts'

const port = Number(process.env.PORT ?? 8787)
const app = createApp(() => getDb())

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`bar-app server listening on http://localhost:${info.port}`)
})
