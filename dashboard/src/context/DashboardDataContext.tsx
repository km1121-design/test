import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useYamatoDrivers } from '../hooks/useYamatoDrivers';
import { computeActuals, computeOverallActuals, enterpriseActuals, enterpriseDrivers } from '../data/aggregates';
import type { HalfMonthActuals, OverallActuals } from '../data/aggregates';
import type { LiveDataMeta, LiveDataStatus } from '../hooks/useLiveYamatoData';
import type { Driver } from '../types';

interface DashboardData {
  yamatoDrivers: Driver[];
  yamatoActuals: HalfMonthActuals;
  enterpriseDrivers: Driver[];
  enterpriseActuals: HalfMonthActuals;
  overallActuals: OverallActuals;
  isYamatoLive: boolean;
  liveStatus: LiveDataStatus;
  liveMeta: LiveDataMeta | null;
  liveError: string | null;
}

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { drivers, isLive, status, meta, error } = useYamatoDrivers();

  const value = useMemo<DashboardData>(() => {
    const yamatoActuals = computeActuals(drivers);
    const overallActuals = computeOverallActuals(yamatoActuals);
    return {
      yamatoDrivers: drivers,
      yamatoActuals,
      enterpriseDrivers,
      enterpriseActuals,
      overallActuals,
      isYamatoLive: isLive,
      liveStatus: status,
      liveMeta: meta,
      liveError: error,
    };
  }, [drivers, isLive, status, meta, error]);

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardData {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider');
  return ctx;
}
