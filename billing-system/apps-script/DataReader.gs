/**
 * 配送 請求・支払・実績照合システム — Step 1: データ読み込み基盤
 *
 * 役割:
 *   1. ソース「実績・経費シート」の全タブ名を列挙（listSourceTabs）
 *   2. 実績（稼働報告フォーム回答）タブを構造化して読み込む（readJissekiRecords_）
 *   3. 全コース名をユニーク抽出し、正規化・エリア区分・取引先内訳・要確認フラグを付与
 *      してコースインベントリを生成（buildCourseInventory）
 *   4. ドライバー単価マスタ／企業配単価タブを読み込む（readDriverRateMaster / readKigyohaiRates）
 *   5. 上記の集計結果を「新規の出力シート」へ書き出す（writeInventoryToOutput）
 *
 * ★ hard constraint（引き継ぎ資料 #10）:
 *   実績・経費シート、シフトシートは【読み取り専用】。書き込みは必ず新規シート/新規ファイルへ。
 *   本モジュールは SOURCE から読むだけで、出力は OUTPUT_SPREADSHEET_ID（別ファイル）へ書く。
 *
 * スクリプトプロパティ:
 *   SOURCE_SPREADSHEET_ID  … 実績・経費シートID（既定は下記 DEFAULT_SOURCE_ID）
 *   OUTPUT_SPREADSHEET_ID  … 中間データ/マスタの出力先。未設定なら新規作成し、IDをログ表示
 *   JISSEKI_TAB_NAME       … 実績タブ名（未設定なら見出し行から自動判定）
 *   DRIVER_MASTER_TAB_NAME … ドライバー単価マスタのタブ名（任意・自動判定補助）
 */

var DEFAULT_SOURCE_ID = '1A5KWMwGapTbHHSzNebR-fUKlsPTEVAaS9qyRMDrurnU';

// 実績タブの見出し（この並びで自動判定する）
var JISSEKI_HEADERS = ['タイムスタンプ', '日付', '氏名', 'コース', '持出総数', '宅配完了数', 'ネコポス', '取引先'];

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function sourceSpreadsheet_() {
  return SpreadsheetApp.openById(prop_('SOURCE_SPREADSHEET_ID') || DEFAULT_SOURCE_ID);
}

/** 出力先スプレッドシート（別ファイル）。無ければ新規作成してIDをログに出す。 */
function outputSpreadsheet_() {
  var id = prop_('OUTPUT_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create('配送請求システム_中間データ');
  Logger.log('OUTPUT_SPREADSHEET_ID 未設定のため新規作成しました: ' + ss.getId());
  Logger.log('→ スクリプトプロパティ OUTPUT_SPREADSHEET_ID に上記IDを設定してください。');
  return ss;
}

/* ============================================================
 * 1. タブ列挙
 * ============================================================ */

/** ソースシートの全タブ名・行数・列数をログ出力し、配列で返す。 */
function listSourceTabs() {
  var sheets = sourceSpreadsheet_().getSheets();
  var out = [];
  sheets.forEach(function (sh) {
    var info = {
      name: sh.getName(),
      rows: sh.getLastRow(),
      cols: sh.getLastColumn()
    };
    out.push(info);
    Logger.log('[TAB] %s  (rows=%s, cols=%s)', info.name, info.rows, info.cols);
  });
  return out;
}

/* ============================================================
 * 2. 実績タブの読み込み
 * ============================================================ */

/** 見出し行が JISSEKI_HEADERS と一致するタブを探す。 */
function findJissekiSheet_() {
  var named = prop_('JISSEKI_TAB_NAME');
  var ss = sourceSpreadsheet_();
  if (named) {
    var s = ss.getSheetByName(named);
    if (s) return s;
  }
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    if (sh.getLastRow() < 2 || sh.getLastColumn() < JISSEKI_HEADERS.length) continue;
    var head = sh.getRange(1, 1, 1, JISSEKI_HEADERS.length).getValues()[0];
    var match = true;
    for (var j = 0; j < JISSEKI_HEADERS.length; j++) {
      if (String(head[j]).trim() !== JISSEKI_HEADERS[j]) { match = false; break; }
    }
    if (match) return sh;
  }
  throw new Error('実績タブが見つかりません。JISSEKI_TAB_NAME を設定してください。');
}

function toDateStr_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  }
  return String(v).trim();
}
function toInt_(v) {
  var n = parseInt(String(v).replace(/[, ]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

/**
 * 実績タブを構造化レコードで返す。
 *   ★ 同一ドライバー・同一日の複数行を許容（引き継ぎ資料 #1）。日付×氏名でユニーク化しない。
 *   ★ 集計は「日付」列を正とする（タイムスタンプは空欄/翌日ズレが多い、#2・#3）。
 * @return {Array<Object>} { date, name, course, mochidashi, kanryo, nekopos, torihiki }
 */
function readJissekiRecords_() {
  var sh = findJissekiSheet_();
  var values = sh.getDataRange().getValues();
  var recs = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var date = toDateStr_(row[1]);
    var name = String(row[2]).trim();
    if (!date || !name) continue; // 空行スキップ（日付・氏名を必須とする）
    recs.push({
      date: date,
      name: name,
      course: String(row[3]).trim(),
      mochidashi: toInt_(row[4]),
      kanryo: toInt_(row[5]),
      nekopos: toInt_(row[6]),
      torihiki: String(row[7]).trim()
    });
  }
  return recs;
}

/* ============================================================
 * 3. コースインベントリ生成
 * ============================================================ */

/**
 * 実績の全コース名をユニーク抽出し、診断情報を付けて返す。M4（Step 2）の器。
 * @return {Array<Object>}
 */
function buildCourseInventory() {
  var recs = readJissekiRecords_();
  var map = {}; // raw course -> aggregate
  recs.forEach(function (r) {
    if (r.course === '') return; // コース空白（仲山さん等）は別集計
    if (!map[r.course]) map[r.course] = { count: 0, torihiki: {} };
    var m = map[r.course];
    m.count++;
    m.torihiki[r.torihiki] = (m.torihiki[r.torihiki] || 0) + 1;
  });

  var inventory = [];
  Object.keys(map).forEach(function (raw) {
    var d = diagnoseCourse_(raw);
    var agg = map[raw];
    var toriKeys = Object.keys(agg.torihiki);
    var toriBreakdown = toriKeys.map(function (t) { return t + ':' + agg.torihiki[t]; }).join('|');

    var flags = [];
    if (d.multi) flags.push('複数エリア混在');
    if (d.unknown.length) flags.push('区分不明:' + d.unknown.join(','));
    if (!d.areas.length && !d.unknown.length) flags.push('要確認');
    // 取引先×エリアの矛盾検出（例: 上高なのに k-dash）
    if (d.singleArea) {
      var contra = toriKeys.filter(function (t) { return t !== d.expectedTorihiki; });
      if (contra.length) flags.push('取引先不一致:' + contra.join(','));
    }

    inventory.push({
      raw: raw,
      norm: d.norm,
      count: agg.count,
      torihikiBreakdown: toriBreakdown,
      area: d.singleArea || (d.multi ? d.areas.join('|') : ''),
      rate: d.singleArea ? d.kanryoRate : (d.multi ? '複数' : ''),
      flags: flags.join(';')
    });
  });

  inventory.sort(function (a, b) { return b.count - a.count; });
  return inventory;
}

/* ============================================================
 * 4. 単価マスタの読み込み（精読用ダンプ）
 * ============================================================ */

/** タブを二次元配列のまま返す（単価マスタ精読用）。 */
function dumpTab(tabName) {
  var sh = sourceSpreadsheet_().getSheetByName(tabName);
  if (!sh) throw new Error('タブが見つかりません: ' + tabName);
  return sh.getDataRange().getValues();
}

/* ============================================================
 * 5. 出力（別ファイルへ書き込み）
 * ============================================================ */

/** コースインベントリを出力スプレッドシートの「コースインベントリ」タブへ書き出す。 */
function writeInventoryToOutput() {
  var inv = buildCourseInventory();
  var ss = outputSpreadsheet_();
  var name = 'コースインベントリ';
  var sh = ss.getSheetByName(name);
  if (sh) sh.clear(); else sh = ss.insertSheet(name);

  var header = ['コース名(原文)', '正規化', '件数', '取引先内訳', '推定エリア区分', '推定単価', '要確認フラグ'];
  var rows = inv.map(function (r) {
    return [r.raw, r.norm, r.count, r.torihikiBreakdown, r.area, r.rate, r.flags];
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  sh.setFrozenRows(1);
  Logger.log('コースインベントリを書き出しました: %s 行 / %s', rows.length, ss.getUrl());
  return ss.getUrl();
}

/* ============================================================
 * 6. Step 1 一括実行
 * ============================================================ */

/** Step 1 の全処理を実行し、結果サマリをログに出す。 */
function runStep1() {
  Logger.log('===== Step 1: データ読み込み基盤 =====');
  var tabs = listSourceTabs();
  Logger.log('タブ数: %s', tabs.length);
  var recs = readJissekiRecords_();
  Logger.log('実績レコード数: %s', recs.length);
  var inv = buildCourseInventory();
  Logger.log('ユニークコース数(原文): %s', inv.length);
  var flagged = inv.filter(function (r) { return r.flags; }).length;
  Logger.log('要確認フラグ付き: %s', flagged);
  var url = writeInventoryToOutput();
  Logger.log('出力先: %s', url);
}
