import {
  companyReceivePriceForCourse,
  NEKOPOS_COMPANY_RECEIVE_PRICE,
  DRIVER_PAYOUT_PLACEHOLDER,
  NEKOPOS_DRIVER_PAYOUT_PLACEHOLDER,
} from './courseRates';
import type { Driver } from '../types';

export interface RawCourseAggregate {
  name: string;
  course: string;
  partner: string;
  totalCompleted: number;
  totalNekopos: number;
  reportDays: number;
}

export interface LiveYamatoResponse {
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  rows: RawCourseAggregate[];
  error?: string;
}

interface Accumulator {
  id: string;
  name: string;
  subSegment: string;
  totalCompleted: number;
  actualSales: number;
  actualOutsource: number;
  courses: Set<string>;
}

/**
 * Apps Script APIが返す「氏名×コース」の生集計を、ダッシュボードが表示する
 * Driver[] 形状に変換する。
 *
 * 売上側（actualSales）はコース別の「会社受取単価」が判明しているため正確に計算できる。
 * 外注費側（actualOutsource）はドライバーごとの卸値がまだ未確定のため、暫定の
 * 一律単価（DRIVER_PAYOUT_PLACEHOLDER）で計算した概算値。実データが判明次第、
 * courseRates.ts の値を更新すること。
 */
export function transformToDrivers(response: LiveYamatoResponse): Driver[] {
  const byName = new Map<string, Accumulator>();

  response.rows.forEach((row, index) => {
    const sales = row.totalCompleted * companyReceivePriceForCourse(row.course) + row.totalNekopos * NEKOPOS_COMPANY_RECEIVE_PRICE;
    const outsource = row.totalCompleted * DRIVER_PAYOUT_PLACEHOLDER + row.totalNekopos * NEKOPOS_DRIVER_PAYOUT_PLACEHOLDER;

    const existing = byName.get(row.name);
    if (existing) {
      existing.totalCompleted += row.totalCompleted;
      existing.actualOutsource += outsource;
      existing.actualSales += sales;
      existing.courses.add(row.course);
      if (row.partner) existing.subSegment = row.partner;
    } else {
      byName.set(row.name, {
        id: `LIVE-${index}-${row.name}`,
        name: row.name,
        subSegment: row.partner,
        totalCompleted: row.totalCompleted,
        actualSales: sales,
        actualOutsource: outsource,
        courses: new Set([row.course]),
      });
    }
  });

  return Array.from(byName.values()).map((entry) => ({
    id: entry.id,
    name: entry.name,
    role: '—',
    unitPrice: entry.totalCompleted > 0 ? Math.round(entry.actualOutsource / entry.totalCompleted) : 0,
    area: Array.from(entry.courses).join('・'),
    type: 'フルコミ',
    baseSalary: 0,
    actualSales: entry.actualSales,
    actualOutsource: entry.actualOutsource,
    actualExpense: 0,
    segment: 'ヤマト',
    subSegment: entry.subSegment,
  }));
}
