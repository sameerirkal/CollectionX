
// CollectionX — Payments & PTP Module
// File: js/payments.js

'use strict';

// -------------------------------------
// PAYMENT RECORDING
// -------------------------------------

function recordPayment(recordId) {
  const record = records.find((item) => item.id === recordId);
  if (!record) return;

  const amountInput = window.prompt(
    `Outstanding: ${money(record.outstanding)}\nEnter payment received:`
  );

  if (amountInput === null || amountInput.trim() === '') return;

  const amount = Number(amountInput);

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Enter a valid payment amount.', 'error');
    return;
  }

  if (amount > numberValue(record.outstanding)) {
    const confirmed = window.confirm(
      'Payment is greater than the outstanding amount. Record it anyway?'
    );
    if (!confirmed) return;
  }

  const notes = window.prompt('Optional payment notes:') || '';

  const previousRecords = records;
  const newPaidAmount = numberValue(record.paidAmount) + amount;
  const remaining = Math.max(0, numberValue(record.outstanding) - amount);

  const updatedRecord = {
    ...record,
    paidAmount: newPaidAmount,
    outstanding: remaining,
    status: remaining === 0 ? 'Paid' : record.status,
    payments: [
      ...(Array.isArray(record.payments) ? record.payments : []),
      {
        id: createId(),
        amount,
        date: new Date().toISOString(),
        notes: notes.trim()
      }
    ],
    updatedAt: new Date().toISOString()
  };

  records = records.map((item) =>
    item.id === recordId ? updatedRecord : item
  );

  if (!saveRecords()) {
    records = previousRecords;
    return;
  }

  renderAll();
  showToast('Payment recorded successfully.');
}

// -------------------------------------
// PTP MANAGEMENT
// -------------------------------------

function updatePTP(recordId) {
  const record = records.find((item) => item.id === recordId);
  if (!record) return;

  const amountInput = window.prompt(
    'Enter the promised payment amount:',
    String(record.promisedAmount || '')
  );

  if (amountInput === null || amountInput.trim() === '') return;

  const amount = Number(amountInput);

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Enter a valid promised amount.', 'error');
    return;
  }

  const dateInput = window.prompt(
    'Enter the promise date (YYYY-MM-DD):',
    record.ptpDate || todayISO()
  );

  if (dateInput === null || dateInput.trim() === '') return;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput) ||
      Number.isNaN(new Date(`${dateInput}T00:00:00`).getTime())) {
    showToast('Enter a valid date in YYYY-MM-DD format.', 'error');
    return;
  }

  const previousRecords = records;

  const updatedRecord = {
    ...record,
    promisedAmount: amount,
    ptpDate: dateInput,
    status: 'PTP',
    updatedAt: new Date().toISOString()
  };

  records = records.map((item) =>
    item.id === recordId ? updatedRecord : item
  );

  if (!saveRecords()) {
    records = previousRecords;
    return;
  }

  renderAll();
  showToast('Promise to Pay updated.');
}

// -------------------------------------
// PAYMENT & PTP ACTION HANDLER
// -------------------------------------

function handlePaymentAction(event) {
  const button = event.target.closest('[data-payment-action]');
  if (!button) return;

  const action = button.dataset.paymentAction;
  const recordId = button.dataset.id;

  if (action === 'payment') {
    recordPayment(recordId);
  } else if (action === 'ptp') {
    updatePTP(recordId);
  }
}

// -------------------------------------
// INITIALIZATION
// -------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', handlePaymentAction);
});
