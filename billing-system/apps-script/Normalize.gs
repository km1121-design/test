/**
 * 配送 請求・支払・実績照合システム
 * コース名 正規化 ＆ エリア単価区分 判定モジュール
 *
 * 要件定義書 v5（正本）／引き継ぎ資料 v5 の「ハマりどころ」#4・#5 に対応。
 *   - コース名の表記ゆれが激しい（「上高井戸1小」「上高1小」「上高１小」等）→ normalizeCourse_
 *   - 単価判定は「取引先列 × コースのエリア区分」の組で行う → classifyArea_
 *
 * ここでは実績の生コース名を「エリア単価区分（上高／中野／青山系／上馬池尻）」へ寄せる。
 * 実データ（2026/01〜03、310行・原文53種）で検証済みのルール。詳細は
 * billing-system/docs/step1-findings.md を参照。
 */

// 宅配 単価マスタ（要件定義書 v5 付録B・税抜）
var HAITATSU_RATES = {
  '上高':     { torihiki: 'フェイト',  kanryo: 167, nekopos: 50 }, // 上高井戸系
  '中野':     { torihiki: 'フェイト',  kanryo: 170, nekopos: 50 }, // 中野中央・本町
  '青山系':   { torihiki: 'k-dash',   kanryo: 163, nekopos: 50 }, // 青山・芝浦・西新橋
  '上馬池尻': { torihiki: 'H.R.A.S',  kanryo: 171, nekopos: 50 }  // 上馬・池尻
};

/**
 * コース名の表記ゆれを吸収する。
 *   - NFKC 正規化（全角数字→半角、全角スペース→半角）
 *   - 「丁目」除去、空白・タブ除去
 * 例: 「上高１小」「上高 1 小」→「上高1小」／「北青山3丁目南青山1丁目」→「北青山3南青山1」
 */
function normalizeCourse_(raw) {
  if (raw === null || raw === undefined) return '';
  var s = String(raw);
  // Apps Script は String.prototype.normalize('NFKC') を利用可能
  if (s.normalize) s = s.normalize('NFKC');
  s = s.replace(/丁目/g, '');
  s = s.replace(/[\s　\t]+/g, '');
  return s.trim();
}

/**
 * 正規化済みコース名から、該当するエリア単価区分をすべて返す（複数エリア混在に対応）。
 * @return {Array<string>} 例: ['中野']、['上高','中野']（混在）、[]（区分不能）
 */
function classifyArea_(normCourse) {
  var s = normCourse;
  var hits = [];
  if (s.indexOf('上高') >= 0) hits.push('上高');
  if (s.indexOf('中央') >= 0 || s.indexOf('本町') >= 0 || s.indexOf('中野') >= 0) hits.push('中野');
  // 青山系（k-dash）: 青山・芝浦・西新橋に加え、ユーザー確認済み（2026/07）で
  //   ・マンション名 キャピタル/プラウド/ツイン → k-dash
  //   ・略記 北1.2 / 北12 / 北3 / 南2.南1（北青山・南青山の略）→ 青山系
  if (/青山|芝浦|新橋/.test(s) || /[北南]\d/.test(s) || /キャピタル|プラウド|ツイン/.test(s)) hits.push('青山系');
  if (s.indexOf('上馬') >= 0 || s.indexOf('池尻') >= 0) hits.push('上馬池尻');
  return hits;
}

/**
 * コース空白行（仲山さん等）の宅配単価は【取引先】で決定する（ユーザー確認済み 2026/07）。
 * フェイト → 上高相当 ¥167、k-dash → 青山系相当 ¥163。ネコポスは一律 ¥50。
 */
var BLANK_COURSE_RATE_BY_TORIHIKI = {
  'フェイト': { kanryo: 167, nekopos: 50 },
  'k-dash':   { kanryo: 163, nekopos: 50 }
};

/**
 * 区分不明（マンション名等でエリア判定できない）キーワードを検出。
 * 「キャピタル」「プラウド」「ツイン」「中野坂上」等はユーザー確認待ち（要件定義書 Q1）。
 */
// キャピタル/プラウド/ツインは 2026/07 に k-dash（青山系）と確定したため除外。
// 中野坂上のみ区分未確定として残す（「中野」に部分一致するため実害は小）。
var UNKNOWN_KEYWORDS = ['中野坂上'];
function detectUnknown_(normCourse) {
  var found = [];
  for (var i = 0; i < UNKNOWN_KEYWORDS.length; i++) {
    if (normCourse.indexOf(UNKNOWN_KEYWORDS[i]) >= 0) found.push(UNKNOWN_KEYWORDS[i]);
  }
  return found;
}

/**
 * 1コース名を診断する。M4 コース対応マスタ生成（Step 2）の入力となる。
 * @return {Object} { raw, norm, areas, unknown, multi, singleArea, expectedTorihiki, kanryoRate }
 */
function diagnoseCourse_(raw) {
  var norm = normalizeCourse_(raw);
  var areas = classifyArea_(norm);
  var unknown = detectUnknown_(norm);
  var single = areas.length === 1 ? areas[0] : null;
  return {
    raw: raw,
    norm: norm,
    areas: areas,
    unknown: unknown,
    multi: areas.length > 1,
    singleArea: single,
    expectedTorihiki: single ? HAITATSU_RATES[single].torihiki : '',
    kanryoRate: single ? HAITATSU_RATES[single].kanryo : ''
  };
}
