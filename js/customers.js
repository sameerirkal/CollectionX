
// CollectionX — Customer Management Module
// File: js/customers.js

'use strict';

// -------------------------------------
// CUSTOMER TABLE
// -------------------------------------

function renderCustomers() {
  const tableBody = document.getElementById('customerTableBody');
  if (!tableBody) return;

  const searchTerm = (
    document.getElementById('customerSearch')?.value || ''
  ).trim().toLowerCase();

  const statusFilter =
    document.getElementById('customerStatusFilter')?.value || '';

  const accountFilter =
    document.getElementById('accountStatusFilter')?.value || '';

  const filtered = records.filter((record) => {
    const searchable = [
      record.name,
      record.mobile,
      record.customerId,
      record.accountReference
    ].join(' ').toLowerCase();

    const matchesSearch = searchable.includes(searchTerm);
    const matchesStatus = !statusFilter || record.status === statusFilter;
    const matchesAccount =
      !accountFilter || record.accountStatus === accountFilter;

    return matchesSearch && matchesStatus && matchesAccount;
  });

  const countElement = document.getElementById('customerCount');
  if (countElement) {
    countElement.textContent = `${filtered.length} customer${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          No matching customers found.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map((record) => `
    <tr>
      <td>
        <div class="customer-cell">
          <div class="customer-avatar">
            ${escapeHTML(getInitials(record.name))}
          </div>
          <div>
            <strong>${escapeHTML(record.name)}</strong>
            <span>${escapeHTML(record.customerId || 'No ID')}</span>
          </div>
        </div>
      </td>
      <td>${escapeHTML(record.mobile || '—')}</td>
      <td>${escapeHTML(record.accountReference || '—')}</td>
      <td>${money(record.outstanding)}</td>
      <td>
        <span class="status-badge ${getStatusClass(record.status)}">
          ${escapeHTML(record.status || 'Pending')}
        </span>
      </td>
      <td>${formatDate(record.nextFollowup)}</td>
      <td>
        <div class="table-actions">
          <button
            class="icon-btn"
            type="button"
            data-action="edit"
            data-id="${escapeHTML(record.id)}"
            title="Edit customer"
            aria-label="Edit ${escapeHTML(record.name)}"
          >
            <i data-lucide="pencil"></i>
          </button>
          <button
            class="icon-btn danger"
            type="button"
            data-action="delete"
            data-id="${escapeHTML(record.id)}"
            title="Delete customer"
            aria-label="Delete ${escapeHTML(record.name)}"
          >
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  refreshIcons();
}

// -------------------------------------
// EDIT & DELETE ACTIONS
// -------------------------------------

function handleCustomerTableAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const recordId = button.dataset.id;

  if (action === 'edit') {
    openCustomerModal(recordId);
  }

  if (action === 'delete') {
    deleteCustomer(recordId);
  }
}

function deleteCustomer(recordId) {
  const record = records.find((item) => item.id === recordId);
  if (!record) return;

  const confirmed = window.confirm(
    `Delete ${record.name} from CollectionX? This action cannot be undone.`
  );

  if (!confirmed) return;

  const previousRecords = records;
  records = records.filter((item) => item.id !== recordId);

  if (!saveRecords()) {
    records = previousRecords;
    return;
  }

  renderAll();
  showToast('Customer deleted.');
}

// -------------------------------------
// FILTERS & SEARCH
// -------------------------------------

function setupCustomerFilters() {
  const search = document.getElementById('customerSearch');
  const status = document.getElementById('customerStatusFilter');
  const account = document.getElementById('accountStatusFilter');

  search?.addEventListener('input', renderCustomers);
  status?.addEventListener('change', renderCustomers);
  account?.addEventListener('change', renderCustomers);
}

// -------------------------------------
// ICON REFRESH
// -------------------------------------

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// -------------------------------------
// INITIALIZATION
// -------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('customerTableBody');

  tableBody?.addEventListener('click', handleCustomerTableAction);

  setupCustomerFilters();
  renderCustomers();
});
