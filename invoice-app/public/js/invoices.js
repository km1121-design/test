'use strict';

const errorBanner = document.getElementById('errorBanner');
const tableBody = document.getElementById('tableBody');

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('show');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function yen(n) {
  return '¥' + Math.round(Number(n || 0)).toLocaleString('ja-JP');
}

async function loadList() {
  try {
    const invoices = await api.get('/api/invoices');
    tableBody.innerHTML = '';
    invoices.forEach((inv) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="invoice.html?id=${inv.id}">${escapeHtml(inv.invoice_no || '(未設定)')}</a></td>
        <td>${escapeHtml(inv.issue_date || '')}</td>
        <td>${escapeHtml(inv.company_name || '')}</td>
        <td>${escapeHtml(inv.client_name || '')}</td>
        <td class="num">${yen(inv.total_amount)}</td>
        <td class="actions-cell"><button type="button" data-action="delete" class="danger">削除</button></td>
      `;
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => removeInvoice(inv));
      tableBody.appendChild(tr);
    });
  } catch (err) {
    showError(err.message);
  }
}

async function removeInvoice(inv) {
  if (!confirm(`請求書「${inv.invoice_no || inv.id}」を削除しますか？`)) return;
  try {
    await api.del(`/api/invoices/${inv.id}`);
    await loadList();
  } catch (err) {
    showError(err.message);
  }
}

loadList();
