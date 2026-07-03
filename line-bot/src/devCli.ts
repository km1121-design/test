import { readFileSync } from 'node:fs'
import { processIncomingText } from './line/handler.js'

/**
 * LINEの実チャネルを用意しなくても、日報テキストのパース・計算・報告用テキスト生成を
 * ローカルで確認するための開発用CLI。
 *
 * 使い方:
 *   npm run cli -- path/to/report.txt
 *   npm run cli -- - < path/to/report.txt   (標準入力から読み込む場合は "-" を指定)
 */
function readInput(): string {
  const arg = process.argv[2]
  if (!arg || arg === '-') {
    return readFileSync(0, 'utf-8')
  }
  return readFileSync(arg, 'utf-8')
}

const text = readInput()
const result = processIncomingText(text, 'cli-test-chat')

console.log('--- 返信内容 -----------------------------------')
console.log(result.replyText)
if (result.forwardText) {
  console.log('\n--- 日報グループへの転送内容（REPORT_GROUP_ID設定時） ---')
  console.log(result.forwardText)
}
