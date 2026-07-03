import { useState } from 'react'
import { GlassWater, RotateCcw } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { useToast } from './ToastProvider'
import { ConfirmDialog } from './ConfirmDialog'

export function Header() {
  const { resetToSeedData } = useAppData()
  const { showToast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <header className="border-b border-white/10 bg-[var(--surface)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30">
            <GlassWater className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">BAR 業務日報・売上管理システム</h1>
            <p className="text-xs text-[var(--muted)]">日々の売上報告・勤怠管理・目標進捗を一元管理し、正しい評価と利益の見える化を行う</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          デモデータをリセット
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="デモデータをリセット"
        message="保存済みの日報データをすべて削除し、デモ用サンプルデータに戻します。よろしいですか？"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          resetToSeedData()
          setConfirmOpen(false)
          showToast('デモデータをリセットしました', 'success')
        }}
      />
    </header>
  )
}
