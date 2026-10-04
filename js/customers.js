
// CollectionX — Customer Management Module
// File: js/customers.js

'use strict';

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

    return (
      searchable.includes(searchTerm) &&
      (!statusFilter || record.status === statusFilter) &&
      (!accountFilter || record.accountStatus === accountFilter)
    );
  });

  const countElement = document.getElementById('customerCount');
  if (countElement) {
    countElement.textContent =
      `${filtered.length} customer${filtered.length === 1 ? '' : 's'}`;
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
            aria-label="Edit customer"
          >
            <i data-lucide="pencil"></i>
          </button>

          <button
            class="icon-btn"
            type="button"
            data-payment-action="payment"
            data-id="${escapeHTML(record.id)}"
            title="Record payment"
            aria-label="Record payment"
          >
            <i data-lucide="wallet"></i>
          </button>

          <button
            class="icon-btn"
            type="button"
            data-payment-action="ptp"
            data-id="${escapeHTML(record.id)}"
            title="Set PTP"
            aria-label="Set promise to pay"
          >
            <i data-lucide="calendar-check"></i>
          </button>

          <button
            class="icon-btn danger"
            type="button"
            data-action="delete"
            data-id="${escapeHTML(record.id)}"
            title="Delete customer"
            aria-label="Delete customer"
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
// EDIT & DELETE
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
    `Delete ${record.name} from CollectionX? This cannot be undone.`
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
// SEARCH & FILTERS
// -------------------------------------

function setupCustomerFilters() {
  document.getElementById('customerSearch')
    ?.addEventListener('input', renderCustomers);

  document.getElementById('customerStatusFilter')
    ?.addEventListener('change', renderCustomers);

  document.getElementById('accountStatusFilter')
    ?.addEventListener('change', renderCustomers);
}

// -------------------------------------
// ICONS
// -------------------------------------

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

// -------------------------------------
// INITIALIZATION
// -------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('customerTableBody')
    ?.addEventListener('click', handleCustomerTableAction);

  setupCustomerFilters();
  renderCustomers();
});
