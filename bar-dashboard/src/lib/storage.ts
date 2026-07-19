import type { AppData } from '../types'

const STORAGE_KEY = 'bar-dashboard:v1'

export function loadAppData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppData
  } catch {
    return null
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage が使用できない環境（プライベートモード等）では保存をスキップする
  }
}
