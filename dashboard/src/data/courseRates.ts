// ヤマト宅配：コース別の「会社がヤマトから受け取る単価」（円/個、売上側）
// 実データ連携（配送実績ログ）から届く生の「氏名×コース」集計に対して適用する。
// 単価はここに集約し、Apps Script側にはビジネスロジックを持ち込まない。
export interface CourseRateRule {
  keywords: string[];
  price: number;
}

export const COMPANY_RECEIVE_COURSE_RULES: CourseRateRule[] = [
  { keywords: ['上高'], price: 167 },
  { keywords: ['中央', '本町'], price: 170 },
];

// 上記に一致しないコース（南青山・北青山・東新橋・芝浦・キャピタル・プラウド 等）
export const COMPANY_RECEIVE_DEFAULT_PRICE = 163;

// ネコポス：会社がヤマトから受け取る単価（円/個、コース・委託先共通）
export const NEKOPOS_COMPANY_RECEIVE_PRICE = 50;

export function companyReceivePriceForCourse(course: string | undefined): number {
  const c = course ?? '';
  for (const rule of COMPANY_RECEIVE_COURSE_RULES) {
    if (rule.keywords.some((keyword) => c.includes(keyword))) return rule.price;
  }
  return COMPANY_RECEIVE_DEFAULT_PRICE;
}

// ドライバーへの卸値（外注費側）はドライバーごとに個別に決まり、まだ実データ未確定。
// 実数値が判明するまでの暫定値（要更新）。この値のせいでヤマト部門の粗利・外注費は
// 正確ではない点に注意。
export const DRIVER_PAYOUT_PLACEHOLDER = 153;
export const NEKOPOS_DRIVER_PAYOUT_PLACEHOLDER = 40;
