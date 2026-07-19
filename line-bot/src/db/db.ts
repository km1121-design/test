import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function ensureParentDir(path: string): void {
  const dir = dirname(path)
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })
}

let instance: Database.Database | null = null

export function getDb(): Database.Database {
  if (instance) return instance

  const dbPath = process.env.DB_PATH ?? './data/bar-line-bot.sqlite3'
  ensureParentDir(dbPath)

  instance = new Database(dbPath)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  instance.exec(schema)

  return instance
}
