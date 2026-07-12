/**
 * Google Drive（共有ドライブ）へのアップロード（決定H）。
 * サービスアカウントのJSONキーから JWT(RS256) を生成し、OAuth2 でアクセストークンを取得、
 * Drive API v3 でフォルダ（伝票/YYYY/MM/DD）を作成しつつファイルをアップロードする。
 *
 * WebCrypto を使うため Node（18+）・Cloudflare Workers の両方で動作する。
 * 認証情報（GOOGLE_SERVICE_ACCOUNT_KEY / GDRIVE_ROOT_FOLDER_ID）が無い環境では
 * 呼ばれない（storage.ts がモックにフォールバックする）。この実装は認証情報が
 * 揃った本番でのみ経路に入る。
 */

interface ServiceAccount {
  client_email: string
  private_key: string
}

function base64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function getAccessToken(sa: ServiceAccount, nowSec: number): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
    }),
  )
  const signingInput = `${header}.${claim}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${base64url(sig)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  })
  if (!res.ok) throw new Error(`Google OAuth ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { access_token: string }
  return json.access_token
}

/** 親フォルダ配下に name のフォルダを取得 or 作成し、そのIDを返す */
async function ensureFolder(token: string, parentId: string, name: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  )
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { authorization: `Bearer ${token}` } },
  )
  const listed = (await listRes.json()) as { files?: { id: string }[] }
  if (listed.files && listed.files.length) return listed.files[0].id

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  })
  const created = (await createRes.json()) as { id: string }
  return created.id
}

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
}

export async function uploadToDrive(opts: {
  serviceAccountJson: string
  rootFolderId: string
  folderSegments: string[]
  fileName: string
  contentType: string
  bytes: Uint8Array
  nowSec: number
}): Promise<DriveUploadResult> {
  const sa = JSON.parse(opts.serviceAccountJson) as ServiceAccount
  const token = await getAccessToken(sa, opts.nowSec)

  let parent = opts.rootFolderId
  for (const seg of opts.folderSegments) parent = await ensureFolder(token, parent, seg)

  const boundary = 'bar-app-' + base64url(String(opts.nowSec))
  const meta = JSON.stringify({ name: opts.fileName, parents: [parent] })
  const enc = new TextEncoder()
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${opts.contentType}\r\n\r\n`,
  )
  const post = enc.encode(`\r\n--${boundary}--`)
  const body = new Uint8Array(pre.length + opts.bytes.length + post.length)
  body.set(pre, 0)
  body.set(opts.bytes, pre.length)
  body.set(post, pre.length + opts.bytes.length)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/related; boundary=${boundary}` },
      body,
    },
  )
  if (!res.ok) throw new Error(`Drive upload ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { id: string; webViewLink?: string }
  return { fileId: json.id, webViewLink: json.webViewLink ?? `https://drive.google.com/file/d/${json.id}/view` }
}
