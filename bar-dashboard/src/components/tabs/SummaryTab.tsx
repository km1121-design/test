import { Fragment } from 'react'
import { formatCurrency, formatMonthLabel, listRecentMonthKeys } from '../../lib/dateUtils'
import { laborCostCumulative, monthlyCumulativeSales, monthlyExpenseCumulative, monthlyProfit } from '../../lib/calculations'
import { useAppData } from '../../context/AppDataContext'
import type { Department } from '../../types'

const DEPARTMENTS: Department[] = ['1部', '2部']

interface DeptFigures {
  sales: number
  expense: number
  profit: number
}

function figuresFor(data: ReturnType<typeof useAppData>['data'], dept: Department, month: string): DeptFigures {
  return {
    sales: monthlyCumulativeSales(data.repReports, dept, month),
    expense:
      monthlyExpenseCumulative(data.repReports, dept, month) + laborCostCumulative(data.staffReports, data.staff, data.rates, dept, month),
    profit: monthlyProfit(data.repReports, data.staffReports, data.staff, data.rates, dept, month),
  }
}

export function SummaryTab() {
  const { data } = useAppData()
  const months = listRecentMonthKeys(6).reverse()
  const currentYear = new Date().getFullYear()
  const yearMonths = listRecentMonthKeys(12).filter((m) => m.startsWith(String(currentYear)))

  const rows = months.map((month) => {
    const byDept: Record<Department, DeptFigures> = {
      '1部': figuresFor(data, '1部', month),
      '2部': figuresFor(data, '2部', month),
    }
    return { month, byDept }
  })

  const yearlyTotals: Record<Department, DeptFigures> = {
    '1部': yearMonths.reduce(
      (acc, month) => {
        const f = figuresFor(data, '1部', month)
        return { sales: acc.sales + f.sales, expense: acc.expense + f.expense, profit: acc.profit + f.profit }
      },
      { sales: 0, expense: 0, profit: 0 },
    ),
    '2部': yearMonths.reduce(
      (acc, month) => {
        const f = figuresFor(data, '2部', month)
        return { sales: acc.sales + f.sales, expense: acc.expense + f.expense, profit: acc.profit + f.profit }
      },
      { sales: 0, expense: 0, profit: 0 },
    ),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)] uppercase">
            <tr>
              <th className="px-4 py-3 text-left">月</th>
              {DEPARTMENTS.map((dept) => (
                <th key={dept} colSpan={3} className="px-4 py-3 text-left">
                  {dept}
                </th>
              ))}
            </tr>
            <tr>
              <th className="px-4 py-2 text-left"></th>
              {DEPARTMENTS.map((dept) => (
                <Fragment key={dept}>
                  <th className="px-4 py-2 text-right font-normal">売上</th>
                  <th className="px-4 py-2 text-right font-normal">経費</th>
                  <th className="px-4 py-2 text-right font-normal">利益</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(({ month, byDept }) => (
              <tr key={month} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2 font-medium text-white">{formatMonthLabel(month)}</td>
                {DEPARTMENTS.map((dept) => (
                  <Fragment key={dept}>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(byDept[dept].sales)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(byDept[dept].expense)}</td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${byDept[dept].profit >= 0 ? 'text-[var(--status-good)]' : 'text-[var(--status-critical)]'}`}
                    >
                      {formatCurrency(byDept[dept].profit)}
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold text-white">{currentYear}年 年間合計</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEPARTMENTS.map((dept) => (
            <div key={dept} className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
              <div className="text-sm font-bold text-white">{dept}</div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-[var(--muted)]">売上</dt>
                  <dd className="tabular-nums text-white">{formatCurrency(yearlyTotals[dept].sales)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">経費</dt>
                  <dd className="tabular-nums text-white">{formatCurrency(yearlyTotals[dept].expense)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">利益</dt>
                  <dd className={`tabular-nums ${yearlyTotals[dept].profit >= 0 ? 'text-[var(--status-good)]' : 'text-[var(--status-critical)]'}`}>
                    {formatCurrency(yearlyTotals[dept].profit)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
