// ヤマト宅配：コース別のドライバー支払単価（円/個）
// 実データ連携（配送実績ログ）から届く生の「氏名×コース」集計に対して適用する。
// 単価はここに集約し、Apps Script側にはビジネスロジックを持ち込まない。
export interface CourseRateRule {
  keywords: string[];
  price: number;
}

export const COURSE_PRICE_RULES: CourseRateRule[] = [
  { keywords: ['上高'], price: 167 },
  { keywords: ['中央', '本町'], price: 170 },
];

// 上記に一致しないコース（南青山・北青山・東新橋・芝浦・キャピタル・プラウド 等）
export const DEFAULT_COURSE_PRICE = 163;

// ネコポス単価（円/個、コース・委託先共通）
export const NEKOPOS_PRICE = 50;

export function priceForCourse(course: string | undefined): number {
  const c = course ?? '';
  for (const rule of COURSE_PRICE_RULES) {
    if (rule.keywords.some((keyword) => c.includes(keyword))) return rule.price;
  }
  return DEFAULT_COURSE_PRICE;
}
