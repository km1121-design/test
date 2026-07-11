import { createApp } from './app.ts'
import { D1Db } from './db/d1.ts'

/**
 * Cloudflare Workers エントリ（本番）。
 * env.DB（wrangler.toml で D1 バインディング）を Db 実装に包んで createApp に渡す。
 * ローカルは index.node.ts（better-sqlite3）を使う。
 */
interface WorkerEnv {
  DB: ConstructorParameters<typeof D1Db>[0]
}

export default {
  fetch(request: Request, env: WorkerEnv): Response | Promise<Response> {
    const app = createApp(() => new D1Db(env.DB))
    return app.fetch(request)
  },
}
