# BAR 日報・経営分析アプリ（Phase 1〜3）

日報の入力・経営分析をアプリで完結させ、必要な情報を LINE へ配信する
「アプリ入力・LINE配信型」システムの本体。要件定義は
`docs/bar-app-requirements.md`（v1.2）を参照。

要件定義で計画した全フェーズを実装済み：

- **Phase 1**: 日報入力（代表・スタッフ）＋経営分析6画面＋ロール別認証＋CSV出力
- **Phase 2**: LINE配信①代表日報転送・②日次サマリー・⑤スタッフ日報まとめ、配信設定、
  領収書写真の共有ドライブ保存
- **Phase 3**: ③未提出リマインド・④異常アラート（達成ペース急落）、着地予測、
  推移グラフ、スタッフ追加/編集・LINE紐付けUI

LINE / Google Drive の認証情報が無い環境では、送信・保存を**モックモード**で動かして
検証できる（送信内容は outbox に記録、写真は保存先パスのみ記録）。認証情報を
設定すれば実 LINE push / 共有ドライブ保存に切り替わる。**LINEログイン（LIFF）も
実装済み**で、`LIFF_CHANNEL_ID`（サーバー）と `VITE_LIFF_ID`（フロント）を設定すると
モックログインからLINE本人認証に自動で切り替わる。

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

## 実装済み機能（Phase 2）

- **① 代表日報の即時転送**: 代表日報の提出と同時に、報告用テキスト（要件定義8.1準拠・
  ★自動計算込み）を日報グループへ push。
- **② 日次サマリー**: 部門別の前営業日実績・当月累計・達成率・1日必達・未提出者を
  日報グループへ配信。
- **⑤ スタッフ日報まとめ**: 当日の全スタッフ日報を1通にまとめてスタッフ日報グループへ
  配信（無料枠と両立＝決定K）。
- **配信スケジュール**: 本番は Cloudflare Cron（毎日22:00 JST）で②⑤を自動実行
  （`src/index.workers.ts` の `scheduled()`）。「LINE配信」画面から任意日付で手動実行・
  プレビューも可能。
- **配信設定画面**: グループID・各配信のON/OFF・サマリー時刻を編集。送信履歴（outbox）と
  当月のグループ配信通数／無料枠（200通・決定G）を表示。
- **モック/実切替**: `LINE_CHANNEL_ACCESS_TOKEN` 未設定ならモック（outbox記録のみ）、
  設定すれば実 Messaging API push。いずれも outbox に記録され検証できる。
- **領収書写真アップロード**: 代表日報の経費行から写真を添付。ファイル名
  `日付_部門_報告者_種別NN.ext`、共有ドライブの `伝票/年/月/日` に保存（決定H）。
  Google 認証情報が無い環境では保存先パスのみ記録するモック動作。

## 実装済み機能（Phase 3）

- **③ 未提出リマインド**: 締め時刻（既定19:00・決定J）に、対象日の日報が未提出の
  在籍者へ本人のLINEへ個別 push。Cloudflare Cron（19:00 JST）で自動実行。
  未紐付け（lineUserId無し）の場合は不達として記録され、要紐付けを検知できる。
- **④ 異常アラート**: 当月の達成ペースが予定比でしきい値（既定20%）以上下振れした
  部門について、代表へ警告 push。22:00 の日次Cronで判定。
- **着地予測**: 経過営業日あたりの売上ペースから月末着地見込みと予測達成率を算出し、
  ダッシュボードに表示。
- **推移グラフ**: 日次売上・日次利益・累計売上・客単価を SVG チャート（CSP安全・
  外部ライブラリ不使用）で可視化。メトリクス切替対応。
- **スタッフ管理・LINE紐付けUI**: マスター管理でスタッフの追加・編集（氏名/役割/部門/
  個人目標）と lineUserId の紐付け。削除は論理削除（active=false）。
- **LINEログイン（LIFF）**: `LIFF_CHANNEL_ID`/`VITE_LIFF_ID` 設定時、起動時に LIFF SDK で
  IDトークンを取得しサーバーが LINE verify で検証。紐付け済みなら自動ログイン、未紐付けなら
  初回のみスタッフを選んで紐付け（`sub`=lineUserId を保存）。未設定なら従来のモックログイン。

## 環境変数（本番の LINE / Drive 連携）

```
LINE_CHANNEL_ACCESS_TOKEN   # Messaging API チャネルアクセストークン（未設定=モック配信）
CRON_SECRET                 # 外部cronから /api/cron/daily を叩く場合の共有シークレット（任意）
GOOGLE_SERVICE_ACCOUNT_KEY  # Google サービスアカウントのJSONキー文字列（未設定=写真モック保存）
GDRIVE_ROOT_FOLDER_ID       # 共有ドライブの保存先ルートフォルダID
LIFF_CHANNEL_ID             # LINEログインチャネルのチャネルID（サーバー側・IDトークン検証用／未設定=モックログイン）
```

フロント（`web`）はビルド時に `VITE_LIFF_ID`（LIFFアプリのID）を渡す：

```bash
VITE_LIFF_ID=1234567890-xxxxxxxx npm run build   # 未設定ならモックログインのまま
```

ローカルは環境変数で、本番（Workers）は `wrangler secret put <NAME>` で設定する。
配信先グループIDは「LINE配信」画面（またはDBの delivery_settings）で設定する。

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

Cron を含む設定は `wrangler.toml` を参照（`crons = ["0 10 * * *", "0 13 * * *"]`
= 19:00 JST リマインド / 22:00 JST サマリー＋アラート）。

要件定義で計画した機能（Phase 1〜3）＋LINEログイン（LIFF）まで実装完了しています。
残るのは外部アカウントの設定・デプロイ作業のみです（`DEPLOYMENT.md` 参照）。

## 残課題（運用しながらの調整・任意）

- アラートしきい値の実データチューニング、部門別の締め時刻の個別設定など。
- ログイン後のセッションは x-user-id ヘッダ方式（店舗内ツール前提）。より厳格にするなら
  各リクエストでのIDトークン検証へ拡張可能（`app.ts` のミドルウェア差し替え）。
