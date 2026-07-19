/**
 * 配送 請求・支払・実績照合システム — Step 4: 請求・支払計算（フェーズ2・3）
 *
 * 要件定義書 v5 F-101〜F-103 / F-201〜F-203。
 *
 * 【売上（顧客請求）】
 *   宅配   = Σ(宅配完了数 × エリア単価) ＋ Σ(ネコポス × ¥50)   … 個数制（付録B）
 *   企業配 = Σ(案件の基本単価 × 回数)                           … 回数制（付録A）
 *   税: 税抜小計 → 消費税10%（四捨五入・2026/07ユーザー確定）→ 税込合計
 *   請求先: 実績の「取引先」列で1取引先=1枚に集約（F-103）
 *
 * 【原価（ドライバー支払）】※卸単価は税込契約（2026/07ユーザー確定・消費税加算なし）
 *   宅配   = Σ(宅配完了数 × ドライバー卸単価) ＋ Σ(ネコポス × ¥50 ※確定)
 *   企業配 = Σ(区分別卸単価 × 回数)（付録A）
 *   ＋ 当月立替経費 全額（F-202）
 *
 * ★ 単価の決定（確定ルール 2026/07）:
 *   - 顧客請求単価はエリア区分で決定（取引先列は請求先識別のみ）
 *   - コース空白行（仲山さん等）は取引先で決定: フェイト¥167 / k-dash¥163
 *   - ドライバー卸単価は「ドライバー一覧」タブの単価列（M2）
 *
 * スクリプトプロパティ:
 *   EXPENSE_SPREADSHEET_ID … 経費データのスプレッドシートID（経費申請アプリのDB）
 *   EXPENSE_TAB_NAME       … 経費タブ名（既定 'expenses'）
 *   INVOICE_REGISTRATION_NO… インボイス登録番号（請求書に印字）
 */

var TAX_RATE = 0.10;

/** 消費税（四捨五入・2026/07ユーザー確定。旧GASの切捨てから変更）。 */
function calcTax_(subtotal) {
  return Math.round(subtotal * TAX_RATE);
}

/* ============================================================
 * ドライバー卸単価（M2: ドライバー一覧タブの単価列）
 * ============================================================ */

/**
 * ドライバー一覧タブから フルネーム→{rate, rank} を作る。
 * 見出し「フルネーム」「単価」を持つタブを自動判定（buildNameMaster_ と同じタブ）。
 */
function buildDriverRateMaster_() {
  var ss = sourceSpreadsheet_();
  var sheets = ss.getSheets();
  var map = {};
  for (var s = 0; s < sheets.length; s++) {
    var vals = sheets[s].getDataRange().getValues();
    var hi = -1, ci = {};
    for (var i = 0; i < Math.min(vals.length, 10); i++) {
      var row = vals[i].map(function (x) { return String(x).trim(); });
      if (row.indexOf('フルネーム') >= 0 && row.indexOf('単価') >= 0) {
        hi = i;
        ci.full = row.indexOf('フルネーム');
        ci.rate = row.indexOf('単価');
        ci.rank = row.indexOf('ランク');
        break;
      }
    }
    if (hi < 0) continue;
    for (var r = hi + 1; r < vals.length; r++) {
      var full = String(vals[r][ci.full]).trim();
      var rate = Number(vals[r][ci.rate]);
      if (!full) continue;
      map[full] = { rate: isNaN(rate) ? 0 : rate, rank: ci.rank >= 0 ? String(vals[r][ci.rank]).trim() : '' };
    }
    if (Object.keys(map).length) break;
  }
  return map;
}

/* ============================================================
 * 宅配: 1実績行の単価解決（顧客請求用）
 * ============================================================ */

/**
 * 実績1行の顧客請求単価を返す。確定ルール（エリア区分／空白行は取引先）。
 * @return {Object} { rate, area, resolved:boolean }
 */
function resolveCustomerRate_(rec) {
  if (rec.course === '') {
    var b = BLANK_COURSE_RATE_BY_TORIHIKI[rec.torihiki];
    return b ? { rate: b.kanryo, area: '(取引先:' + rec.torihiki + ')', resolved: true }
             : { rate: 0, area: '', resolved: false };
  }
  var hits = classifyArea_(normalizeCourse_(rec.course));
  if (!hits.length) return { rate: 0, area: '', resolved: false };
  // 複数エリア混在は主エリア（先頭ヒット）の単価を全数適用（暫定・M4残課題）
  return { rate: HAITATSU_RATES[hits[0]].kanryo, area: hits[0], resolved: true };
}

/* ============================================================
 * F-102/F-103: 顧客用請求データ（宅配・取引先ごと）
 * ============================================================ */

/**
 * 対象月の宅配売上を取引先ごとに集計する。
 * @param {string} yyyymm 例 '2026/02'
 * @param {Array=} confirmedRecs 照合済み確定実績（省略時は全実績＝照合前の粗集計）
 */
function computeHaitatsuSales(yyyymm, confirmedRecs) {
  var recs = confirmedRecs || readJissekiRecords_();
  recs = recs.filter(function (r) { return r.date.indexOf(yyyymm) === 0; });
  var byTori = {}; // 取引先 -> { areas: {area:{kanryo,amt}}, neko, nekoAmt, unresolved:[] }
  recs.forEach(function (r) {
    var t = r.torihiki || '(取引先不明)';
    if (!byTori[t]) byTori[t] = { areas: {}, neko: 0, nekoAmt: 0, unresolved: [] };
    var cr = resolveCustomerRate_(r);
    if (!cr.resolved) { byTori[t].unresolved.push(r); return; }
    var a = byTori[t].areas[cr.area] || (byTori[t].areas[cr.area] = { kanryo: 0, amt: 0, rate: cr.rate });
    a.kanryo += r.kanryo;
    a.amt += r.kanryo * cr.rate;
    byTori[t].neko += r.nekopos;
    byTori[t].nekoAmt += r.nekopos * HAITATSU_RATES['上高'].nekopos; // ネコポスは一律¥50
  });

  var out = [];
  Object.keys(byTori).forEach(function (t) {
    var d = byTori[t];
    var sub = d.nekoAmt;
    Object.keys(d.areas).forEach(function (a) { sub += d.areas[a].amt; });
    var tax = calcTax_(sub);
    out.push({
      torihiki: t, areas: d.areas, neko: d.neko, nekoAmt: d.nekoAmt,
      subtotal: sub, tax: tax, total: sub + tax, unresolved: d.unresolved
    });
  });
  return out;
}

/* ============================================================
 * F-101: 企業配売上（回数制）
 * ============================================================ */

/**
 * 企業配 単価マスタ（付録A・正本）。基本単価=顧客請求、他はドライバー区分別卸単価。
 * ソースの企業配単価タブから読むのが正だが、タブ特定前の既定値としてv5付録Aを内蔵。
 */
var KIGYOHAI_RATES = {
  '吉祥寺':         { base: 10000, nakayama: 4500,  member: 7000,  arbeit: 5000,  corp: 8000 },
  '立川':           { base: 10000, nakayama: 5000,  member: 8000,  arbeit: 6500,  corp: 9000 },
  '豊洲':           { base: 17143, nakayama: 10000, member: 14571, arbeit: 11000, corp: 15429 },
  '縁：千代田':     { base: 5000,  nakayama: 3000,  member: 4000,  arbeit: 3000,  corp: 4500 },
  '縁：新宿文京':   { base: 15000, nakayama: null,  member: 11000, arbeit: 9000,  corp: 13500 },
  '縁：新宿渋谷':   { base: 10000, nakayama: null,  member: 7000,  arbeit: 6000,  corp: 8000 },
  'コージーコーナー': { base: 20000, nakayama: null,  member: 15000, arbeit: 11000, corp: 17000 },
  '海老徳':         { base: 11000, nakayama: null,  member: 9000,  arbeit: 8000,  corp: 10000 },
  '日比谷':         { base: 15500, nakayama: 6000,  member: 12500, arbeit: 9500,  corp: 14000 },
  '東武':           { base: 12500, nakayama: 5500,  member: 10000, arbeit: 8500,  corp: 11000 }
};

/**
 * 企業配の稼働実績 [{date, project, driver, count}] から売上を案件ごとに集計。
 * 実績の入力元（シフト下部の企業配達実績ブロック等）はタブ構造確定後に接続する。
 */
function computeKigyohaiSales(kigyohaiRecs) {
  var byProj = {};
  var unknown = [];
  (kigyohaiRecs || []).forEach(function (r) {
    var m = KIGYOHAI_RATES[r.project];
    if (!m) { unknown.push(r); return; }
    if (!byProj[r.project]) byProj[r.project] = { count: 0, base: m.base, amt: 0 };
    var n = r.count || 1;
    byProj[r.project].count += n;
    byProj[r.project].amt += m.base * n;
  });
  var sub = 0;
  Object.keys(byProj).forEach(function (p) { sub += byProj[p].amt; });
  return { projects: byProj, subtotal: sub, tax: calcTax_(sub), total: sub + calcTax_(sub), unknown: unknown };
}

/* ============================================================
 * F-201/F-202: ドライバー支払（卸単価＋立替経費）
 * ============================================================ */

/** 経費データ（経費申請アプリのスプレッドシートDB）から当月・承認済みの経費を読む。 */
function readApprovedExpenses_(yyyymm) {
  var id = prop_('EXPENSE_SPREADSHEET_ID');
  if (!id) return {}; // 未接続なら経費ゼロで返す（明細に注記）
  var tab = prop_('EXPENSE_TAB_NAME') || 'expenses';
  var sh = SpreadsheetApp.openById(id).getSheetByName(tab);
  if (!sh) return {};
  var vals = sh.getDataRange().getValues();
  var head = vals[0].map(String);
  var ci = {
    applicant: head.indexOf('applicant'), date: head.indexOf('date'),
    amount: head.indexOf('amount'), status: head.indexOf('status'),
    category: head.indexOf('category'), vendor: head.indexOf('vendor')
  };
  var ymKey = yyyymm.replace('/', '-'); // 経費アプリの date は yyyy-MM-dd
  var byDriver = {};
  for (var i = 1; i < vals.length; i++) {
    var st = String(vals[i][ci.status]).trim();
    var dt = String(vals[i][ci.date]).trim();
    if (st !== 'approved') continue;
    if (dt.indexOf(ymKey) !== 0 && dt.indexOf(yyyymm) !== 0) continue;
    var who = String(vals[i][ci.applicant]).trim();
    if (!byDriver[who]) byDriver[who] = { total: 0, items: [] };
    var amt = Number(vals[i][ci.amount]) || 0;
    byDriver[who].total += amt;
    byDriver[who].items.push({
      date: dt, category: String(vals[i][ci.category]), vendor: String(vals[i][ci.vendor]), amount: amt
    });
  }
  return byDriver;
}

/**
 * 対象月のドライバー支払（宅配分＋経費）を集計。
 * ネコポス卸単価は ¥50（2026/07確定）。卸単価は税込契約のため消費税は加算しない（同確定）。
 * @param {string} yyyymm
 * @param {Array=} confirmedRecs 照合済み確定実績（省略時は全実績）
 */
function computeDriverPay(yyyymm, confirmedRecs) {
  var recs = (confirmedRecs || readJissekiRecords_()).filter(function (r) { return r.date.indexOf(yyyymm) === 0; });
  var rates = buildDriverRateMaster_();
  var nameMaster = buildNameMaster_();
  var expenses = readApprovedExpenses_(yyyymm);

  var byDriver = {};
  var noRate = {};
  recs.forEach(function (r) {
    var full = resolveName_(r.name, nameMaster);
    var rm = rates[full];
    if (!rm || !rm.rate) { noRate[full] = true; return; }
    if (!byDriver[full]) byDriver[full] = { kanryo: 0, neko: 0, workAmt: 0, expense: 0, expenseItems: [], rate: rm.rate };
    var d = byDriver[full];
    d.kanryo += r.kanryo;
    d.neko += r.nekopos;
    d.workAmt += r.kanryo * rm.rate + r.nekopos * 50; // ネコポス卸¥50（確定）
  });
  Object.keys(byDriver).forEach(function (full) {
    var e = expenses[full];
    if (e) { byDriver[full].expense = e.total; byDriver[full].expenseItems = e.items; }
    var d = byDriver[full];
    d.subtotal = d.workAmt;
    d.total = d.subtotal + d.expense; // 卸単価は税込契約＝消費税加算なし。経費は全額精算
  });
  return { drivers: byDriver, noRate: Object.keys(noRate) };
}

/* ============================================================
 * 帳票生成（ALTEQフォーマット準拠・別ファイルへ出力）
 * ============================================================ */

/** 請求番号: YYYYMM-連番（旧実装踏襲・Q5）。 */
function invoiceNo_(yyyymm, seq) {
  return yyyymm.replace('/', '') + '-' + ('0' + seq).slice(-2);
}

/**
 * 顧客用請求書シートを生成（1取引先=1タブ）。経費は載せない（会社負担）。
 * @return {string} 出力先URL
 */
function generateCustomerInvoices(yyyymm) {
  var sales = computeHaitatsuSales(yyyymm);
  var ss = outputSpreadsheet_();
  var reg = prop_('INVOICE_REGISTRATION_NO') || '';
  var seq = 0;
  sales.forEach(function (s) {
    seq++;
    var name = '請求書_' + yyyymm.replace('/', '') + '_' + s.torihiki;
    var sh = ss.getSheetByName(name);
    if (sh) sh.clear(); else sh = ss.insertSheet(name);
    var rows = [];
    rows.push(['請 求 書', '', '', '', '']);
    rows.push(['請求書番号', invoiceNo_(yyyymm, seq), '', '発行日', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd')]);
    rows.push([s.torihiki + ' 御中', '', '', '', '']);
    if (reg) rows.push(['登録番号', reg, '', '', '']);
    rows.push(['対象月', yyyymm, '', '', '']);
    rows.push(['', '', '', '', '']);
    rows.push(['品目', '数量', '単価(税抜)', '金額(税抜)', '備考']);
    Object.keys(s.areas).forEach(function (a) {
      var d = s.areas[a];
      rows.push(['宅配完了（' + a + '）', d.kanryo, d.rate, d.amt, '']);
    });
    rows.push(['ネコポス', s.neko, 50, s.nekoAmt, '全エリア一律']);
    rows.push(['', '', '', '', '']);
    rows.push(['', '', '小計(税抜)', s.subtotal, '']);
    rows.push(['', '', '消費税(10%)', s.tax, '端数四捨五入']);
    rows.push(['', '', '税込合計', s.total, '']);
    sh.getRange(1, 1, rows.length, 5).setValues(rows);
    sh.getRange(7, 1, 1, 5).setFontWeight('bold');
    sh.getRange(rows.length, 3, 1, 2).setFontWeight('bold');
    if (s.unresolved.length) {
      sh.getRange(rows.length + 2, 1).setValue('⚠ 単価未解決 ' + s.unresolved.length + '行（要M4確認）');
    }
  });
  Logger.log('請求書 %s 枚を生成: %s', sales.length, ss.getUrl());
  return ss.getUrl();
}

/**
 * ドライバー用支払明細シートを生成（1ドライバー=1タブ）。立替経費を全額載せる。
 * @return {string} 出力先URL
 */
function generateDriverStatements(yyyymm) {
  var pay = computeDriverPay(yyyymm);
  var ss = outputSpreadsheet_();
  Object.keys(pay.drivers).forEach(function (full) {
    var d = pay.drivers[full];
    var name = '支払明細_' + yyyymm.replace('/', '') + '_' + full;
    var sh = ss.getSheetByName(name);
    if (sh) sh.clear(); else sh = ss.insertSheet(name);
    var rows = [];
    rows.push(['支 払 明 細 書', '', '', '', '']);
    rows.push([full + ' 様', '', '対象月', yyyymm, '']);
    rows.push(['', '', '', '', '']);
    rows.push(['品目', '数量', '単価(税込)', '金額(税込)', '備考']);
    rows.push(['宅配完了', d.kanryo, d.rate, d.kanryo * d.rate, 'ドライバー卸単価（税込契約）']);
    rows.push(['ネコポス', d.neko, 50, d.neko * 50, '']);
    rows.push(['', '', '小計(税込)', d.subtotal, '消費税加算なし']);
    rows.push(['', '', '', '', '']);
    rows.push(['立替経費（全額精算）', '', '', d.expense, d.expenseItems.length + '件']);
    d.expenseItems.forEach(function (e) {
      rows.push(['  ' + e.date + ' ' + e.category, '', '', e.amount, e.vendor]);
    });
    rows.push(['', '', '支払合計', d.total, '税込＋経費']);
    sh.getRange(1, 1, rows.length, 5).setValues(rows);
    sh.getRange(4, 1, 1, 5).setFontWeight('bold');
    sh.getRange(rows.length, 3, 1, 2).setFontWeight('bold');
  });
  if (pay.noRate.length) Logger.log('⚠ 卸単価未登録: %s', pay.noRate.join('、'));
  Logger.log('支払明細 %s 枚を生成: %s', Object.keys(pay.drivers).length, ss.getUrl());
  return ss.getUrl();
}

/** Step 4 一括実行（対象月を指定）。例: runStep4('2026/02') */
function runStep4(yyyymm) {
  if (!yyyymm) yyyymm = '2026/02';
  Logger.log('===== Step 4: 請求・支払計算 %s =====', yyyymm);
  var url1 = generateCustomerInvoices(yyyymm);
  var url2 = generateDriverStatements(yyyymm);
  Logger.log('完了: %s', url1);
}
