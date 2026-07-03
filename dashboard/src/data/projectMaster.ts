import type { Project } from '../types';

// PROJECT_MASTER — 企業配案件マスタ
export const PROJECT_MASTER: Project[] = [
  { id: 'PRJ-01', name: '吉祥寺', basePrice: 10_000, feeRate: 0.30, detail: '青果配送', expenseBearer: 'ドライバー負担' },
  { id: 'PRJ-02', name: '立川', basePrice: 10_000, feeRate: 0.20, detail: '青果配送', expenseBearer: 'ドライバー負担' },
  { id: 'PRJ-03', name: '豊洲', basePrice: 17_143, feeRate: 0.15, detail: '鮮魚配送', expenseBearer: 'ドライバー負担' },
  { id: 'PRJ-04', name: 'たいやき', basePrice: 30_000, feeRate: 0.3333, detail: '澤田様案件', expenseBearer: 'ドライバー負担' },
  { id: 'PRJ-05', name: '日比谷', basePrice: 15_500, feeRate: 0.1935, detail: '火木青果配送', expenseBearer: '経費会社持ち' },
  { id: 'PRJ-06', name: '東武', basePrice: 12_500, feeRate: 0.20, detail: '月金青果配送', expenseBearer: '経費会社持ち' },
];
