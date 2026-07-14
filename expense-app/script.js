"use strict";

/* =========================================================================
 * 経費申請アプリ — クライアント完結型（localStorage 保存 / 端末内OCR）
 * ========================================================================= */

const STORE_KEY = "expense-app:expenses";
const USER_KEY = "expense-app:currentUser";

/** @typedef {{
 *   id:string, applicant:string, date:string, category:string, vendor:string,
 *   amount:number, description:string, imageThumb:string|null,
 *   status:'pending'|'approved'|'rejected', createdAt:string,
 *   reviewedAt:string|null, reviewer:string|null, reviewComment:string|null
 * }} Expense */

const state = {
  /** @type {Expense[]} */
  expenses: [],
  currentUser: "",
  isAdmin: false,
  activeTab: "apply",
  lastImageThumb: /** @type {string|null} */ (null),
};

/* ---------- storage ---------- */
function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    state.expenses = raw ? JSON.parse(raw) : [];
  } catch {
    state.expenses = [];
  }
}
function saveExpenses() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.expenses));
}

/* ---------- helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function yen(n) {
  return "¥" + (Number(n) || 0).toLocaleString("ja-JP");
}
function uid() {
  return "e" + Date.now().toString(36) + Math.floor(performance.now()).toString(36);
}
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
const STATUS_LABEL = { pending: "申請中", approved: "承認済み", rejected: "却下" };

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

/* =========================================================================
 * 画像解析（OCR）— レシートから金額・日付・店名を推定
 * ========================================================================= */

/** 数字文字列（全角・カンマ・円記号混じり）を整数に */
function parseAmount(str) {
  const normalized = str
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[，,]/g, "")
    .replace(/[^\d]/g, "");
  return normalized ? parseInt(normalized, 10) : NaN;
}

/** OCRテキストから合計金額を推定 */
function extractAmount(text) {
  const lines = text.split(/\r?\n/);
  const keywords = /(合\s*計|税込|お?支払|総額|請求|計)/;
  const candidates = [];

  for (const line of lines) {
    // 「¥」「円」を含む、または金額キーワード行の数字を候補に
    const hasMoneyMark = /[¥￥]|円/.test(line);
    const hasKeyword = keywords.test(line);
    if (!hasMoneyMark && !hasKeyword) continue;

    const nums = line.match(/[¥￥]?\s*[\d０-９][\d０-９,，]*/g) || [];
    for (const raw of nums) {
      const v = parseAmount(raw);
      if (!isNaN(v) && v >= 10 && v <= 100000000) {
        // 「合計」系キーワードを含む行は優先度を上げる
        candidates.push({ v, weight: hasKeyword ? 2 : 1 });
      }
    }
  }
  if (!candidates.length) return null;

  // キーワード付きがあればその最大値、無ければ全体の最大値を採用
  const keyed = candidates.filter((c) => c.weight === 2);
  const pool = keyed.length ? keyed : candidates;
  return pool.reduce((m, c) => Math.max(m, c.v), 0);
}

/** OCRテキストから日付を推定（YYYY年MM月DD日 / YYYY/MM/DD 等） */
function extractDate(text) {
  const t = text.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0)
  );
  const patterns = [
    /(\d{4})\s*[年\/\.\-]\s*(\d{1,2})\s*[月\/\.\-]\s*(\d{1,2})/,
    /(\d{2})\s*[\/\.\-]\s*(\d{1,2})\s*[\/\.\-]\s*(\d{1,2})/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      let [, y, mo, d] = m;
      if (y.length === 2) y = "20" + y;
      const yy = Number(y), mm = Number(mo), dd = Number(d);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      }
    }
  }
  return null;
}

/** OCRテキストから店名を推定（先頭付近の意味のある行） */
function extractVendor(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2);
  for (const line of lines.slice(0, 5)) {
    // 数字・記号・日付だらけの行はスキップ
    if (/^[\d\s¥￥,.\-\/:]+$/.test(line)) continue;
    if (/(領\s*収\s*書|レシート|receipt)/i.test(line)) continue;
    return line.slice(0, 40);
  }
  return null;
}

/** 画像を縮小してサムネイル用 dataURL を返す */
function makeThumb(file, maxSize = 480) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function runOcr(file) {
  const statusEl = $("#ocrStatus");
  const barFill = $("#ocrBarFill");
  const statusText = $("#ocrStatusText");
  const rawWrap = $("#ocrRawWrap");
  const rawEl = $("#ocrRaw");

  if (typeof Tesseract === "undefined") {
    toast("OCRライブラリを読み込めませんでした（ネットワークをご確認ください）");
    return;
  }

  statusEl.hidden = false;
  rawWrap.hidden = true;
  barFill.style.width = "0%";
  statusText.textContent = "画像を解析中…";

  try {
    const { data } = await Tesseract.recognize(file, "jpn+eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round(m.progress * 100);
          barFill.style.width = pct + "%";
          statusText.textContent = `文字を認識中… ${pct}%`;
        } else {
          statusText.textContent = m.status;
        }
      },
    });

    const text = data.text || "";
    rawEl.textContent = text.trim() || "(テキストを検出できませんでした)";
    rawWrap.hidden = false;

    const amount = extractAmount(text);
    const date = extractDate(text);
    const vendor = extractVendor(text);

    const filled = [];
    if (amount != null) {
      $("#expAmount").value = amount;
      filled.push("金額");
    }
    if (date) {
      $("#expDate").value = date;
      filled.push("日付");
    }
    if (vendor) {
      $("#expVendor").value = vendor;
      filled.push("店名");
    }

    statusText.textContent = filled.length
      ? `解析完了：${filled.join("・")}を自動入力しました（内容をご確認ください）`
      : "解析完了：自動抽出できた項目はありません。手入力してください。";
  } catch (err) {
    console.error(err);
    statusText.textContent = "解析に失敗しました。手入力してください。";
  }
}

/* =========================================================================
 * 申請フォーム
 * ========================================================================= */

async function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    toast("画像ファイルを選択してください");
    return;
  }
  const thumb = await makeThumb(file);
  state.lastImageThumb = thumb;
  const preview = $("#preview");
  $("#previewImg").src = thumb || "";
  preview.hidden = false;
  runOcr(file);
}

function clearImage() {
  state.lastImageThumb = null;
  $("#preview").hidden = true;
  $("#previewImg").src = "";
  $("#imageInput").value = "";
  $("#ocrStatus").hidden = true;
  $("#ocrRawWrap").hidden = true;
}

function submitExpense(evt) {
  evt.preventDefault();
  if (!state.currentUser) {
    toast("先に画面右上でログインユーザー（氏名）を入力してください");
    $("#currentUser").focus();
    return;
  }
  const amount = Number($("#expAmount").value);
  if (!$("#expDate").value || !amount || amount <= 0) {
    toast("日付と金額（1円以上）は必須です");
    return;
  }

  /** @type {Expense} */
  const exp = {
    id: uid(),
    applicant: state.currentUser,
    date: $("#expDate").value,
    category: $("#expCategory").value,
    vendor: $("#expVendor").value.trim(),
    amount,
    description: $("#expDesc").value.trim(),
    imageThumb: state.lastImageThumb,
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewer: null,
    reviewComment: null,
  };
  state.expenses.unshift(exp);
  saveExpenses();

  $("#expenseForm").reset();
  clearImage();
  toast("経費を申請しました");
  render();
}

/* =========================================================================
 * 個人ダッシュボード
 * ========================================================================= */

function renderPersonal() {
  const user = state.currentUser;
  const mine = state.expenses.filter((e) => e.applicant === user);

  const sum = (arr) => arr.reduce((t, e) => t + e.amount, 0);
  const pending = mine.filter((e) => e.status === "pending");
  const approved = mine.filter((e) => e.status === "approved");

  $("#personalStats").innerHTML = user
    ? [
        statCard("申請件数", mine.length + " 件"),
        statCard("申請中", pending.length + " 件"),
        statCard("承認済み金額", yen(sum(approved)), "is-green"),
        statCard("申請中金額", yen(sum(pending)), "is-accent"),
      ].join("")
    : `<div class="stat"><p class="stat__label">氏名未入力</p><p class="stat__value">—</p></div>`;

  const filter = $("#personalFilter").value;
  const rows = mine.filter((e) => filter === "all" || e.status === filter);
  const tbody = $("#personalTable tbody");

  if (!user) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">右上で氏名を入力すると、自分の申請が表示されます。</td></tr>`;
    return;
  }
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">該当する申請はありません。</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (e) => `
    <tr>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.vendor || "—")}</td>
      <td class="num">${yen(e.amount)}</td>
      <td><span class="badge badge--${e.status}">${STATUS_LABEL[e.status]}</span></td>
      <td>${escapeHtml(e.reviewComment || "")}</td>
      <td>${
        e.status === "pending"
          ? `<button class="btn btn--ghost btn--sm" data-del="${e.id}">取消</button>`
          : ""
      }</td>
    </tr>`
    )
    .join("");
}

/* =========================================================================
 * 管理者ダッシュボード
 * ========================================================================= */

function renderAdmin() {
  const all = state.expenses;
  const sum = (arr) => arr.reduce((t, e) => t + e.amount, 0);
  const pending = all.filter((e) => e.status === "pending");
  const approved = all.filter((e) => e.status === "approved");

  $("#adminStats").innerHTML = [
    statCard("総申請件数", all.length + " 件"),
    statCard("承認待ち", pending.length + " 件", "is-accent"),
    statCard("承認待ち金額", yen(sum(pending)), "is-accent"),
    statCard("承認済み金額", yen(sum(approved)), "is-green"),
  ].join("");

  // 科目別 承認済み金額
  const byCat = {};
  for (const e of approved) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = cats.length ? cats[0][1] : 0;
  $("#adminByCategory").innerHTML = cats.length
    ? cats
        .map(
          ([cat, val]) => `
      <div class="bar-row">
        <span>${escapeHtml(cat)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${
          max ? (val / max) * 100 : 0
        }%"></div></div>
        <span class="bar-val">${yen(val)}</span>
      </div>`
        )
        .join("")
    : `<p class="empty">承認済みの経費はまだありません。</p>`;

  // 一覧
  const q = $("#adminSearch").value.trim().toLowerCase();
  const sf = $("#adminStatusFilter").value;
  const rows = all.filter((e) => {
    const matchQ =
      !q ||
      e.applicant.toLowerCase().includes(q) ||
      (e.vendor || "").toLowerCase().includes(q);
    const matchS = sf === "all" || e.status === sf;
    return matchQ && matchS;
  });

  const tbody = $("#adminTable tbody");
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (e) => `
      <tr>
        <td>${escapeHtml(e.applicant)}</td>
        <td>${escapeHtml(e.date)}</td>
        <td>${escapeHtml(e.category)}</td>
        <td>${escapeHtml(e.vendor || "—")}</td>
        <td class="num">${yen(e.amount)}</td>
        <td><span class="badge badge--${e.status}">${STATUS_LABEL[e.status]}</span></td>
        <td>${
          e.status === "pending"
            ? `<button class="btn btn--sm btn--approve" data-approve="${e.id}">承認</button>
               <button class="btn btn--sm btn--reject" data-reject="${e.id}">却下</button>`
            : `<button class="btn btn--ghost btn--sm" data-reset="${e.id}">差戻</button>`
        }</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="7" class="empty">該当する申請はありません。</td></tr>`;
}

function statCard(label, value, cls = "") {
  return `<div class="stat"><p class="stat__label">${escapeHtml(
    label
  )}</p><p class="stat__value ${cls}">${escapeHtml(value)}</p></div>`;
}

/* ---------- review actions ---------- */
function findExpense(id) {
  return state.expenses.find((e) => e.id === id);
}
function approve(id) {
  const e = findExpense(id);
  if (!e) return;
  e.status = "approved";
  e.reviewedAt = new Date().toISOString();
  e.reviewer = state.currentUser || "管理者";
  e.reviewComment = "";
  saveExpenses();
  toast("承認しました");
  render();
}
function reject(id) {
  const e = findExpense(id);
  if (!e) return;
  const comment = window.prompt("却下理由を入力してください（任意）", "");
  if (comment === null) return; // キャンセル
  e.status = "rejected";
  e.reviewedAt = new Date().toISOString();
  e.reviewer = state.currentUser || "管理者";
  e.reviewComment = comment.trim();
  saveExpenses();
  toast("却下しました");
  render();
}
function resetStatus(id) {
  const e = findExpense(id);
  if (!e) return;
  e.status = "pending";
  e.reviewedAt = null;
  e.reviewer = null;
  e.reviewComment = null;
  saveExpenses();
  toast("申請中に差し戻しました");
  render();
}
function deleteExpense(id) {
  if (!window.confirm("この申請を取り消しますか？")) return;
  state.expenses = state.expenses.filter((e) => e.id !== id);
  saveExpenses();
  toast("申請を取り消しました");
  render();
}

/* =========================================================================
 * タブ / ユーザー / 描画
 * ========================================================================= */

function setTab(tab) {
  if (tab === "admin" && !state.isAdmin) tab = "apply";
  state.activeTab = tab;
  $$(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
  $$(".panel").forEach((p) =>
    p.classList.toggle("is-active", p.dataset.panel === tab)
  );
}

function setAdmin(on) {
  state.isAdmin = on;
  const btn = $("#adminToggle");
  btn.classList.toggle("is-on", on);
  btn.textContent = on ? "管理者モード ON" : "管理者モード";
  $(".is-admin-only").hidden = !on;
  if (!on && state.activeTab === "admin") setTab("apply");
  render();
}

function render() {
  renderPersonal();
  if (state.isAdmin) renderAdmin();
}

/* =========================================================================
 * 初期化
 * ========================================================================= */

function init() {
  loadExpenses();

  // ユーザー復元
  state.currentUser = localStorage.getItem(USER_KEY) || "";
  $("#currentUser").value = state.currentUser;

  // 申請日デフォルト = 今日
  $("#expDate").valueAsDate = new Date();

  // タブ
  $("#tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (btn) setTab(btn.dataset.tab);
  });

  // ユーザー入力
  $("#currentUser").addEventListener("input", (e) => {
    state.currentUser = e.target.value.trim();
    localStorage.setItem(USER_KEY, state.currentUser);
    render();
  });

  // 管理者トグル
  $("#adminToggle").addEventListener("click", () => setAdmin(!state.isAdmin));

  // 画像入力
  const dropzone = $("#dropzone");
  $("#imageInput").addEventListener("change", (e) => {
    if (e.target.files[0]) handleImageFile(e.target.files[0]);
  });
  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-drag");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-drag");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });
  $("#clearImage").addEventListener("click", clearImage);

  // フォーム
  $("#expenseForm").addEventListener("submit", submitExpense);

  // フィルタ
  $("#personalFilter").addEventListener("change", renderPersonal);
  $("#adminSearch").addEventListener("input", renderAdmin);
  $("#adminStatusFilter").addEventListener("change", renderAdmin);

  // 個人テーブルの操作（取消）
  $("#personalTable").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) deleteExpense(del.dataset.del);
  });

  // 管理テーブルの操作
  $("#adminTable").addEventListener("click", (e) => {
    const a = e.target.closest("[data-approve]");
    const r = e.target.closest("[data-reject]");
    const rs = e.target.closest("[data-reset]");
    if (a) approve(a.dataset.approve);
    else if (r) reject(r.dataset.reject);
    else if (rs) resetStatus(rs.dataset.reset);
  });

  setAdmin(false);
  setTab("apply");
  render();
}

document.addEventListener("DOMContentLoaded", init);
