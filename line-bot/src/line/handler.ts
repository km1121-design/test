import { detectReportKind, parseRepReport, parseStaffReport } from './parser.js'
import { HELP_TEXT, REP_TEMPLATE, STAFF_TEMPLATE } from './templates.js'
import { upsertRepReport, upsertStaffReport } from '../db/repository.js'
import { generateRepReportText, generateStaffReportText } from '../lib/reportText.js'
import { hasBreakdownMismatch } from '../lib/calculations.js'

export interface ProcessResult {
  replyText: string
  /** 日報が正常に記録された場合のみセットされる。日報グループへの転送に使う */
  forwardText?: string
}

/**
 * 2. 運用フロー: LINEで受け取ったテキストを解析し、日報として記録・計算した上で
 * 「報告用」テキストを組み立てる。Webhookハンドラとローカル検証用CLIの両方から呼ばれる。
 */
export function processIncomingText(text: string, sourceChatId?: string): ProcessResult {
  const kind = detectReportKind(text)

  if (kind === null) {
    return {
      replyText: '認識できないメッセージです。「ヘルプ」「テンプレ 代表」「テンプレ スタッフ」のいずれかを送信してください。',
    }
  }

  if (kind === 'ヘルプ') return { replyText: HELP_TEXT }
  if (kind === 'テンプレ代表') return { replyText: REP_TEMPLATE }
  if (kind === 'テンプレスタッフ') return { replyText: STAFF_TEMPLATE }

  if (kind === '代表日報') {
    const result = parseRepReport(text, sourceChatId)
    if (!result.ok) return { replyText: `⚠️ ${result.error}` }

    const { applied } = upsertRepReport(result.report)
    if (!applied) {
      return { replyText: '⚠️ この日報より新しい送信がすでに記録されているため、今回の内容は反映されませんでした。' }
    }

    const warning = hasBreakdownMismatch(result.report)
      ? '\n\n⚠️ 内訳（スタッフ+イベント+本部）の合計が、決済方法別合計（現金+クレカ+電子マネー+QR）と一致していません。ご確認ください。'
      : ''
    const reportText = generateRepReportText(result.report) + warning
    return { replyText: reportText, forwardText: reportText }
  }

  // kind === 'スタッフ日報'
  const result = parseStaffReport(text, sourceChatId)
  if (!result.ok) return { replyText: `⚠️ ${result.error}` }

  const { applied } = upsertStaffReport(result.report)
  if (!applied) {
    return { replyText: '⚠️ この日報より新しい送信がすでに記録されているため、今回の内容は反映されませんでした。' }
  }

  const reportText = generateStaffReportText(result.report)
  return { replyText: reportText, forwardText: reportText }
}
