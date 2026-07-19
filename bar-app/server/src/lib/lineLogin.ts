/**
 * LINEログイン（LIFF）の ID トークン検証（STEP 6）。
 * フロントの LIFF SDK が取得した ID トークンを、LINE の verify エンドポイントで検証し、
 * ペイロード（sub = LINEユーザーID, name, picture）を得る。
 * fetch を使うため Node・Cloudflare Workers の両方で動作する。
 *
 * channelId（LINEログインチャネルのチャネルID）は verify の client_id として必須。
 * 未設定の環境では検証を行わない（モックログインのみ動作）。
 */
export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

const VERIFY_ENDPOINT = 'https://api.line.me/oauth2/v2.1/verify'

export async function verifyLiffIdToken(idToken: string, channelId: string): Promise<LiffProfile> {
  const res = await fetch(VERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `id_token=${encodeURIComponent(idToken)}&client_id=${encodeURIComponent(channelId)}`,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`IDトークン検証に失敗しました (${res.status}): ${detail.slice(0, 200)}`)
  }
  const payload = (await res.json()) as { sub?: string; name?: string; picture?: string; aud?: string }
  if (!payload.sub) throw new Error('IDトークンにユーザーID(sub)が含まれていません。')
  // aud（チャネルID）一致の追加検証（verifyは既にclient_idで検証済みだが念のため）
  if (payload.aud && payload.aud !== channelId) throw new Error('IDトークンのチャネルが一致しません。')
  return { userId: payload.sub, displayName: payload.name ?? '', pictureUrl: payload.picture }
}
