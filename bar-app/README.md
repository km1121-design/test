# BAR 日報・経営分析アプリ（Phase 1）

日報の入力・経営分析をアプリで完結させ、必要な情報を LINE へ配信する
「アプリ入力・LINE配信型」システムの本体。要件定義は
`docs/bar-app-requirements.md`（v1.2）を参照。

このディレクトリは **Phase 1**（アプリ本体：日報入力＋経営分析＋認証＋CSV出力）の
実装です。LINE配信（Phase 2）・リマインド/写真アップロード（Phase 3）は今後追加します。

## 構成

```
bar-app/
  server/   Hono製API。DBアクセスは非同期の Db インターフェースに抽象化し、
            ローカルは better-sqlite3、本番は Cloudflare D1 に差し替え可能。
  web/      Vite + React + TypeScript + Tailwind のフロントエンド（LIFF化を想定）。
```

計算エンジン（決済手数料・インセン・利益・勤怠）は `server/src/lib/calculations.ts`
に集約。要件定義書 4.3〜4.7 節に対応する純粋関数。

## ローカルでの起動（この環境で検証可能）

```bash
# 1. サーバー
cd server
npm install
npm run seed        # スタッフ・目標・レートの初期データを投入
npm run dev         # http://localhost:8787 で起動

# 2. フロント（別ターミナル）
cd web
npm install
npm run dev         # http://localhost:5173 （/api はサーバーへプロキシ）
```

ブラウザで web を開き、ログイン画面で名前を選ぶ（開発用モックログイン）。
代表でログインすると日報入力・ダッシュボード・日次進捗・マスター管理・CSV出力が、
スタッフでログインすると自分の日報入力・個人進捗が使える。

## 実装済み機能（Phase 1）

- **認証**: ロール別権限（代表／スタッフ）。開発用モックログイン。本番は LINEログイン
  （LIFF）に差し替え（`server/src/routes/auth.ts` のコメント参照）。
- **代表日報**: BAR全体売上と代表個人売上の分離入力、スタッフ別内訳（売上・来客）、
  決済内訳、組数・新規/既存来客、任意売上（ハイエース・本部・イベント）、総評・当日予定、
  経費。フリー・その他分は自動算出。既存日報の読込。
- **スタッフ日報**: 勤怠（日またぎ対応）、当日売上、指名客ごとの明細、振り返り。
- **経営分析**: ダッシュボード（目標・GAP・達成率・1日必達・**決済手数料**・
  **手数料控除後実収入**・経費・人件費・インセン・来客/組数・客単価/組単価・利益・
  会社利益・スタッフ別売上累計）、日次進捗、代表個人進捗、スタッフ個人進捗
  （本人には売上・インセンまで／時給・生産性は代表のみ＝決定F）。
- **マスター管理**: レート（インセン率・時給・税率・**決済手数料率**）・部門月間目標。
- **CSV出力**: 代表日報／スタッフ別売上帰属／スタッフ日報（UTF-8 BOM付き）。

## Cloudflare へのデプロイ（本番）

DBアクセスを抽象化しているため、ローカルの SQLite ドライバを D1 ドライバに
差し替えるだけで Cloudflare 無料枠（Workers + D1 + Pages）へ載せられる。

### API（Workers + D1）

```bash
cd server
npm i -g wrangler && wrangler login
wrangler d1 create bar-app                                   # database_id を wrangler.toml に記入
wrangler d1 execute bar-app --remote --file=src/db/schema.sql
wrangler deploy                                              # src/index.workers.ts が起動
```

- 本番エントリ: `src/index.workers.ts`（D1バインディング `env.DB` を使用）
- ローカルエントリ: `src/index.node.ts`（better-sqlite3）
- 両者は同じ `createApp()`（`src/app.ts`）を共有する。

### フロント（Pages）

```bash
cd web
npm run build          # dist/ を出力
# Cloudflare Pages に dist/ をデプロイ。
# /api/* を Workers（上記API）へ振り向ける（Pages のリダイレクト or 同一ルートのFunctions）。
```

## まだ実装していないもの（次フェーズ）

- LINE配信（①日報転送・②日次サマリー・⑤スタッフ日報まとめ・③リマインド・④アラート）
- LINEログイン（LIFF）の実接続
- 領収書写真アップロード → 共有ドライブ保存
- 推移グラフ・着地予測
- スタッフ追加/編集フォーム・LINE紐付け管理UI
