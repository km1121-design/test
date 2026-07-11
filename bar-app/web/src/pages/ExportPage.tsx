import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Department } from '../lib/types.ts'
import { api, currentMonthKey } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useToast } from '../components/ToastProvider.tsx'
import { DepartmentToggle, MonthSelect } from '../components/Pickers.tsx'

const DATASETS = [
  { path: 'rep-reports', label: '代表日報', desc: 'BAR全体/個人売上・決済・手数料・来客・経費計・総評' },
  { path: 'staff-attribution', label: 'スタッフ別売上帰属', desc: '代表日報のスタッフ別内訳を日付×スタッフに展開' },
  { path: 'staff-reports', label: 'スタッフ日報', desc: '勤怠・実働・当日売上・振り返り' },
]

export function ExportPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [department, setDepartment] = useState<Department>(user!.department)
  const [month, setMonth] = useState(currentMonthKey())

  const download = async (path: string, label: string) => {
    try {
      await api.download(
        `/api/csv/${path}?department=${encodeURIComponent(department)}&month=${month}`,
        `${path}_${department}_${month}.csv`,
      )
      showToast(`${label} をダウンロードしました`, 'success')
    } catch (e) {
      showToast((e as Error).message, 'warning')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DepartmentToggle value={department} onChange={setDepartment} />
        <MonthSelect value={month} onChange={setMonth} />
      </div>
      <p className="text-xs text-[var(--muted)]">
        他の経営分析ツール（スプレッドシート・BIツール等）へ読み込めるCSV（UTF-8 BOM付き）で出力します。
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DATASETS.map((d) => (
          <div key={d.path} className="flex flex-col justify-between rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
            <div>
              <div className="text-sm font-bold text-white">{d.label}</div>
              <p className="mt-1 text-xs text-[var(--muted)]">{d.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => download(d.path, d.label)}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-sm font-bold text-black hover:bg-amber-400"
            >
              <Download className="h-4 w-4" />
              CSVダウンロード
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
