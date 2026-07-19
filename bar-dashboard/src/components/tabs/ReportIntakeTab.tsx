import { useState } from 'react'
import { Copy } from 'lucide-react'
import { RepReportForm } from '../form/RepReportForm'
import { StaffReportForm } from '../form/StaffReportForm'
import { useToast } from '../ToastProvider'
import { copyTextToClipboard } from '../../lib/clipboard'

type Mode = 'rep' | 'staff'

export function ReportIntakeTab() {
  const [mode, setMode] = useState<Mode>('rep')
  const [generatedText, setGeneratedText] = useState('')
  const { showToast } = useToast()

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-[var(--surface-2)] p-1">
          <button
            type="button"
            onClick={() => setMode('rep')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'rep' ? 'bg-amber-500 text-black' : 'text-[var(--text-secondary)] hover:bg-white/5'
            }`}
          >
            代表向け日報
          </button>
          <button
            type="button"
            onClick={() => setMode('staff')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'staff' ? 'bg-amber-500 text-black' : 'text-[var(--text-secondary)] hover:bg-white/5'
            }`}
          >
            スタッフ向け日報
          </button>
        </div>

        {mode === 'rep' ? <RepReportForm onGenerated={setGeneratedText} /> : <StaffReportForm onGenerated={setGeneratedText} />}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-white/10 bg-[var(--surface-2)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">報告用テキスト（LINE転送プレビュー）</h2>
            {generatedText && (
              <button
                type="button"
                onClick={async () => {
                  await copyTextToClipboard(generatedText)
                  showToast('クリップボードにコピーしました', 'success')
                }}
                className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-white/5"
              >
                <Copy className="h-3.5 w-3.5" />
                コピー
              </button>
            )}
          </div>
          {generatedText ? (
            <pre className="mt-3 max-h-[70vh] overflow-auto rounded-md bg-black/40 p-3 text-xs whitespace-pre-wrap text-[var(--text-secondary)]">
              {generatedText}
            </pre>
          ) : (
            <p className="mt-3 text-xs text-[var(--muted)]">
              日報を送信すると、★自動計算項目を含む「報告用」テキストがここに表示されます。日報LINEグループへの転送を想定しています。
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
