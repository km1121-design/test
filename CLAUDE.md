# CLAUDE.md

このリポジトリで作業する AI アシスタント（Claude Code）向けのガイドです。

## このリポジトリについて

`km1121-design/test` は、日本の物流事業（Gooner運送事業部）向けの
**社内ブラウザツールを集めたモノレポ** です。単一のアプリケーションではなく、
4つの独立したツールをまとめてビルド／コピーし、1つの静的な
**GitHub Pages** サイトとして公開します。

ユーザー向けの文言・コード内コメント・ドキュメントはすべて **日本語** です。
この方針を維持してください。ユーザーから別の指示がない限り、UI 文言・README・
コミットメッセージは日本語で記述します。

## リポジトリ構成

| パス | ツール | 技術スタック | ビルド |
| --- | --- | --- | --- |
| `dashboard/` | 経営分析ダッシュボード（What-If シミュレーター付き） | React 19 + TypeScript + Vite + Tailwind v4 + lucide-react | あり（Vite） |
| `invoice-tool/` | 請求書作成ツール（印刷経由でPDF出力） | バニラ JS / HTML / CSS | なし |
| `expense-app/` | 経費申請アプリ（レシートOCR） | バニラ JS / HTML / CSS | なし |
| `apps-script/` | `expense-app` のバックエンド（スプレッドシートDB＋ドライブ画像保存） | Google Apps Script（`Code.gs`） | なし（Google 上でデプロイ） |
| `pages-root/` | 3つのWebツールへのリンクを並べたランディングページ | 静的 HTML | なし |
| `docs/` | 要件定義・仕様ドキュメント（日本語） | Markdown | — |
| `.github/workflows/` | GitHub Pages デプロイパイプライン | GitHub Actions | — |

バニラの3ツール（`invoice-tool/` / `expense-app/` / `pages-root/`）は
`index.html` を直接開くだけで動作します。ビルドもサーバーも不要です。
この状態を保ってください。

## ビルド・実行・Lint

ツールチェーンを持つのは `dashboard/` のみです。`dashboard/` 内で実行します。

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # tsc -b && vite build → dist/
npm run preview  # 本番ビルドのプレビュー
npm run lint     # oxlint
```

- Node 20（CI と同じ）。CI では `npm ci` を使うため、`package-lock.json` は
  必ずコミットしておきます。
- Vite は `base: './'` で設定されています。ビルド結果は任意の Pages サブパスから
  動作する必要があるため、アセットの絶対パスをハードコードしないでください。
- Lint は ESLint ではなく **oxlint**（`dashboard/.oxlintrc.json` を参照）。
  Rules of Hooks は error、`react/only-export-components` は warning です。
- バニラツールには lint／build／test コマンドがありません。HTML をブラウザで
  開いて動作確認します。
- 現時点でどのツールにも **自動テストはありません**。

## デプロイ（重要）

`.github/workflows/deploy-pages.yml` は、**`main` への push**（または手動の
`workflow_dispatch`）で GitHub Pages に公開します。ただし `invoice-tool/`・
`expense-app/`・`dashboard/`・`pages-root/`・ワークフロー自身のいずれかが
変更された場合のみ発火します。

ジョブは `_site/` を次のように組み立てます。

- `pages-root/` → サイトルート（ランディングページ）
- `invoice-tool/` → `/invoice-tool/`
- `expense-app/` → `/expense-app/`
- `dashboard/dist/`（ビルド済み）→ `/dashboard/`

つまり各ツールの公開URLはディレクトリ名に対応します。新しいツールを追加する
ときは、ワークフローの `paths:` フィルターと `Assemble Pages site` ステップの
**両方** を更新し、`pages-root/index.html` にカードを追加してください。

## 主な規約

### 制約された／iframe 環境で動作する
ツールはオフラインおよびサンドボックス化された iframe 内で動くよう設計されています。
- **`alert()` / `confirm()` / `prompt()` は使用しない。** ダッシュボードには独自の
  トーストUI（`dashboard/src/components/ToastProvider.tsx` ＋ `useToast`）が
  あります。同じパターンに従ってください。
- オフラインで動作させる必要がある依存（例: `lucide-react` アイコン）は CDN では
  なくバンドルします。例外として `expense-app` は解析時に Tesseract.js（OCR）と
  言語データを CDN から取得します（この時のみネット接続が必要）。

### ダッシュボードのアーキテクチャ（`dashboard/src/`）
- `data/` — モックのマスターデータ（ドライバー・車両経費・企業配案件・現場バグ
  ログ）と、**調整可能な定数はすべて `data/constants.ts` に集約**。経営計算の
  規定値はここにあります。数値はインラインではなくここで変更します。
- `hooks/useSimulator.ts` — What-If 計算エンジン。純粋関数 `computeSimulation()`
  を `useMemo` でラップ。入力レンジは `SIMULATOR_RANGES`、既定値は
  `DEFAULT_SIMULATOR_INPUTS`。
- `types.ts` — 共有ドメイン型（コメントはすべて日本語）。
- `components/ui/` — 再利用可能なプリミティブ（Card・Badge・Slider・StatTile・
  ProgressBar）。`components/tabs/` — 4つの分析ビュー。
- スタイリングは CSS 変数を併用した Tailwind v4 のユーティリティクラス
  （例: `bg-[var(--page)]`）。別途 CSS モジュールは使いません。

### バニラツール（`invoice-tool/` / `expense-app/`）
- `'use strict'` の単一 `script.js`。フレームワーク・バンドラーなし。
- 状態は名前空間付きのキーで `localStorage` に永続化
  （`invoiceTool.draft.v1`・`expense-app:*`）。
- `expense-app` はデータ構造に JSDoc の `@typedef` を使用。編集時は型を
  同期させてください。

### expense-app ↔ Apps Script の契約
`expense-app/script.js` は Apps Script Web アプリ（`apps-script/Code.gs`）と
通信します。
- スプレッドシート（`expenses` シート）が正本。localStorage は読み取りキャッシュ
  ＋オフライン時の再送信キューです。
- API: `GET ?token=` で全レコード取得、`POST`（text/plain の JSON）で
  `action: "create" | "update" | "delete"`。
- レコード／列のスキーマは `apps-script/README.md` に記載。フィールドを変更する
  ときは、シートの列・`Code.gs` のハンドラ・クライアントを一括で更新してください。

## Git 運用

- 既定ブランチ: `main`。機能開発は `claude/...` ブランチで行い、PR 経由で `main`
  にマージします。`main` へのマージで Pages デプロイが走ります。
- push は `git push -u origin <branch>`。
- **ユーザーが明示的に依頼した場合のみ** プルリクエストを作成します。
- コミットメッセージは履歴に合わせて日本語で書きます。

## まず参照すべき場所

- 全体像・ツールごとの機能一覧: ルートの `README.md`。
- ダッシュボードの要件・経営ロジック: `docs/gooner-dashboard-requirements.md`。
- 経費申請アプリの仕様: `docs/expense-app-spec.md`。
- バックエンドのセットアップ・データスキーマ: `apps-script/README.md`。
