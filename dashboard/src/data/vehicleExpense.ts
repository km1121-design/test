import type { VehicleExpenseItem } from '../types';

// VEHICLE_EXPENSE_DETAIL — 固定諸経費マスタ
export const VEHICLE_EXPENSE_DETAIL: VehicleExpenseItem[] = [
  { id: 'EXP-01', name: 'ラフタスリース', amount: 200_000, category: '固定車両費', note: '4台分のリース代' },
  { id: 'EXP-02', name: '社用車維持費', amount: 272_980, category: '固定車両費', note: '6台分（購入分割分）' },
  { id: 'EXP-03', name: '車両保険', amount: 124_247, category: '固定経費', note: '9台分' },
  { id: 'EXP-04', name: '車検・一般修理', amount: 122_373, category: '変動・突発', note: '突発的な車両修理代など' },
  { id: 'EXP-05', name: '採用広告ランニング費', amount: 133_000, category: '広告経費', note: 'Indeed（10万）、バイトル（3.3万）' },
  { id: 'EXP-06', name: 'リース完済戻り', amount: -81_562, category: '控除項目', note: 'CASH IN 2台分による相殺戻り' },
];

export const VEHICLE_EXPENSE_TOTAL = VEHICLE_EXPENSE_DETAIL.reduce((sum, item) => sum + item.amount, 0);
