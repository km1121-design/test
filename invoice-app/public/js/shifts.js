'use strict';

const errorBanner = document.getElementById('errorBanner');
const tableBody = document.getElementById('tableBody');
const caseSelect = document.getElementById('case_id');
const filterCase = document.getElementById('filterCase');

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('show');
}

function clearError() {
  errorBanner.classList.remove('show');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

let casesCache = [];

async function loadCaseOptions() {
  casesCache = await api.get('/api/cases');
  const options = casesCache
    .map((c) => `<option value="${c.id}">${escapeHtml(c.client_name)} / ${escapeHtml(c.name)}</option>`)
    .join('');
  caseSelect.innerHTML = options;
  filterCase.innerHTML = '<option value="">すべての案件</option>' + options;
  if (casesCache.length === 0) {
    showError('先に「案件」を1件以上登録してください。');
  }
}

async function loadShifts() {
  clearError();
  try {
    const query = filterCase.value ? `?case_id=${filterCase.value}` : '';
    const shifts = await api.get(`/api/shifts${query}`);
    tableBody.innerHTML = '';
    shifts.forEach((s) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(s.work_date)}</td>
        <td>${escapeHtml(s.client_name)}</td>
        <td>${escapeHtml(s.case_name)}</td>
        <td class="num">${s.quantity}</td>
        <td>${escapeHtml(s.note || '')}</td>
        <td class="actions-cell"><button type="button" data-action="delete" class="danger">削除</button></td>
      `;
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => removeShift(s));
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showError(err.message);
  }
}

async function removeShift(shift) {
  if (!confirm(`${shift.work_date} のシフトを削除しますか？`)) return;
  try {
    await api.del(`/api/shifts/${shift.id}`);
    await loadShifts();
  } catch (err) {
    showError(err.message);
  }
}

document.getElementById('shiftForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const body = {
    case_id: Number(caseSelect.value),
    work_date: document.getElementById('work_date').value,
    quantity: Number(document.getElementById('quantity').value) || 1,
    note: document.getElementById('note').value || null,
  };
  try {
    await api.post('/api/shifts', body);
    document.getElementById('note').value = '';
    await loadShifts();
  } catch (err) {
    showError(err.message);
  }
});

filterCase.addEventListener('change', loadShifts);

// Minimal CSV parser: comma-separated, header row required, no quoted-field support.
function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headerAliases = {
    date: 'date', 日付: 'date',
    case: 'case', 案件: 'case',
    client: 'client', 取引先: 'client',
    quantity: 'quantity', 数量: 'quantity',
    note: 'note', メモ: 'note',
  };
  const headers = lines[0].split(',').map((h) => headerAliases[h.trim()] || h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const entry = {};
    headers.forEach((h, i) => { entry[h] = cells[i]; });
    if (entry.quantity) entry.quantity = Number(entry.quantity);
    return entry;
  });
}

document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('csvInput').value = await file.text();
});

document.getElementById('importBtn').addEventListener('click', async () => {
  clearError();
  const resultEl = document.getElementById('importResult');
  resultEl.textContent = '取込中...';
  const entries = parseCsv(document.getElementById('csvInput').value);
  if (entries.length === 0) {
    resultEl.textContent = '';
    showError('取込データが空です。ヘッダー行を含むCSVを入力してください。');
    return;
  }
  try {
    const result = await api.post('/api/shifts/bulk', { entries });
    const errorLines = result.errors.map((e) => `${e.row}行目: ${e.message}`).join(' / ');
    resultEl.textContent = `登録 ${result.inserted} 件・更新 ${result.updated} 件${result.errors.length ? `・エラー ${result.errors.length} 件 (${errorLines})` : ''}`;
    await loadShifts();
  } catch (err) {
    resultEl.textContent = '';
    showError(err.message);
  }
});

(async () => {
  await loadCaseOptions();
  await loadShifts();
})();
