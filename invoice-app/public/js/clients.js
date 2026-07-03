'use strict';

const FIELDS = ['name', 'postal_code', 'address', 'contact_name', 'notes'];
const form = document.getElementById('clientForm');
const errorBanner = document.getElementById('errorBanner');
const tableBody = document.getElementById('tableBody');
const cancelBtn = document.getElementById('cancelEdit');
const formTitle = document.getElementById('formTitle');

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('show');
}

function clearError() {
  errorBanner.classList.remove('show');
}

function resetForm() {
  form.reset();
  document.getElementById('id').value = '';
  formTitle.textContent = '新規登録';
  cancelBtn.style.display = 'none';
}

function fillForm(client) {
  document.getElementById('id').value = client.id;
  FIELDS.forEach((f) => { document.getElementById(f).value = client[f] ?? ''; });
  formTitle.textContent = `編集: ${client.name}`;
  cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

async function loadList() {
  clearError();
  try {
    const clients = await api.get('/api/clients');
    tableBody.innerHTML = '';
    clients.forEach((c) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.address || '')}</td>
        <td>${escapeHtml(c.contact_name || '')}</td>
        <td class="actions-cell">
          <button type="button" data-action="edit">編集</button>
          <button type="button" data-action="delete" class="danger">削除</button>
        </td>
      `;
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => fillForm(c));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => removeClient(c));
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showError(err.message);
  }
}

async function removeClient(client) {
  if (!confirm(`「${client.name}」を削除しますか？関連する案件・シフトも削除されます。`)) return;
  try {
    await api.del(`/api/clients/${client.id}`);
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
  FIELDS.forEach((f) => { body[f] = document.getElementById(f).value || null; });
  try {
    if (id) {
      await api.put(`/api/clients/${id}`, body);
    } else {
      await api.post('/api/clients', body);
    }
    resetForm();
    await loadList();
  } catch (err) {
    showError(err.message);
  }
});

cancelBtn.addEventListener('click', resetForm);

loadList();
