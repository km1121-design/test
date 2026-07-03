'use strict';

const FIELDS = ['name', 'postal_code', 'address', 'phone', 'email', 'registration_no', 'bank_info', 'notes'];
const form = document.getElementById('companyForm');
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

function fillForm(company) {
  document.getElementById('id').value = company.id;
  FIELDS.forEach((f) => { document.getElementById(f).value = company[f] ?? ''; });
  formTitle.textContent = `編集: ${company.name}`;
  cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadList() {
  clearError();
  try {
    const companies = await api.get('/api/companies');
    tableBody.innerHTML = '';
    companies.forEach((c) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.address || '')}</td>
        <td>${escapeHtml(c.phone || '')}</td>
        <td>${escapeHtml(c.registration_no || '')}</td>
        <td class="actions-cell">
          <button type="button" data-action="edit">編集</button>
          <button type="button" data-action="delete" class="danger">削除</button>
        </td>
      `;
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => fillForm(c));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => removeCompany(c));
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showError(err.message);
  }
}

async function removeCompany(company) {
  if (!confirm(`「${company.name}」を削除しますか？`)) return;
  try {
    await api.del(`/api/companies/${company.id}`);
    await loadList();
  } catch (err) {
    showError(err.message);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const id = document.getElementById('id').value;
  const body = {};
  FIELDS.forEach((f) => { body[f] = document.getElementById(f).value || null; });
  try {
    if (id) {
      await api.put(`/api/companies/${id}`, body);
    } else {
      await api.post('/api/companies', body);
    }
    resetForm();
    await loadList();
  } catch (err) {
    showError(err.message);
  }
});

cancelBtn.addEventListener('click', resetForm);

loadList();
