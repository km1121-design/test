import { DRIVER_MASTER } from './driverMaster';
import { VEHICLE_EXPENSE_TOTAL } from './vehicleExpense';
import { ADMIN_BASE_COST, FIXED_EXPENSE_BASE } from './constants';
import type { Driver } from '../types';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export const yamatoDrivers: Driver[] = DRIVER_MASTER.filter((d) => d.segment === 'ヤマト');
export const enterpriseDrivers: Driver[] = DRIVER_MASTER.filter((d) => d.segment === '企業配');
export const adminMembers: Driver[] = DRIVER_MASTER.filter((d) => d.segment === '全体');

export interface HalfMonthActuals {
  sales: number;
  outsource: number;
  expense: number;
  margin: number;
}

function actualsFor(drivers: Driver[]): HalfMonthActuals {
  const sales = sum(drivers.map((d) => d.actualSales));
  const outsource = sum(drivers.map((d) => d.actualOutsource));
  const expense = sum(drivers.map((d) => d.actualExpense));
  return { sales, outsource, expense, margin: sales - outsource - expense };
}

export const yamatoActuals = actualsFor(yamatoDrivers);
export const enterpriseActuals = actualsFor(enterpriseDrivers);

// 半月(16日間)実績サマリー。固定費・管理者人件費は月額の半分を按分計上。
export const overallActuals = {
  sales: yamatoActuals.sales + enterpriseActuals.sales,
  outsourceCost: yamatoActuals.outsource + enterpriseActuals.outsource,
  fieldExpense: yamatoActuals.expense + enterpriseActuals.expense,
  adminCostHalf: ADMIN_BASE_COST / 2,
  fixedCostHalf: (VEHICLE_EXPENSE_TOTAL || FIXED_EXPENSE_BASE) / 2,
  get profit(): number {
    return (
      yamatoActuals.margin +
      enterpriseActuals.margin -
      this.adminCostHalf -
      this.fixedCostHalf
    );
  },
  get marginRate(): number {
    return this.sales === 0 ? 0 : this.profit / this.sales;
  },
};
