import { priceForCourse, NEKOPOS_PRICE } from './courseRates';
import { COMPANY_RECEIVE_PRICE_PLACEHOLDER } from './liveConfig';
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
 * Driver[] 形状に変換する。単価判定（コース別）はここで一括して行う。
 */
export function transformToDrivers(response: LiveYamatoResponse): Driver[] {
  const byName = new Map<string, Accumulator>();

  response.rows.forEach((row, index) => {
    const driverPrice = priceForCourse(row.course);
    const outsource = row.totalCompleted * driverPrice + row.totalNekopos * NEKOPOS_PRICE;
    const sales = row.totalCompleted * COMPANY_RECEIVE_PRICE_PLACEHOLDER;

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
