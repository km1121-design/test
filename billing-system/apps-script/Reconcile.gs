/**
 * 配送 請求・支払・実績照合システム — Step 3: 実績照合（フェーズ1）
 *
 * 要件定義書 v5 F-001/F-002。シフト（予定）× 配送実績（実際）を
 *   照合キー = 日付 × ドライバー（フルネーム）× 案件/コース
 * で突き合わせ、以下を検出する。
 *   P1: 予定あり実績なし（欠勤/未報告）
 *   P2: 実績あり予定なし（予定外稼働）
 *   P3: 案件相違（予定と実績でエリア/案件が違う）
 *   P4: 一致（→ 確定実績として Step 4 請求・支払へ引き渡す）
 *
 * ★ 前提と実データ都合:
 *   - シフトはドライバー×日付マトリクス（セル値＝案件名）。月ごとに別タブ。
 *   - シフトのドライバー名は【姓のみ】の月がある（例 2026/03「赤羽」）。実績はフルネーム。
 *     → M5 名寄せ（buildNameMaster_）で 姓/フルネーム を相互解決する。
 *   - セル値には宅配コース（上高井戸1大 等）と企業配案件（豊洲・日比谷・縁 等）が混在。
 *     宅配は M4（classifyArea_）でエリアに正規化して照合、企業配は案件名で照合する。
 *   - 「休」「S待機」「MTG」「研修」「出張」等は非稼働として予定から除外。
 *
 * ★ hard constraint: シフト・実績シートは読み取り専用。レポートは別ファイルへ出力。
 *
 * スクリプトプロパティ:
 *   SHIFT_SPREADSHEET_ID … シフトシートID（既定 DEFAULT_SHIFT_ID）
 */

var DEFAULT_SHIFT_ID = '1Fbiy1oe5Ujs1uC5JjPO3HsH5dROJkjOYeF7WmwpHry8';

function shiftSpreadsheet_() {
  return SpreadsheetApp.openById(prop_('SHIFT_SPREADSHEET_ID') || DEFAULT_SHIFT_ID);
}

/* ============================================================
 * M5 名寄せ（姓 ⇔ フルネーム）
 * ============================================================ */

/**
 * ドライバー一覧タブ（実績シート内）から 姓→フルネーム / フルネーム→フルネーム の
 * 解決表を作る。見出し「氏名」（姓）と「フルネーム」を持つタブを自動判定。
 * @return {Object} name(任意表記) -> フルネーム
 */
function buildNameMaster_() {
  var ss = sourceSpreadsheet_();
  var sheets = ss.getSheets();
  var map = {};
  for (var s = 0; s < sheets.length; s++) {
    var vals = sheets[s].getDataRange().getValues();
    // 見出し行を探す（「氏名」と「フルネーム」を含む行）
    var hi = -1, ci = {};
    for (var i = 0; i < Math.min(vals.length, 10); i++) {
      var row = vals[i].map(function (x) { return String(x).trim(); });
      if (row.indexOf('氏名') >= 0 && row.indexOf('フルネーム') >= 0) {
        hi = i;
        ci.sei = row.indexOf('氏名');
        ci.full = row.indexOf('フルネーム');
        break;
      }
    }
    if (hi < 0) continue;
    for (var r = hi + 1; r < vals.length; r++) {
      var sei = String(vals[r][ci.sei]).trim();
      var full = String(vals[r][ci.full]).trim();
      if (!full) continue;
      map[full] = full;
      if (sei) map[sei] = full;
    }
    if (Object.keys(map).length) break;
  }
  return map;
}

/** 任意のドライバー表記をフルネームへ解決。未知はそのまま返す。 */
function resolveName_(name, nameMaster) {
  var n = String(name).trim();
  if (nameMaster[n]) return nameMaster[n];
  // 姓だけが渡り、マスタのキーが姓のケースは上で解決済み。前方一致でも試す。
  var keys = Object.keys(nameMaster);
  for (var i = 0; i < keys.length; i++) {
    if (nameMaster[keys[i]].indexOf(n) === 0) return nameMaster[keys[i]];
  }
  return n;
}

/* ============================================================
 * シフトセルの分類（宅配エリア / 企業配案件 / 非稼働）
 * ============================================================ */

// 非稼働・稼働ではない予定を表すセル（前方一致・部分一致で判定）
var NON_WORK_TOKENS = ['休', 'S待機', 'S 待機', '待機', 'MTG', 'mtg', '出張', '研修', '見学',
  'アポ', '面接', 'セミナー', 'コンペ', '内見', 'クリニック', '○', '◯', '◆', '・', '-', '−', '—'];

// 企業配 案件名（付録A + 実データの表記。部分一致で検出）
var KIGYOHAI_PROJECTS = ['豊洲', '日比谷', '東武', '吉祥寺', '立川', 'コージーコーナー', '海老徳',
  '建築現場', '縁', 'put', 'Put', 'たいやき', 'たい焼き', '特便', 'ソエル', '夜勤', '三茶'];

/**
 * シフトセル値を正規化（注記除去）。改行・全角空白・時刻注記・研修注記などを落とす。
 */
function normalizeShiftCell_(raw) {
  var s = String(raw == null ? '' : raw);
  s = s.replace(/[\r\n]+/g, ' ');
  if (s.normalize) s = s.normalize('NFKC');
  s = s.replace(/[（(][^）)]*[）)]/g, '');       // (研修) 等の括弧注記
  s = s.replace(/\d+時[^ ]*/g, '');               // 17時まで 等
  s = s.replace(/[＋+]S/g, '');                    // ＋S（サポート）注記
  s = s.replace(/[ \t　]+/g, ' ').trim();
  return s;
}

/**
 * シフトセルを分類。
 * @return {Object} { work:boolean, type:'宅配'|'企業配'|'不明', areas:[], project:'', raw }
 */
function classifyShiftCell_(raw) {
  var norm = normalizeShiftCell_(raw);
  if (!norm) return { work: false, type: '', areas: [], project: '', raw: raw };
  // 非稼働判定（セル全体が非稼働トークンのみ、または明確な非稼働語を含む）
  for (var i = 0; i < NON_WORK_TOKENS.length; i++) {
    var t = NON_WORK_TOKENS[i];
    if (norm === t) return { work: false, type: '', areas: [], project: '', raw: raw };
  }
  if (/^休/.test(norm)) return { work: false, type: '', areas: [], project: '', raw: raw };

  // 企業配案件を含むか
  var project = '';
  for (var k = 0; k < KIGYOHAI_PROJECTS.length; k++) {
    if (norm.indexOf(KIGYOHAI_PROJECTS[k]) >= 0) { project = KIGYOHAI_PROJECTS[k]; break; }
  }
  // 宅配エリア（M4 と同じ判定）
  var areas = classifyArea_(normalizeCourse_(norm));
  if (areas.length) return { work: true, type: '宅配', areas: areas, project: project, raw: raw };
  if (project) return { work: true, type: '企業配', areas: [], project: project, raw: raw };
  // 具体的なコース/案件が取れず、非稼働語（研修・見学・待機等）を含むだけのセルは非稼働扱い。
  var softNonWork = ['研修', '見学', 'MTG', '出張', 'アポ', '面接', 'セミナー', 'コンペ', '内見', '待機'];
  for (var m = 0; m < softNonWork.length; m++) {
    if (norm.indexOf(softNonWork[m]) >= 0) return { work: false, type: '', areas: [], project: '', raw: raw };
  }
  return { work: true, type: '不明', areas: [], project: '', raw: raw };
}

/* ============================================================
 * シフト月次読み込み（マトリクス→レコード）
 * ============================================================ */

/**
 * 指定タブのシフトマトリクスを {date, driver(full), cell, cls} の配列に展開する。
 * 稼働セル（work=true）のみ返す。
 */
function readShiftMonth_(tabName, nameMaster) {
  var sh = shiftSpreadsheet_().getSheetByName(tabName);
  if (!sh) throw new Error('シフトタブが見つかりません: ' + tabName);
  var vals = sh.getDataRange().getValues();

  // 年月をタブ名から推定（例 "2026/03" → 2026,3）。無ければ先頭セルの日付から。
  var ym = /(20\d\d)[\/\-](\d{1,2})/.exec(tabName);
  var year, month;
  if (ym) { year = +ym[1]; month = +ym[2]; }

  // 日番号ヘッダー行を探す（col1 が「稼働」の行、その行の各列が 1..31 の数字）
  var headRow = -1;
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i].map(function (x) { return String(x).trim(); });
    if (r[1] === '稼働' && r[2] === '休') { headRow = i; break; }
  }
  if (headRow < 0) throw new Error('シフトの日番号ヘッダー行が見つかりません: ' + tabName);

  // 列→日番号
  var colDay = {};
  var hr = vals[headRow];
  for (var c = 3; c < hr.length; c++) {
    var d = parseInt(String(hr[c]).trim(), 10);
    if (d >= 1 && d <= 31) colDay[c] = d;
  }

  var out = [];
  for (var rr = headRow + 1; rr < vals.length; rr++) {
    var name0 = String(vals[rr][0]).trim();
    if (!name0) continue;
    var full = resolveName_(name0, nameMaster);
    // ドライバー行のみ扱う（名寄せで解決できた＝マスタ登録者）
    if (full === name0 && !nameMaster[name0]) continue;
    for (var col in colDay) {
      col = +col;
      var cell = vals[rr][col];
      if (cell === '' || cell == null) continue;
      var cls = classifyShiftCell_(cell);
      if (!cls.work) continue;
      var day = colDay[col];
      var dateStr = year ? Utilities.formatDate(new Date(year, month - 1, day), Session.getScriptTimeZone(), 'yyyy/MM/dd') : (month + '/' + day);
      out.push({ date: dateStr, driver: full, cell: String(cell).trim(), cls: cls });
    }
  }
  return out;
}

/* ============================================================
 * 照合
 * ============================================================ */

/** 実績レコードをエリア/案件へ正規化して {date, driver, areas[], project} に。 */
function jissekiToKeys_(rec, nameMaster) {
  var driver = resolveName_(rec.name, nameMaster);
  if (rec.course === '') {
    // コース空白（仲山さん等）: 取引先でエリア相当を決める（宅配）
    var byTori = BLANK_COURSE_RATE_BY_TORIHIKI[rec.torihiki];
    return { date: rec.date, driver: driver, areas: byTori ? ['(取引先:' + rec.torihiki + ')'] : [], project: '', rec: rec };
  }
  var areas = classifyArea_(normalizeCourse_(rec.course));
  return { date: rec.date, driver: driver, areas: areas, project: '', rec: rec };
}

/**
 * 指定月の照合を実行。yyyymm 例 '2026/02'。shiftTab はシフトのタブ名。
 * @return {Array<Object>} 照合結果（P1〜P4）
 */
function reconcileMonth(shiftTab, yyyymm) {
  var nameMaster = buildNameMaster_();
  var jAll = readJissekiRecords_().filter(function (r) { return r.date.indexOf(yyyymm) === 0; });
  var shift = readShiftMonth_(shiftTab, nameMaster);

  // index: key = date|driver
  function key(d, drv) { return d + '|' + drv; }
  var jMap = {}; // key -> [jissekiKeys]
  jAll.forEach(function (r) {
    var jk = jissekiToKeys_(r, nameMaster);
    (jMap[key(jk.date, jk.driver)] = jMap[key(jk.date, jk.driver)] || []).push(jk);
  });
  var sMap = {}; // key -> [shift]
  shift.forEach(function (s) {
    (sMap[key(s.date, s.driver)] = sMap[key(s.date, s.driver)] || []).push(s);
  });

  var results = [];
  var allKeys = {};
  Object.keys(jMap).forEach(function (k) { allKeys[k] = true; });
  Object.keys(sMap).forEach(function (k) { allKeys[k] = true; });

  Object.keys(allKeys).forEach(function (k) {
    var parts = k.split('|');
    var date = parts[0], driver = parts[1];
    var js = jMap[k] || [];
    var ss = sMap[k] || [];
    var jAreas = {};
    js.forEach(function (j) { j.areas.forEach(function (a) { jAreas[a] = true; }); });
    var sAreas = {}, sProjects = {};
    ss.forEach(function (s) {
      s.cls.areas.forEach(function (a) { sAreas[a] = true; });
      if (s.cls.project) sProjects[s.cls.project] = true;
    });

    var plannedWork = ss.length > 0;
    var actualWork = js.length > 0;
    var cat, note = '';
    if (plannedWork && !actualWork) {
      cat = 'P1'; note = '予定あり実績なし';
    } else if (!plannedWork && actualWork) {
      cat = 'P2'; note = '実績あり予定なし';
    } else {
      // 双方あり: エリア/案件の一致を見る
      var jset = Object.keys(jAreas);
      var sset = Object.keys(sAreas);
      var overlap = jset.some(function (a) { return sAreas[a]; });
      // 企業配案件は実績（宅配数）に出ないため、シフトが企業配のみなら宅配実績と別物扱い
      var shiftKigyoOnly = sset.length === 0 && Object.keys(sProjects).length > 0;
      if (overlap) { cat = 'P4'; note = '一致'; }
      else if (shiftKigyoOnly) { cat = 'P3'; note = '案件相違(予定=企業配/実績=宅配)'; }
      else { cat = 'P3'; note = '案件相違'; }
    }

    results.push({
      date: date, driver: driver, category: cat, note: note,
      shift: ss.map(function (s) { return s.cell; }).join(' / '),
      shiftAreas: Object.keys(sAreas).join(',') || (Object.keys(sProjects).join(',')),
      jisseki: js.map(function (j) { return j.rec.course || ('(空白/' + j.rec.torihiki + ')'); }).join(' / '),
      jissekiAreas: Object.keys(jAreas).join(',')
    });
  });

  results.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.driver < b.driver ? -1 : 1;
  });
  return results;
}

/** 照合結果を出力スプレッドシートの「照合_YYYYMM」タブへ書き出す。 */
function writeReconcileReport(shiftTab, yyyymm) {
  var res = reconcileMonth(shiftTab, yyyymm);
  var ss = outputSpreadsheet_();
  var name = '照合_' + yyyymm.replace('/', '');
  var sh = ss.getSheetByName(name);
  if (sh) sh.clear(); else sh = ss.insertSheet(name);
  var header = ['日付', 'ドライバー', '判定', '内容', 'シフト予定', '予定エリア/案件', '実績コース', '実績エリア'];
  var rows = res.map(function (r) {
    return [r.date, r.driver, r.category, r.note, r.shift, r.shiftAreas, r.jisseki, r.jissekiAreas];
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  sh.setFrozenRows(1);

  // サマリ
  var cnt = { P1: 0, P2: 0, P3: 0, P4: 0 };
  res.forEach(function (r) { cnt[r.category]++; });
  Logger.log('照合 %s: P1=%s P2=%s P3=%s P4(一致)=%s', yyyymm, cnt.P1, cnt.P2, cnt.P3, cnt.P4);
  return { url: ss.getUrl(), summary: cnt };
}
