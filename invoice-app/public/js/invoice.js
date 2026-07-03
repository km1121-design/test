'use strict';

const TAX_RATES = [
  { value: '10', label: '10%' },
  { value: '8', label: '8%（軽減）' },
  { value: '0', label: '対象外' },
];

const el = (id) => document.getElementById(id);
const errorBanner = el('errorBanner');
const companySelect = el('company_id');
const clientSelect = el('client_id');
const itemsBody = el('itemsBody');
const taxBreakdownBody = el('taxBreakdownBody');
const subtotalDisplay = el('subtotalDisplay');
const totalDisplay = el('totalDisplay');
const grandTotalDisplay = el('grandTotalDisplay');
const saveStatus = el('saveStatus');

let companiesCache = [];
let clientsCache = [];
let items = [];
let nextItemKey = 1;
let invoiceId = new URLSearchParams(location.search).get('id');

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('show');
}

function clearError() {
  errorBanner.classList.remove('show');
}

function yen(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

function firstDayOfThisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function lastDayOfThisMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

function companyBlockText(c) {
  return [c.name, c.address, c.phone, c.email, c.registration_no ? `登録番号: ${c.registration_no}` : '']
    .filter(Boolean)
    .join('\n');
}

function clientBlockText(c) {
  return [`${c.name} 御中`, c.address].filter(Boolean).join('\n');
}

function createRow(item) {
  const tr = document.createElement('tr');
  tr.dataset.key = item.key;

  const descTd = document.createElement('td');
  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.value = item.description;
  descInput.addEventListener('input', () => { item.description = descInput.value; markDirty(); });
  descTd.appendChild(descInput);

  const qtyTd = document.createElement('td');
  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.step = 'any';
  qtyInput.value = item.quantity;
  qtyInput.addEventListener('input', () => { item.quantity = parseFloat(qtyInput.value) || 0; renderTotals(); markDirty(); });
  qtyTd.appendChild(qtyInput);

  const unitTd = document.createElement('td');
  const unitInput = document.createElement('input');
  unitInput.type = 'text';
  unitInput.value = item.unit;
  unitInput.addEventListener('input', () => { item.unit = unitInput.value; markDirty(); });
  unitTd.appendChild(unitInput);

  const priceTd = document.createElement('td');
  const priceInput = document.createElement('input');
  priceInput.type = 'number';
  priceInput.step = 'any';
  priceInput.value = item.unit_price;
  priceInput.addEventListener('input', () => { item.unit_price = parseFloat(priceInput.value) || 0; renderTotals(); markDirty(); });
  priceTd.appendChild(priceInput);

  const taxTd = document.createElement('td');
  const taxSelect = document.createElement('select');
  TAX_RATES.forEach((rate) => {
    const opt = document.createElement('option');
    opt.value = rate.value;
    opt.textContent = rate.label;
    if (rate.value === String(item.tax_rate)) opt.selected = true;
    taxSelect.appendChild(opt);
  });
  taxSelect.addEventListener('change', () => { item.tax_rate = taxSelect.value; renderTotals(); markDirty(); });
  taxTd.appendChild(taxSelect);

  const amountTd = document.createElement('td');
  amountTd.className = 'amount-cell';
  amountTd.textContent = yen(item.quantity * item.unit_price);

  const delTd = document.createElement('td');
  delTd.className = 'no-print';
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'row-del-btn';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => {
    items = items.filter((i) => i.key !== item.key);
    renderItems();
    renderTotals();
    markDirty();
  });
  delTd.appendChild(delBtn);

  tr.append(descTd, qtyTd, unitTd, priceTd, taxTd, amountTd, delTd);
  tr._amountCell = amountTd;
  return tr;
}

function renderItems() {
  itemsBody.innerHTML = '';
  items.forEach((item) => itemsBody.appendChild(createRow(item)));
}

function renderTotals() {
  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach((tr) => {
    const item = items.find((i) => String(i.key) === tr.dataset.key);
    if (item) tr._amountCell.textContent = yen(item.quantity * item.unit_price);
  });

  const byRate = {};
  items.forEach((item) => {
    const amount = item.quantity * item.unit_price;
    byRate[item.tax_rate] = (byRate[item.tax_rate] || 0) + amount;
  });

  const subtotal = Object.values(byRate).reduce((a, b) => a + b, 0);
  let taxTotal = 0;
  taxBreakdownBody.innerHTML = '';
  Object.keys(byRate)
    .sort((a, b) => Number(b) - Number(a))
    .forEach((rate) => {
      const rateAmount = byRate[rate];
      const rateTax = Math.round(rateAmount * (Number(rate) / 100));
      taxTotal += rateTax;
      const label = TAX_RATES.find((r) => r.value === rate)?.label || `${rate}%`;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="tax-note">消費税（${label}対象: ${yen(rateAmount)}）</td><td>${yen(rateTax)}</td>`;
      taxBreakdownBody.appendChild(tr);
    });

  const total = subtotal + taxTotal;
  subtotalDisplay.textContent = yen(subtotal);
  totalDisplay.textContent = yen(total);
  grandTotalDisplay.textContent = yen(total);
}

function markDirty() {
  saveStatus.textContent = '未保存の変更あり';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

async function loadMasterData() {
  companiesCache = await api.get('/api/companies');
  clientsCache = await api.get('/api/clients');
  companySelect.innerHTML = '<option value="">(選択してください)</option>' +
    companiesCache.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  clientSelect.innerHTML = '<option value="">(選択してください)</option>' +
    clientsCache.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  if (companiesCache.length === 0) showError('先に「自社情報」を1件以上登録してください。');
  else if (clientsCache.length === 0) showError('先に「取引先」を1件以上登録してください。');
}

companySelect.addEventListener('change', () => {
  const c = companiesCache.find((x) => String(x.id) === companySelect.value);
  el('issuerBlock').value = c ? companyBlockText(c) : '';
  el('bankInfo').value = c ? (c.bank_info || '') : '';
  markDirty();
});

clientSelect.addEventListener('change', () => {
  const c = clientsCache.find((x) => String(x.id) === clientSelect.value);
  el('clientBlock').value = c ? clientBlockText(c) : '';
  markDirty();
});

el('btnAddRow').addEventListener('click', () => {
  items.push({ key: nextItemKey++, case_id: null, description: '', quantity: 1, unit: '式', unit_price: 0, tax_rate: '10' });
  renderItems();
  renderTotals();
  markDirty();
});

el('btnGenerate').addEventListener('click', async () => {
  clearError();
  if (!clientSelect.value) return showError('取引先を選択してください。');
  const periodStart = el('period_start').value;
  const periodEnd = el('period_end').value;
  if (!periodStart || !periodEnd) return showError('対象期間を指定してください。');
  try {
    const result = await api.post('/api/invoices/generate', {
      client_id: Number(clientSelect.value),
      period_start: periodStart,
      period_end: periodEnd,
    });
    if (result.items.length === 0) {
      showError('指定期間・取引先に該当するシフトが見つかりませんでした。');
    }
    items = result.items.map((it) => ({ ...it, key: nextItemKey++ }));
    renderItems();
    renderTotals();
    markDirty();
  } catch (err) {
    showError(err.message);
  }
});

function collectPayload() {
  return {
    invoice_no: el('invoice_no').value || null,
    company_id: companySelect.value ? Number(companySelect.value) : null,
    client_id: clientSelect.value ? Number(clientSelect.value) : null,
    issue_date: el('issue_date').value || null,
    due_date: el('due_date').value || null,
    period_start: el('period_start').value || null,
    period_end: el('period_end').value || null,
    subject: el('subject').value || null,
    bank_info: el('bankInfo').value || null,
    notes: el('notes').value || null,
    items: items.map((it, index) => ({
      case_id: it.case_id ?? null,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      tax_rate: it.tax_rate,
      sort_order: index,
    })),
  };
}

el('btnSave').addEventListener('click', async () => {
  clearError();
  const payload = collectPayload();
  if (!payload.client_id) return showError('取引先を選択してください。');
  try {
    const saved = invoiceId
      ? await api.put(`/api/invoices/${invoiceId}`, payload)
      : await api.post('/api/invoices', payload);
    invoiceId = saved.id;
    history.replaceState(null, '', `invoice.html?id=${invoiceId}`);
    saveStatus.textContent = `保存済み (ID: ${invoiceId})`;
  } catch (err) {
    showError(err.message);
  }
});

el('btnPrint').addEventListener('click', () => window.print());

async function loadExistingInvoice() {
  const invoice = await api.get(`/api/invoices/${invoiceId}`);
  el('invoice_no').value = invoice.invoice_no || '';
  el('issue_date').value = invoice.issue_date || '';
  el('due_date').value = invoice.due_date || '';
  el('period_start').value = invoice.period_start || '';
  el('period_end').value = invoice.period_end || '';
  el('subject').value = invoice.subject || '';
  el('bankInfo').value = invoice.bank_info || '';
  el('notes').value = invoice.notes || '';
  if (invoice.company_id) companySelect.value = invoice.company_id;
  if (invoice.client_id) clientSelect.value = invoice.client_id;
  const company = companiesCache.find((c) => c.id === invoice.company_id);
  const client = clientsCache.find((c) => c.id === invoice.client_id);
  el('issuerBlock').value = company ? companyBlockText(company) : '';
  el('clientBlock').value = client ? clientBlockText(client) : '';
  items = invoice.items.map((it) => ({ ...it, key: nextItemKey++ }));
  renderItems();
  renderTotals();
  saveStatus.textContent = `保存済み (ID: ${invoiceId})`;
}

(async () => {
  try {
    await loadMasterData();
    if (invoiceId) {
      await loadExistingInvoice();
    } else {
      el('period_start').value = firstDayOfThisMonth();
      el('period_end').value = lastDayOfThisMonth();
      el('issue_date').value = new Date().toISOString().slice(0, 10);
      items = [];
      renderItems();
      renderTotals();
    }
  } catch (err) {
    showError(err.message);
  }
})();
