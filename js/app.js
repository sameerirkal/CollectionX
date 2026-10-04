
// CollectionX — Core Application Engine
// File: js/app.js

'use strict';

// -------------------------------------
// 1. APP CONFIGURATION & SHARED DATA
// -------------------------------------

const STORAGE_KEY = 'collectionx_records_v1';

let records = loadRecords();
let activeView = 'dashboard';

const $ = (id) => document.getElementById(id);

// -------------------------------------
// 2. DATE & FORMAT UTILITIES
// -------------------------------------

function todayISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function money(value) {
  const amount = Number(value) || 0;

  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `cx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// -------------------------------------
// 3. BROWSER STORAGE
// -------------------------------------

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Unable to load CollectionX records:', error);
    return [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Unable to save CollectionX records:', error);
    showToast('Could not save data. Export a backup and check browser storage.', 'error');
    return false;
  }
}

// -------------------------------------
// 4. TOAST NOTIFICATIONS
// -------------------------------------

function showToast(message, type = 'success') {
  const toast = $('toast');
  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// -------------------------------------
// 5. NAVIGATION
// -------------------------------------

function switchView(viewName) {
  const validViews = ['dashboard', 'customers', 'followups', 'reports'];
  if (!validViews.includes(viewName)) return;

  activeView = viewName;

  document.querySelectorAll('.view-section').forEach((section) => {
    section.classList.remove('active');
  });

  const target = $(`${viewName}View`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach((link) => {
    const isActive = link.dataset.view === viewName;
    link.classList.toggle('active', isActive);
  });

  const titles = {
    dashboard: 'Dashboard',
    customers: 'Customers',
    followups: 'Follow-ups',
    reports: 'MIS Reports'
  };

  const pageTitle = $('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[viewName];

  const sidebar = $('sidebar');
  if (sidebar) sidebar.classList.remove('open');

  renderCurrentView();
}

function renderCurrentView() {
  if (activeView === 'dashboard' && typeof renderDashboard === 'function') {
    renderDashboard();
  }

  if (activeView === 'customers' && typeof renderCustomers === 'function') {
    renderCustomers();
  }

  if (activeView === 'followups' && typeof renderFollowups === 'function') {
    renderFollowups();
  }

  if (activeView === 'reports' && typeof renderReports === 'function') {
    renderReports();
  }
}

function renderAll() {
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderCustomers === 'function') renderCustomers();
  if (typeof renderFollowups === 'function') renderFollowups();
  if (typeof renderReports === 'function') renderReports();
}

// -------------------------------------
// 6. CUSTOMER MODAL
// -------------------------------------

function openCustomerModal(recordId = null) {
  const modal = $('customerModal');
  const form = $('customerForm');

  if (!modal || !form) return;

  form.reset();

  const editId = $('editRecordId');
  const title = $('modalTitle');

  if (recordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record) {
      showToast('Customer record not found.', 'error');
      return;
    }

    if (title) title.textContent = 'Edit Customer';
    if (editId) editId.value = record.id;

    const fields = {
      customerName: record.name,
      mobileNumber: record.mobile,
      customerId: record.customerId,
      accountReference: record.accountReference,
      outstandingAmount: record.outstanding,
      minimumDue: record.minimumDue,
      bareMinimum: record.bareMinimum,
      cycleAllocation: record.cycleAllocation,
      accountStatus: record.accountStatus,
      collectionStatus: record.status,
      nextFollowup: record.nextFollowup,
      ptpDate: record.ptpDate,
      promisedAmount: record.promisedAmount,
      paidAmount: record.paidAmount,
      customerNotes: record.notes
    };

    Object.entries(fields).forEach(([id, value]) => {
      const field = $(id);
      if (field) field.value = value ?? '';
    });
  } else {
    if (title) title.textContent = 'Add Customer';
    if (editId) editId.value = '';
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  const firstField = $('customerName');
  if (firstField) firstField.focus();
}

function closeCustomerModal() {
  const modal = $('customerModal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

// -------------------------------------
// 7. ADD & UPDATE CUSTOMER RECORDS
// -------------------------------------

function handleCustomerSubmit(event) {
  event.preventDefault();

  const name = $('customerName')?.value.trim();
  const mobile = $('mobileNumber')?.value.trim();

  if (!name) {
    showToast('Please enter the customer name.', 'error');
    $('customerName')?.focus();
    return;
  }

  const editId = $('editRecordId')?.value;
  const existing = editId
    ? records.find((item) => item.id === editId)
    : null;

  const record = {
    id: existing?.id || createId(),
    name,
    mobile,
    customerId: $('customerId')?.value.trim() || '',
    accountReference: $('accountReference')?.value.trim() || '',
    outstanding: numberValue($('outstandingAmount')?.value),
    minimumDue: numberValue($('minimumDue')?.value),
    bareMinimum: numberValue($('bareMinimum')?.value),
    cycleAllocation: $('cycleAllocation')?.value.trim() || '',
    accountStatus: $('accountStatus')?.value || 'Active',
    status: $('collectionStatus')?.value || 'Pending',
    nextFollowup: $('nextFollowup')?.value || '',
    ptpDate: $('ptpDate')?.value || '',
    promisedAmount: numberValue($('promisedAmount')?.value),
    paidAmount: numberValue($('paidAmount')?.value),
    notes: $('customerNotes')?.value.trim() || '',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    callHistory: existing?.callHistory || []
  };

  if (existing) {
    records = records.map((item) => item.id === editId ? record : item);
  } else {
    records.unshift(record);
  }

  if (!saveRecords()) return;

  closeCustomerModal();
  renderAll();

  showToast(existing ? 'Customer updated.' : 'Customer added.');
}

// -------------------------------------
// 8. APP EVENT LISTENERS
// -------------------------------------

function setupApp() {
  // Navigation links
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      switchView(link.dataset.view);
    });
  });

  // Mobile sidebar
  $('menuBtn')?.addEventListener('click', () => {
    $('sidebar')?.classList.toggle('open');
  });

  // Add customer buttons
  $('addCustomerBtn')?.addEventListener('click', () => openCustomerModal());
  $('quickAddBtn')?.addEventListener('click', () => openCustomerModal());

  // Modal controls
  $('closeModalBtn')?.addEventListener('click', closeCustomerModal);
  $('cancelModalBtn')?.addEventListener('click', closeCustomerModal);
  $('customerForm')?.addEventListener('submit', handleCustomerSubmit);

  $('customerModal')?.addEventListener('click', (event) => {
    if (event.target === $('customerModal')) {
      closeCustomerModal();
    }
  });

  // Keyboard shortcut: Escape closes the modal
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCustomerModal();
  });

  // Today's date in the header
  const dateElement = $('currentDate');
  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Start on the dashboard
  switchView('dashboard');
}

// Wait until all script files have loaded before rendering.
document.addEventListener('DOMContentLoaded', () => {
  setupApp();
  renderAll();
});
