# test
テスト環境

## BAR 日報・経営分析アプリ（現行・本命）

日報の入力・分析はアプリで行い、LINEへは配信のみ行う「アプリ入力・LINE配信型」。
確定した要件定義は `docs/bar-app-requirements.md`（v1.2・壁打ち論点A〜Rの決定事項
ログ付き）を参照。**`bar-app/` に Phase 1〜3 を実装済み**（日報入力＋経営分析＋認証＋
CSV出力／LINE配信①②⑤＋配信設定＋領収書写真の共有ドライブ保存／③未提出リマインド・
④異常アラート・着地予測・推移グラフ・スタッフ管理UI）。

```bash
# サーバー（Hono + SQLite／本番はCloudflare Workers + D1）
cd bar-app/server && npm install && npm run seed && npm run dev
# フロント（Vite + React／本番はCloudflare Pages・LIFF化想定）
cd bar-app/web && npm install && npm run dev
```

セットアップ・Cloudflareデプロイ手順は `bar-app/README.md` を参照。決済手数料の
自動計算、BAR全体売上と代表個人売上の分離、スタッフ別内訳、CSVエクスポート、
LINE配信（日報転送・日次サマリー・スタッフ日報まとめ）、領収書写真の共有ドライブ保存に
対応。さらに未提出リマインド・異常アラート・着地予測・推移グラフ・スタッフ管理UI・
LINEログイン（LIFF）まで実装済み。LINE/Google認証情報が無い環境ではモックモードで
動作検証でき、認証情報を設定すれば本番連携に切り替わる。残るは外部アカウントの設定・
デプロイ作業のみ（手順は `bar-app/DEPLOYMENT.md`）。

以下の `bar-dashboard/`・`line-bot/` は方針転換前の実装で、`bar-app/` の移植元
（部品）です。

## BAR 業務日報・売上管理システム

`bar-dashboard/` に、BAR事業（1部・2部）の日報（売上・経費・勤怠）入力から、
インセンティブ計算・利益の見える化までを行うダッシュボード（React + TypeScript +
Vite + Tailwind CSS）があります。要件定義書は `docs/bar-dashboard-requirements.md`
を参照してください。

```bash
cd bar-dashboard
npm install
npm run dev
```

`bar-dashboard/` 単体は日報入力フォームでの送信を模したフロントエンド完結の実装
（データは `localStorage` に保存）です。実際にLINEで日報をやり取いするバック
エンドは `line-bot/` に実装しています（下記）。

## BAR業務日報 LINE Bot

`line-bot/` に、LINEで送信された日報を受け取り、SQLiteへの保存・★自動計算
（インセンティブ・当月累計・利益など）・「報告用」テキストの生成/返信/グループ
転送までを行うNode.js（Express + TypeScript）製のBotサーバーがあります。
セットアップ・LINE Developersでのチャネル作成手順・メッセージフォーマットは
`line-bot/README.md` を参照してください。

```bash
cd line-bot
npm install
cp .env.example .env   # LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET を設定
npm run seed
npm run dev
```

LINEチャネルを用意する前でも `npm run cli` でパーサー・計算ロジックをローカル
確認できます。

## Gooner運送事業部 経営分析ダッシュボード

`dashboard/` に、Gooner運送事業部の黒字化を支援する経営分析・What-Ifシミュレーション
ダッシュボード（React + TypeScript + Vite + Tailwind CSS）があります。要件定義書は
`docs/gooner-dashboard-requirements.md`、セットアップ方法は `dashboard/README.md` を
参照してください。

```bash
cd dashboard
npm install
npm run dev
```

## 請求書作成ツール

`invoice-tool/` にブラウザだけで動作する請求書作成ツールがあります。サーバーやビルド不要で、`invoice-tool/index.html` を開くだけで使えます。

### 主な機能

- 発行者・宛先情報、請求書番号、発行日、支払期限の入力
- 明細行の追加・削除（数量・単価・税率ごとに金額を自動計算）
- 税率（10% / 8%軽減税率 / 対象外）ごとの消費税内訳と合計金額の自動計算
- 振込先・備考欄
- 入力内容はブラウザの localStorage に自動保存（再読み込みしても復元）
- JSONファイルとしての書き出し・読み込み（他端末への引き継ぎやバックアップ用）
- 印刷ボタンからブラウザの印刷機能でPDF保存・印刷が可能（A4想定のレイアウト）

### 使い方

1. `invoice-tool/index.html` をブラウザで開く
2. 発行者情報・宛先・明細を入力する
3. 「印刷 / PDF保存」ボタンから印刷し、保存先を「PDFに保存」にすればPDFとして出力できる

## 経費申請アプリ

`expense-app/` にブラウザで動作する経費申請アプリがあります。`expense-app/index.html` を開くだけで使えます。申請データを Google スプレッドシート（DB）に、領収書画像を Google ドライブに保存し、実績管理・分析ツールと連携できます。仕様は `docs/expense-app-spec.md`、バックエンド構築は `apps-script/README.md`、アプリ詳細は `expense-app/README.md` を参照してください。

### 主な機能

- レシート／領収書画像の自動読み取り（Tesseract.js による端末内OCR）で金額・日付・店名を申請フォームへ自動入力
- 経費の申請（日付・科目・支払先・金額・摘要）
- 個人確認用ダッシュボード（自分の申請一覧・状況・金額集計）
- 管理者確認用ダッシュボード（全申請の承認／却下、承認待ち・科目別金額の集計、検索、CSV書き出し）
- クラウド連携：Google Apps Script Web アプリ経由で、申請データをスプレッドシート（正本）、領収書画像をドライブへ保存。複数端末・分析ツールから同一データを参照可能（未設定時は localStorage のみ）

