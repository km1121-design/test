export function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(8, 10))
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  return `${y}年${Number(m)}月`
}

export function listRecentMonthKeys(count: number): string[] {
  const base = new Date()
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export function formatCurrency(amount: number): string {
  return `¥${Math.round(amount).toLocaleString('ja-JP')}`
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}
