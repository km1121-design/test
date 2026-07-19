import type { AppConfig } from '../app.ts'
import { uploadToDrive } from './googleDrive.ts'

/**
 * 領収書・伝票のファイル保存（決定H・4.5節）。
 * Google の認証情報が揃っていれば共有ドライブへ、無ければモード mock で
 * 保存先URLだけを組み立てて返す（この環境での検証用）。
 * いずれもファイル名は「日付_部門_報告者_種別NN.ext」、フォルダは 伝票/YYYY/MM/DD。
 */
export interface SaveReceiptInput {
  date: string // YYYY-MM-DD
  department: string
  reporterName: string
  kind: string // 例: 領収書 / 伝票
  seq: number
  contentType: string
  bytesBase64: string
}

export interface SaveReceiptResult {
  fileName: string
  url: string
  mock: boolean
}

function extFromContentType(ct: string): string {
  if (ct.includes('png')) return 'png'
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg'
  if (ct.includes('pdf')) return 'pdf'
  if (ct.includes('webp')) return 'webp'
  return 'bin'
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

export async function saveReceipt(config: AppConfig, input: SaveReceiptInput, now: number): Promise<SaveReceiptResult> {
  const [y, m, d] = input.date.split('-')
  const ext = extFromContentType(input.contentType)
  const seq = String(input.seq).padStart(2, '0')
  const fileName = `${input.date}_${input.department}_${input.reporterName}_${input.kind}${seq}.${ext}`
  const folderSegments = ['伝票', y, m, d]

  if (config.googleServiceAccountJson && config.gdriveRootFolderId) {
    const res = await uploadToDrive({
      serviceAccountJson: config.googleServiceAccountJson,
      rootFolderId: config.gdriveRootFolderId,
      folderSegments,
      fileName,
      contentType: input.contentType,
      bytes: decodeBase64(input.bytesBase64),
      nowSec: Math.floor(now / 1000),
    })
    return { fileName, url: res.webViewLink, mock: false }
  }

  // モック: 実際のアップロードは行わず、命名規約に沿った保存先パスを返す。
  return { fileName, url: `mock-drive://${folderSegments.join('/')}/${fileName}`, mock: true }
}
