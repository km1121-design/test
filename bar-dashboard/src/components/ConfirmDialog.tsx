interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[var(--surface-2)] p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400"
          >
            実行する
          </button>
        </div>
      </div>
    </div>
  )
}
