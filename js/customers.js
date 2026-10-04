
// CollectionX — Customer Management Module
// File: js/customers.js

'use strict';

// -------------------------------------
// PHONE & MESSAGE HELPERS
// -------------------------------------

function cleanPhoneNumber(phone) {
  let digits = String(phone || '').replace(/\D/g, '');

  // Convert common Indian local mobile formats to country-code format.
  if (digits.length === 10) {
    digits = '91' + digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = '91' + digits.slice(1);
  }

  return digits;
}

function getCustomerMessage(record) {
  const name = String(record.name || 'Customer').trim();
  const outstanding = money(record.outstanding);

  return `Hi ${name}, this is regarding your account. Your current outstanding amount is ${outstanding}. Please let us know a convenient time to discuss.`;
}

function getWhatsAppLink(record) {
  const phone = cleanPhoneNumber(record.mobile);
  if (!phone) return '';

  return `https://wa.me/${phone}?text=${encodeURIComponent(getCustomerMessage(record))}`;
}

function getSMSLink(record) {
  const phone = cleanPhoneNumber(record.mobile);
  if (!phone) return '';

  return `sms:${phone}?body=${encodeURIComponent(getCustomerMessage(record))}`;
}

function getCallLink(record) {
  const phone = cleanPhoneNumber(record.mobile);
  if (!phone) return '';

  return `tel:${phone}`;
}

// -------------------------------------
// CUSTOMER ACTION BUTTONS
// -------------------------------------

function communicationAction(label, icon, href, className, disabled = false) {
  if (disabled || !href) {
    return `
      <span
        class="table-action-btn ${className} is-disabled"
        title="No valid mobile number"
        aria-disabled="true"
      >
        <i data-lucide="${icon}"></i>
        <span>${label}</span>
      </span>
    `;
  }

  const target = label === 'WhatsApp'
    ? ' target="_blank" rel="noopener noreferrer"'
    : '';

  return `
    <a
      class="table-action-btn ${className}"
      href="${escapeHTML(href)}"
      aria-label="${label} customer"
      title="${label} customer"${target}
    >
      <i data-lucide="${icon}"></i>
      <span>${label}</span>
    </a>
  `;
}

function renderCustomerActions(record) {
  const callLink = getCallLink(record);
  const whatsappLink = getWhatsAppLink(record);
  const smsLink = getSMSLink(record);

  return `
    <div class="table-actions">
      ${communicationAction('Call', 'phone', callLink, 'call-btn')}
      ${communicationAction('WhatsApp', 'message-circle', whatsappLink, 'whatsapp-btn')}
      ${communicationAction('Text', 'message-square', smsLink, 'sms-btn')}

      <button
        class="table-action-btn payment-btn"
        type="button"
        data-payment-action="payment"
        data-id="${escapeHTML(record.id)}"
        title="Record payment"
        aria-label="Record payment for ${escapeHTML(record.name)}"
      >
        <i data-lucide="wallet"></i>
        <span>Payment</span>
      </button>

      <button
        class="table-action-btn ptp-btn"
        type="button"
        data-payment-action="ptp"
        data-id="${escapeHTML(record.id)}"
        title="Set promise to pay"
        aria-label="Set PTP for ${escapeHTML(record.name)}"
      >
        <i data-lucide="calendar-check"></i>
        <span>PTP</span>
      </button>

      <button
        class="table-action-btn edit-btn"
        type="button"
        data-action="edit"
        data-id="${escapeHTML(record.id)}"
        title="Edit customer"
        aria-label="Edit ${escapeHTML(record.name)}"
      >
        <i data-lucide="pencil"></i>
        <span>Edit</span>
      </button>

      <button
        class="table-action-btn delete-btn"
        type="button"
        data-action="delete"
        data-id="${escapeHTML(record.id)}"
        title="Delete customer"
        aria-label="Delete ${escapeHTML(record.name)}"
      >
        <i data-lucide="trash-2"></i>
        <span>Delete</span>
      </button>
    </div>
  `;
}

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

      <td>${renderCustomerActions(record)}</td>
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
