import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Db } from './driver.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** better-sqlite3（同期）を非同期Dbインターフェースにラップする（ローカル・この環境用） */
class SqliteDb implements Db {
  constructor(private readonly raw: Database.Database) {}

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.raw.prepare(sql).all(...params) as T[]
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.raw.prepare(sql).get(...params) as T | undefined
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    this.raw.prepare(sql).run(...params)
  }

  async exec(sql: string): Promise<void> {
    this.raw.exec(sql)
  }
}

let instance: Db | null = null

export function getDb(): Db {
  if (instance) return instance

  const dbPath = process.env.DB_PATH ?? join(__dirname, '../../data/bar-app.sqlite3')
  const dir = dirname(dbPath)
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })

  const raw = new Database(dbPath)
  raw.pragma('journal_mode = WAL')
  raw.pragma('foreign_keys = ON')

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  raw.exec(schema)

  instance = new SqliteDb(raw)
  return instance
}
