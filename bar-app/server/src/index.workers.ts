import { createApp, type AppConfig } from './app.ts'
import { D1Db } from './db/d1.ts'
import { runDailyDelivery } from './lib/delivery.ts'

/**
 * Cloudflare Workers エントリ（本番）。
 * - fetch: HTTP リクエスト処理（D1バインディング env.DB）
 * - scheduled: Cron Trigger（22:00 JST = 13:00 UTC）で日次サマリー＋スタッフ日報まとめを配信
 * ローカルは index.node.ts（better-sqlite3）を使う。
 */
interface WorkerEnv {
  DB: ConstructorParameters<typeof D1Db>[0]
  LINE_CHANNEL_ACCESS_TOKEN?: string
  CRON_SECRET?: string
  GOOGLE_SERVICE_ACCOUNT_KEY?: string
  GDRIVE_ROOT_FOLDER_ID?: string
}

function configOf(env: WorkerEnv): AppConfig {
  return {
    lineToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    cronSecret: env.CRON_SECRET,
    googleServiceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_KEY,
    gdriveRootFolderId: env.GDRIVE_ROOT_FOLDER_ID,
  }
}

export default {
  fetch(request: Request, env: WorkerEnv): Response | Promise<Response> {
    const app = createApp(() => new D1Db(env.DB), () => configOf(env))
    return app.fetch(request)
  },

  // Cron Trigger（wrangler.toml の [triggers] crons）から呼ばれる
  async scheduled(_event: unknown, env: WorkerEnv): Promise<void> {
    await runDailyDelivery(new D1Db(env.DB), configOf(env), undefined, Date.now())
  },
}
