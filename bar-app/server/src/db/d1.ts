import type { Db } from './driver.ts'

/**
 * Cloudflare D1 用の Db 実装（本番）。
 * ローカルの better-sqlite3 実装（sqlite.node.ts）と同一インターフェースなので、
 * リポジトリ層・計算エンジン・ルートはそのまま共有できる（要件定義書 論点I）。
 *
 * D1 の型は @cloudflare/workers-types に含まれるが、依存を増やさないため最小限の
 * 構造的型で受ける。
 */
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<unknown>
}
interface D1Database {
  prepare(query: string): D1PreparedStatement
  exec(query: string): Promise<unknown>
}

export class D1Db implements Db {
  constructor(private readonly d1: D1Database) {}

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = params.length ? this.d1.prepare(sql).bind(...params) : this.d1.prepare(sql)
    const { results } = await stmt.all<T>()
    return results
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const stmt = params.length ? this.d1.prepare(sql).bind(...params) : this.d1.prepare(sql)
    return (await stmt.first<T>()) ?? undefined
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    const stmt = params.length ? this.d1.prepare(sql).bind(...params) : this.d1.prepare(sql)
    await stmt.run()
  }

  async exec(sql: string): Promise<void> {
    // D1.exec は単一文向け。スキーマ適用は wrangler の migrations で行うため、
    // ここでは呼ばれない想定（スキーマはデプロイ時に schema.sql を流し込む）。
    await this.d1.exec(sql)
  }
}
