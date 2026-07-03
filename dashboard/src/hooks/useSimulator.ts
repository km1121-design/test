import { useMemo, useState, useCallback } from 'react';
import {
  OPERATING_DAYS,
  COMPANY_UNIT_PRICE,
  DRIVER_UNIT_PRICE,
  ENTERPRISE_BASE_SALES,
  ADMIN_BASE_COST,
  FIXED_EXPENSE_BASE,
  MONTHLY_PROFIT_GOAL,
  YAMATO_CURRENT_DRIVER_COUNT,
  YAMATO_CURRENT_AVG_PACKAGES,
} from '../data/constants';
import type { SimulatorInputs, SimulatorResult } from '../types';

export const DEFAULT_SIMULATOR_INPUTS: SimulatorInputs = {
  yamatoDriverCount: YAMATO_CURRENT_DRIVER_COUNT,
  packagesPerDriverPerDay: YAMATO_CURRENT_AVG_PACKAGES,
  enterpriseFeeRate: 0.24,
  adminCostReductionRate: 0,
  fixedCostReduction: 0,
};

export const SIMULATOR_RANGES = {
  yamatoDriverCount: { min: 11, max: 30, step: 1 },
  packagesPerDriverPerDay: { min: 80, max: 160, step: 1 },
  enterpriseFeeRate: { min: 0.10, max: 0.40, step: 0.005 },
  adminCostReductionRate: { min: 0, max: 0.5, step: 0.05 },
  fixedCostReduction: { min: 0, max: 400_000, step: 10_000 },
} as const;

function computeSimulation(inputs: SimulatorInputs): SimulatorResult {
  const { yamatoDriverCount: D, packagesPerDriverPerDay: B, enterpriseFeeRate, adminCostReductionRate, fixedCostReduction } = inputs;

  // 4.1 ヤマト宅配部門
  const yamatoSales = D * B * COMPANY_UNIT_PRICE * OPERATING_DAYS;
  const yamatoOutsource = D * B * DRIVER_UNIT_PRICE * OPERATING_DAYS;
  const yamatoMargin = yamatoSales - yamatoOutsource;

  // 4.2 企業配部門
  const enterpriseProfit = ENTERPRISE_BASE_SALES * enterpriseFeeRate;

  // 4.3 管理者人件費
  const adminCost = ADMIN_BASE_COST * (1 - adminCostReductionRate);

  // 4.4 固定諸経費
  const fixedCost = FIXED_EXPENSE_BASE - fixedCostReduction;

  // 4.5 最終経常損益
  const netProfit = yamatoMargin + enterpriseProfit - adminCost - fixedCost;

  const goal = MONTHLY_PROFIT_GOAL;
  const gapToGoal = goal - netProfit;
  const progressPct = Math.max(0, Math.min(100, (netProfit / goal) * 100));

  // あと何名ドライバーを増やせば黒字化目標を達成できるか（他の変数は現状維持）
  const marginPerPackage = COMPANY_UNIT_PRICE - DRIVER_UNIT_PRICE;
  const denom = B * OPERATING_DAYS * marginPerPackage;
  const requiredYamatoMargin = goal - enterpriseProfit + adminCost + fixedCost;
  const driversNeededForGoal = denom > 0 ? Math.max(0, Math.ceil(requiredYamatoMargin / denom)) : D;
  const additionalDriversNeeded = Math.max(0, driversNeededForGoal - D);

  return {
    ...inputs,
    yamatoSales,
    yamatoOutsource,
    yamatoMargin,
    enterpriseProfit,
    adminCost,
    fixedCost,
    netProfit,
    goal,
    gapToGoal,
    progressPct,
    driversNeededForGoal,
    additionalDriversNeeded,
  };
}

export function useSimulator(initial: SimulatorInputs = DEFAULT_SIMULATOR_INPUTS) {
  const [inputs, setInputs] = useState<SimulatorInputs>(initial);

  const update = useCallback(<K extends keyof SimulatorInputs>(key: K, value: SimulatorInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setInputs(DEFAULT_SIMULATOR_INPUTS), []);

  const result = useMemo(() => computeSimulation(inputs), [inputs]);

  return { inputs, update, reset, result };
}
