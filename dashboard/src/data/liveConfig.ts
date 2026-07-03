// 配送実績ログ連携用 Apps Script Web App のURL。
// 未設定（空文字）の間はモックデータで動作する。
// セットアップ手順は apps-script/README.md を参照。
export const LIVE_DATA_ENDPOINT = '';

// 会社がヤマトから受け取る単価（円/個）。実数値が判明するまでの暫定値。
// ドライバー支払単価（コース別: courseRates.ts）とは別に管理する。
export const COMPANY_RECEIVE_PRICE_PLACEHOLDER = 167;
