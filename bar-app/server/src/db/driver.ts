/**
 * 非同期のDBドライバ抽象。Cloudflare D1 と better-sqlite3 の両方をこの形に合わせる。
 * SQLはポジショナルプレースホルダ ? で書く（D1・better-sqlite3ともに対応）。
 * これにより本番（D1）とローカル（better-sqlite3）でリポジトリ層を共有できる。
 */
export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>
  run(sql: string, params?: unknown[]): Promise<void>
  /** 複数文をまとめて実行（スキーマ適用用） */
  exec(sql: string): Promise<void>
}
