# 本番稼働までの手順（GO-LIVE ガイド）

Phase 1〜3 の実装は完了しています。ここでは**実運用を開始するために必要な外部設定と
デプロイ手順**を、順番にまとめます。コードの追加実装が必要なのは STEP 6（LIFF）のみで、
それ以外は「アカウント作成・設定・デプロイ」の作業です。

所要時間の目安：STEP 1〜5 で半日〜1日、STEP 6 は +30分程度（設定のみ・コーディング不要）。

---

## 全体像

```
① Cloudflare       … アプリ本体（API=Workers / DB=D1 / 画面=Pages / 定時実行=Cron）を無料枠で公開
② LINE Developers  … 公式アカウント（配信）＋ LINEログイン（本人認証）
③ Google Cloud     … サービスアカウント（領収書写真を共有ドライブへ保存）
④ 初期データ投入・動作確認
⑤ LINEグループ設定（配信先）
⑥ LIFFログイン有効化（設定のみ・実装済み）
```

各連携は「未設定ならモック動作」なので、**①だけ済ませればまず社内で使い始められます**。
LINE配信は②⑤、写真保存は③、スマホからのLINEログインは⑥まで進めると有効になります。
**全機能（LIFFログイン含む）は実装済みで、追加のコーディングは不要です**。

---

## STEP 1. Cloudflare にデプロイ（これだけで社内利用は開始可能）

### 1-1. 準備
1. Cloudflare の無料アカウントを作成。
2. ローカルPCに Node.js 18+ を用意し、`npm i -g wrangler` → `wrangler login`。

### 1-2. API（Workers + D1）
```bash
cd bar-app/server
npm install
wrangler d1 create bar-app
#  → 出力される database_id を wrangler.toml の
#     [[d1_databases]] database_id = "..." に貼り付ける
wrangler d1 execute bar-app --remote --file=src/db/schema.sql   # テーブル作成
wrangler deploy                                                 # Workers 公開
#  → https://bar-app-api.<account>.workers.dev が払い出される（このURLを控える）
```

### 1-3. 初期マスターデータ投入（本番D1）
`src/db/seed.ts` はローカルSQLite用です。本番D1へは同じ内容をSQLで流し込みます。
`wrangler d1 execute bar-app --remote --command "..."` で、スタッフ・部門目標・
レート・配信設定を1回だけ投入してください（値は自社の実態に合わせる）。
※ マスター管理画面から後で編集できるので、最小限（代表2名＋レート＋当月目標）で可。

### 1-4. フロント（Pages）
```bash
cd bar-app/web
npm install
npm run build     # dist/ を生成
wrangler pages deploy dist --project-name bar-app
```
- Pages の設定で `/api/*` を STEP 1-2 の Workers へ転送する。
  - 簡単なのは `web/public/_redirects` に
    `/api/* https://bar-app-api.<account>.workers.dev/api/:splat 200` を置いて再デプロイ。
- 公開URL（`https://bar-app.pages.dev` 等）にアクセス → モックログインで動作確認。

**この時点で「日報入力＋経営分析＋CSV出力」が本番で使えます**（LINE配信・写真はモック）。

---

## STEP 2. LINE Developers 設定（配信を有効化）

1. [LINE Developers](https://developers.line.biz/) でプロバイダーを作成。
2. **Messaging API チャネル**を作成 → 「チャネルアクセストークン（長期）」を発行して控える。
3. Workers にトークンを登録：
   ```bash
   cd bar-app/server
   wrangler secret put LINE_CHANNEL_ACCESS_TOKEN   # プロンプトにトークンを貼る
   ```
4. 再デプロイ（`wrangler deploy`）。これで①代表日報転送・②日次サマリー・⑤まとめ・
   ③リマインド・④アラートが**実際のLINE送信**に切り替わります（モック→実）。

---

## STEP 3. Google Drive 連携（領収書写真の保存を有効化）

1. Google Cloud で**サービスアカウント**を作成し、JSONキーをダウンロード。
2. Drive API を有効化。
3. 会社 Workspace の**共有ドライブ**を用意し、そのサービスアカウントのメールアドレスを
   「コンテンツ管理者」で追加。保存先ルートフォルダのIDを控える。
4. Workers に登録：
   ```bash
   wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY   # JSONキーの中身をそのまま貼る
   wrangler secret put GDRIVE_ROOT_FOLDER_ID        # ルートフォルダID
   ```
5. 再デプロイ。以降、経費の領収書写真が `伝票/年/月/日/日付_部門_報告者_種別NN.拡張子`
   で共有ドライブに保存されます（未設定時はパス記録のモックのまま）。

---

## STEP 4. 定時配信（Cron）の確認

`wrangler.toml` に設定済みのため、`wrangler deploy` で自動的に有効になります。
- `0 10 * * *`（UTC）= **19:00 JST** → ③未提出リマインド
- `0 13 * * *`（UTC）= **22:00 JST** → ②日次サマリー＋⑤スタッフ日報まとめ＋④異常アラート

Cloudflare ダッシュボードの Workers → Triggers で稼働を確認できます。

---

## STEP 5. LINEグループ・配信先の設定

1. 公式アカウントを「日報グループ」と「スタッフ日報グループ」に招待。
2. アプリの「LINE配信」画面で、各グループの **グループID** を入力して保存。
   - グループIDは、Botを入れたグループで発言した際のWebhookイベント等から取得します
     （取得できない場合は、一時的にWebhookを有効化して `source.groupId` を確認）。
3. 「LINE配信」画面の「今すぐ配信」で1回テスト送信し、届くことを確認。

---

## STEP 6. LIFF（LINEログイン）有効化 ※実装済み・設定のみ

LIFFログインは実装済みです。以下の設定だけで、開発用モックログインからLINE本人認証に
自動で切り替わります（コーディング不要）。

1. LINE Developers で **LINEログインチャネル**を作成し、**LIFFアプリ**を追加
   （エンドポイントURL = STEP 1-4 の Pages 公開URL、scope に `openid`/`profile`）。
   - **チャネルID**（サーバーのIDトークン検証用）と **LIFF ID**（フロント用）を控える。
2. サーバー（Workers）にチャネルIDを登録：
   ```bash
   cd bar-app/server
   wrangler secret put LIFF_CHANNEL_ID     # LINEログインチャネルのチャネルID
   wrangler deploy
   ```
3. フロントを LIFF ID 付きで再ビルド・再デプロイ：
   ```bash
   cd bar-app/web
   VITE_LIFF_ID=<LIFFアプリのID> npm run build
   wrangler pages deploy dist --project-name bar-app
   ```
4. 動作：LINEからアプリを開くと自動でLINEログイン → 紐付け済みなら即ログイン、
   未紐付けなら初回のみ本人のスタッフを選んで紐付け（`sub`=lineUserId を保存）。
   事前にマスター管理の「LINE userId」欄へ手入力して紐付けておくこともできます。

`LIFF_CHANNEL_ID`（および `VITE_LIFF_ID`）が未設定の間は、従来のモックログインのまま
動作します。

---

## 運用開始後の調整（任意）

- **決済手数料率**：実際の決済代行の契約料率に合わせてマスターで変更（初期値は仮）。
- **月間目標・営業日数**：毎月マスターで設定（前月コピー運用も可）。
- **アラートしきい値**：運用データを見て「ペース下振れ%」を調整。
- **無料枠監視**：「LINE配信」画面の当月通数を確認。200通に近づく場合は
  LINEライトプラン（月約5,000円・5,000通）へ切替。

---

## コスト目安

| 項目 | 費用 |
|---|---|
| Cloudflare（Workers/D1/Pages/Cron） | 無料枠内（0円） |
| LINE Messaging API | 無料枠 200通/月（設計上は月約145〜170通で収まる） |
| Google Workspace | 既契約があれば追加費用なし |
| **合計** | **月0円想定**（LINE通数超過時のみライトプラン約5,000円） |
