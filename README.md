# test
テスト環境

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

