import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppData, DailyReportRep, DailyReportStaff, DepartmentGoal, RateMaster, StaffMember } from '../types'
import { loadAppData, saveAppData } from '../lib/storage'
import { buildSeedAppData } from '../data/seedData'

interface AppDataContextValue {
  data: AppData
  upsertRepReport: (report: DailyReportRep) => void
  upsertStaffReport: (report: DailyReportStaff) => void
  updateStaff: (staff: StaffMember[]) => void
  updateDepartmentGoals: (goals: DepartmentGoal[]) => void
  updateRates: (rates: RateMaster) => void
  resetToSeedData: () => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData() ?? buildSeedAppData())

  useEffect(() => {
    saveAppData(data)
  }, [data])

  // 3.7 データ修正ルール: 同一キー（日付＋部門＋報告者 / 日付＋スタッフ）は上書き保存する
  const upsertRepReport = useCallback((newReport: DailyReportRep) => {
    setData((prev) => {
      const key = (r: DailyReportRep) => `${r.date}|${r.department}|${r.reporterName}`
      const filtered = prev.repReports.filter((r) => key(r) !== key(newReport))
      return { ...prev, repReports: [...filtered, newReport] }
    })
  }, [])

  const upsertStaffReport = useCallback((newReport: DailyReportStaff) => {
    setData((prev) => {
      const key = (r: DailyReportStaff) => `${r.date}|${r.staffId}`
      const filtered = prev.staffReports.filter((r) => key(r) !== key(newReport))
      return { ...prev, staffReports: [...filtered, newReport] }
    })
  }, [])

  const updateStaff = useCallback((staff: StaffMember[]) => setData((prev) => ({ ...prev, staff })), [])
  const updateDepartmentGoals = useCallback(
    (departmentGoals: DepartmentGoal[]) => setData((prev) => ({ ...prev, departmentGoals })),
    [],
  )
  const updateRates = useCallback((rates: RateMaster) => setData((prev) => ({ ...prev, rates })), [])
  const resetToSeedData = useCallback(() => setData(buildSeedAppData()), [])

  return (
    <AppDataContext.Provider
      value={{
        data,
        upsertRepReport,
        upsertStaffReport,
        updateStaff,
        updateDepartmentGoals,
        updateRates,
        resetToSeedData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
