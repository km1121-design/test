(() => {
  'use strict';

  const STORAGE_KEY = 'invoiceTool.draft.v1';
  const TAX_RATES = [
    { value: '10', label: '10%' },
    { value: '8', label: '8%（軽減）' },
    { value: '0', label: '対象外' },
  ];

  const el = (id) => document.getElementById(id);

  const fields = {
    invoiceNo: el('invoiceNo'),
    issueDate: el('issueDate'),
    dueDate: el('dueDate'),
    clientName: el('clientName'),
    clientAddress: el('clientAddress'),
    issuerBlock: el('issuerBlock'),
    subject: el('subject'),
    bankInfo: el('bankInfo'),
    notes: el('notes'),
  };

  const itemsBody = el('itemsBody');
  const taxBreakdownBody = el('taxBreakdownBody');
  const subtotalDisplay = el('subtotalDisplay');
  const totalDisplay = el('totalDisplay');
  const grandTotalDisplay = el('grandTotalDisplay');

  let items = [];
  let nextItemId = 1;

  function yen(n) {
    return '¥' + Math.round(n).toLocaleString('ja-JP');
  }

  function defaultState() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      invoiceNo: '',
      issueDate: today,
      dueDate: '',
      clientName: '',
      clientAddress: '',
      issuerBlock: '',
      subject: '',
      bankInfo: '',
      notes: '',
      items: [emptyItem()],
    };
  }

  function emptyItem() {
    return { id: nextItemId++, desc: '', qty: 1, unit: '式', price: 0, taxRate: '10' };
  }

  function createRow(item) {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;

    const descTd = document.createElement('td');
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.value = item.desc;
    descInput.placeholder = '品目・作業内容';
    descInput.addEventListener('input', () => { item.desc = descInput.value; scheduleSave(); });
    descTd.appendChild(descInput);

    const qtyTd = document.createElement('td');
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.step = 'any';
    qtyInput.value = item.qty;
    qtyInput.addEventListener('input', () => { item.qty = parseFloat(qtyInput.value) || 0; renderTotals(); scheduleSave(); });
    qtyTd.appendChild(qtyInput);

    const unitTd = document.createElement('td');
    const unitInput = document.createElement('input');
    unitInput.type = 'text';
    unitInput.value = item.unit;
    unitInput.addEventListener('input', () => { item.unit = unitInput.value; scheduleSave(); });
    unitTd.appendChild(unitInput);

    const priceTd = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.step = 'any';
    priceInput.value = item.price;
    priceInput.addEventListener('input', () => { item.price = parseFloat(priceInput.value) || 0; renderTotals(); scheduleSave(); });
    priceTd.appendChild(priceInput);

    const taxTd = document.createElement('td');
    const taxSelect = document.createElement('select');
    TAX_RATES.forEach((rate) => {
      const opt = document.createElement('option');
      opt.value = rate.value;
      opt.textContent = rate.label;
      if (rate.value === item.taxRate) opt.selected = true;
      taxSelect.appendChild(opt);
    });
    taxSelect.addEventListener('change', () => { item.taxRate = taxSelect.value; renderTotals(); scheduleSave(); });
    taxTd.appendChild(taxSelect);

    const amountTd = document.createElement('td');
    amountTd.className = 'amount-cell';
    amountTd.textContent = yen(item.qty * item.price);

    const delTd = document.createElement('td');
    delTd.className = 'no-print';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'row-del-btn';
    delBtn.textContent = '✕';
    delBtn.title = 'この行を削除';
    delBtn.addEventListener('click', () => {
      items = items.filter((i) => i.id !== item.id);
      renderItems();
      renderTotals();
      scheduleSave();
    });
    delTd.appendChild(delBtn);

    tr.append(descTd, qtyTd, unitTd, priceTd, taxTd, amountTd, delTd);
    tr._amountCell = amountTd;
    tr._qtyInput = qtyInput;
    tr._priceInput = priceInput;
    return tr;
  }

  function renderItems() {
    itemsBody.innerHTML = '';
    items.forEach((item) => itemsBody.appendChild(createRow(item)));
  }

  function renderTotals() {
    const rows = itemsBody.querySelectorAll('tr');
    rows.forEach((tr) => {
      const id = Number(tr.dataset.id);
      const item = items.find((i) => i.id === id);
      if (item) tr._amountCell.textContent = yen(item.qty * item.price);
    });

    const byRate = {};
    items.forEach((item) => {
      const amount = item.qty * item.price;
      byRate[item.taxRate] = (byRate[item.taxRate] || 0) + amount;
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
        const tr = document.createElement('tr');
        const label = TAX_RATES.find((r) => r.value === rate)?.label || rate + '%';
        tr.innerHTML = `<td class="tax-note">消費税（${label}対象: ${yen(rateAmount)}）</td><td>${yen(rateTax)}</td>`;
        taxBreakdownBody.appendChild(tr);
      });

    const total = subtotal + taxTotal;
    subtotalDisplay.textContent = yen(subtotal);
    totalDisplay.textContent = yen(total);
    grandTotalDisplay.textContent = yen(total);
  }

  function collectState() {
    return {
      invoiceNo: fields.invoiceNo.value,
      issueDate: fields.issueDate.value,
      dueDate: fields.dueDate.value,
      clientName: fields.clientName.value,
      clientAddress: fields.clientAddress.value,
      issuerBlock: fields.issuerBlock.value,
      subject: fields.subject.value,
      bankInfo: fields.bankInfo.value,
      notes: fields.notes.value,
      items: items.map(({ id, ...rest }) => rest),
    };
  }

  function applyState(state) {
    fields.invoiceNo.value = state.invoiceNo || '';
    fields.issueDate.value = state.issueDate || '';
    fields.dueDate.value = state.dueDate || '';
    fields.clientName.value = state.clientName || '';
    fields.clientAddress.value = state.clientAddress || '';
    fields.issuerBlock.value = state.issuerBlock || '';
    fields.subject.value = state.subject || '';
    fields.bankInfo.value = state.bankInfo || '';
    fields.notes.value = state.notes || '';
    items = (state.items && state.items.length ? state.items : [emptyItem()]).map((it) => ({
      id: nextItemId++,
      desc: it.desc || '',
      qty: typeof it.qty === 'number' ? it.qty : 1,
      unit: it.unit || '式',
      price: typeof it.price === 'number' ? it.price : 0,
      taxRate: it.taxRate || '10',
    }));
    renderItems();
    renderTotals();
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
    }, 300);
  }

  function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        applyState(JSON.parse(raw));
        return;
      } catch (e) {
        // 破損した下書きは無視して初期状態にする
      }
    }
    applyState(defaultState());
  }

  Object.values(fields).forEach((input) => {
    input.addEventListener('input', scheduleSave);
  });

  el('btnAddRow').addEventListener('click', () => {
    items.push(emptyItem());
    renderItems();
    renderTotals();
    scheduleSave();
  });

  el('btnNew').addEventListener('click', () => {
    if (!confirm('入力内容をすべてクリアして新規作成しますか？')) return;
    localStorage.removeItem(STORAGE_KEY);
    applyState(defaultState());
  });

  el('btnPrint').addEventListener('click', () => window.print());

  el('btnExport').addEventListener('click', () => {
    const state = collectState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (state.invoiceNo || 'invoice').replace(/[^\w\-]+/g, '_');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  el('btnImportTrigger').addEventListener('click', () => el('btnImport').click());

  el('btnImport').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const state = JSON.parse(reader.result);
        applyState(state);
        scheduleSave();
      } catch (err) {
        alert('JSONファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  loadDraft();
})();
