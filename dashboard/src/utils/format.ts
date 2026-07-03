export function formatYen(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '-' : ''}¥${Math.abs(rounded).toLocaleString('ja-JP')}`;
}

export function formatManYen(value: number): string {
  const man = value / 10_000;
  return `${man.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万円`;
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('ja-JP');
}
