import { DRIVER_MASTER } from './driverMaster';
import { VEHICLE_EXPENSE_TOTAL } from './vehicleExpense';
import { ADMIN_BASE_COST, FIXED_EXPENSE_BASE } from './constants';
import type { Driver } from '../types';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

// モックデータ（実データ未接続時のフォールバック、またはヤマト以外のセグメント）
export const mockYamatoDrivers: Driver[] = DRIVER_MASTER.filter((d) => d.segment === 'ヤマト');
export const enterpriseDrivers: Driver[] = DRIVER_MASTER.filter((d) => d.segment === '企業配');
export const adminMembers: Driver[] = DRIVER_MASTER.filter((d) => d.segment === '全体');

export interface HalfMonthActuals {
  sales: number;
  outsource: number;
  expense: number;
  margin: number;
}

export function computeActuals(drivers: Driver[]): HalfMonthActuals {
  const sales = sum(drivers.map((d) => d.actualSales));
  const outsource = sum(drivers.map((d) => d.actualOutsource));
  const expense = sum(drivers.map((d) => d.actualExpense));
  return { sales, outsource, expense, margin: sales - outsource - expense };
}

export const enterpriseActuals = computeActuals(enterpriseDrivers);

export interface OverallActuals {
  sales: number;
  outsourceCost: number;
  fieldExpense: number;
  adminCostHalf: number;
  fixedCostHalf: number;
  profit: number;
  marginRate: number;
}

// 半月(16日間)実績サマリー。固定費・管理者人件費は月額の半分を按分計上。
// ヤマト部門は実データ連携時に差し替わるため、引数として受け取る。
export function computeOverallActuals(yamatoActuals: HalfMonthActuals): OverallActuals {
  const sales = yamatoActuals.sales + enterpriseActuals.sales;
  const adminCostHalf = ADMIN_BASE_COST / 2;
  const fixedCostHalf = (VEHICLE_EXPENSE_TOTAL || FIXED_EXPENSE_BASE) / 2;
  const profit = yamatoActuals.margin + enterpriseActuals.margin - adminCostHalf - fixedCostHalf;
  return {
    sales,
    outsourceCost: yamatoActuals.outsource + enterpriseActuals.outsource,
    fieldExpense: yamatoActuals.expense + enterpriseActuals.expense,
    adminCostHalf,
    fixedCostHalf,
    profit,
    marginRate: sales === 0 ? 0 : profit / sales,
  };
}
