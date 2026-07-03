'use strict';

const FIELDS = ['client_id', 'name', 'unit_price', 'unit_label', 'tax_rate', 'active', 'notes'];
const form = document.getElementById('caseForm');
const errorBanner = document.getElementById('errorBanner');
const tableBody = document.getElementById('tableBody');
const cancelBtn = document.getElementById('cancelEdit');
const formTitle = document.getElementById('formTitle');
const clientSelect = document.getElementById('client_id');

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

function yen(n) {
  return '¥' + Number(n || 0).toLocaleString('ja-JP');
}

function resetForm() {
  form.reset();
  document.getElementById('id').value = '';
  document.getElementById('unit_label').value = '日';
  formTitle.textContent = '新規登録';
  cancelBtn.style.display = 'none';
}

function fillForm(item) {
  document.getElementById('id').value = item.id;
  FIELDS.forEach((f) => { document.getElementById(f).value = item[f] ?? ''; });
  formTitle.textContent = `編集: ${item.name}`;
  cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadClientOptions(selectedId) {
  const clients = await api.get('/api/clients');
  clientSelect.innerHTML = clients
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join('');
  if (selectedId) clientSelect.value = selectedId;
  return clients;
}

async function loadList() {
  clearError();
  try {
    const cases = await api.get('/api/cases');
    tableBody.innerHTML = '';
    cases.forEach((item) => {
      const tr = document.createElement('tr');
      if (!item.active) tr.classList.add('inactive');
      tr.innerHTML = `
        <td>${escapeHtml(item.client_name)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td class="num">${yen(item.unit_price)} / ${escapeHtml(item.unit_label)}</td>
        <td>${item.active ? '稼働中' : '終了'}</td>
        <td class="actions-cell">
          <button type="button" data-action="edit">編集</button>
          <button type="button" data-action="delete" class="danger">削除</button>
        </td>
      `;
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => fillForm(item));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => removeCase(item));
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showError(err.message);
  }
}

async function removeCase(item) {
  if (!confirm(`「${item.name}」を削除しますか？関連するシフトも削除されます。`)) return;
  try {
    await api.del(`/api/cases/${item.id}`);
    await loadList();
  } catch (err) {
    showError(err.message);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const id = document.getElementById('id').value;
  const body = {};
  FIELDS.forEach((f) => { body[f] = document.getElementById(f).value; });
  body.unit_price = Number(body.unit_price);
  body.active = Number(body.active);
  try {
    if (id) {
      await api.put(`/api/cases/${id}`, body);
    } else {
      await api.post('/api/cases', body);
    }
    resetForm();
    await loadList();
  } catch (err) {
    showError(err.message);
  }
});

cancelBtn.addEventListener('click', resetForm);

(async () => {
  try {
    const clients = await loadClientOptions();
    if (clients.length === 0) {
      showError('先に「取引先」を1件以上登録してください。');
    }
  } catch (err) {
    showError(err.message);
  }
  await loadList();
})();
