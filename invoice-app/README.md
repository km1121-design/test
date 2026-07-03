# 請求書作成アプリ(自社・取引先・案件・シフト管理付き)

自社(発行元)・取引先・案件・シフトを登録し、シフトの勤務日数から請求書の明細を自動生成できるアプリです。
`invoice-tool/`(単発の請求書だけ作る場合のブラウザ完結ツール)とは別の、データベース連携版です。

## 構成

- `server/` — Node.js + Express の API サーバー(PostgreSQL を使用)
- `public/` — フロントエンド(素のHTML/CSS/JS、ビルド不要)

## データモデル

- 自社(companies): 請求書の発行元。複数登録して請求書作成時に選択します。
- 取引先(clients): 請求書の宛先。
- 案件(cases): 取引先に紐づく案件。単価(日給)を持ちます。
- シフト(shifts): 案件ごとの勤務日と数量(日数)。同じ案件・同じ日付は上書きされます。
- 請求書(invoices/invoice_items): 自社・取引先・対象期間を指定し、シフトから明細を自動生成して保存します。

金額は「案件の単価 × 対象期間内のシフト数量合計」で計算されます。生成後は明細を手動で追加・編集・削除できます。

## ローカルでの動かし方

PostgreSQL が必要です(ローカルにインストールするか、後述のNeon/Supabaseの接続文字列を使う)。

```bash
cd server
npm install
DATABASE_URL="postgresql://user:password@localhost:5432/invoice_app" npm start
```

ブラウザで `http://localhost:3000` を開いてください。初回起動時にテーブルは自動作成されます。

ローカルのPostgresを自己署名証明書なしで使う場合は `PGSSL=disable` を追加してください(Neon/Supabaseなど本番のマネージドPostgresでは不要です)。

## デプロイ(無料枠での構成例)

データベースとアプリの実行環境を分けることで、無料のまま安全にデータを永続化できます。

### 1. データベース: Neon または Supabase の無料枠

1. [Neon](https://neon.tech) または [Supabase](https://supabase.com) に登録し、新しいPostgresプロジェクトを作成
2. 接続文字列(`postgresql://...`、`sslmode=require` 付き)を控える

### 2. アプリ実行環境: Render の無料Web Service

1. [Render](https://render.com) に登録
2. 「New Web Service」からこのリポジトリを接続
3. 設定:
   - Root Directory: `invoice-app/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - 環境変数 `DATABASE_URL` に手順1の接続文字列を設定
4. デプロイ完了後に発行されるURLでアクセス

**注意**: Render無料プランはディスクが永続化されないため、アプリ本体をSQLiteで運用すると再デプロイ時にデータが消えます。上記のようにデータベースをNeon/Supabaseに切り出しているため、Render側の再デプロイやスリープでもデータは失われません。

### アクセス制御について

現時点ではログイン機能はありません。自社・取引先・案件などの実データを扱うため、URLを知っている人なら誰でも閲覧・編集できる状態です。個人利用を想定した最小構成のため、複数人での利用や公開範囲を広げる場合は簡易認証の追加を検討してください。
