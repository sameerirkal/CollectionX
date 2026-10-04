
// CollectionX — Follow-up & Call Tracking Module
// File: js/followups.js

'use strict';

// -------------------------------------
// FOLLOW-UP TABLE
// -------------------------------------

function renderFollowups() {
  const tableBody = document.getElementById('followupTableBody');
  if (!tableBody) return;

  const filter = document.getElementById('followupFilter')?.value || 'all';
  const today = todayISO();

  let followups = records.filter((record) => record.nextFollowup);

  if (filter === 'today') {
    followups = followups.filter((record) => record.nextFollowup === today);
  } else if (filter === 'upcoming') {
    followups = followups.filter((record) => record.nextFollowup > today);
  } else if (filter === 'overdue') {
    followups = followups.filter((record) => record.nextFollowup < today);
  }

  followups.sort((a, b) => a.nextFollowup.localeCompare(b.nextFollowup));

  if (followups.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          No follow-ups match this filter.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = followups.map((record) => `
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
      <td>${formatDate(record.nextFollowup)}</td>
      <td>${money(record.outstanding)}</td>
      <td>
        <span class="status-badge ${getStatusClass(record.status)}">
          ${escapeHTML(record.status || 'Pending')}
        </span>
      </td>
      <td>${getLatestCallOutcome(record)}</td>
      <td>
        <div class="table-actions">
          <a
            class="icon-btn"
            href="${getPhoneLink(record.mobile)}"
            title="Call customer"
            aria-label="Call ${escapeHTML(record.name)}"
          >
            <i data-lucide="phone"></i>
          </a>
          <button
            class="icon-btn"
            type="button"
            data-action="log-call"
            data-id="${escapeHTML(record.id)}"
            title="Log call"
            aria-label="Log call for ${escapeHTML(record.name)}"
          >
            <i data-lucide="clipboard-list"></i>
          </button>
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
        </div>
      </td>
    </tr>
  `).join('');

  refreshIcons();
}

// -------------------------------------
// CALL OUTCOME HELPERS
// -------------------------------------

function getLatestCallOutcome(record) {
  const history = Array.isArray(record.callHistory)
    ? record.callHistory
    : [];

  if (history.length === 0) return '—';

  const latest = [...history].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || ''))
  )[0];

  return escapeHTML(latest.outcome || 'Call logged');
}

function getPhoneLink(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${encodeURIComponent(cleaned)}` : '#';
}

// -------------------------------------
// LOG A CALL
// -------------------------------------

function logCall(recordId) {
  const record = records.find((item) => item.id === recordId);
  if (!record) return;

  const outcome = window.prompt(
    'Call outcome:\n1. Contacted\n2. No answer\n3. Busy\n4. PTP\n5. Paid\n6. Disputed\n\nEnter the outcome:'
  );

  if (!outcome) return;

  const outcomeMap = {
    '1': 'Contacted',
    '2': 'No answer',
    '3': 'Busy',
    '4': 'PTP',
    '5': 'Paid',
    '6': 'Disputed'
  };

  const normalized = outcome.trim().toLowerCase();
  const selectedOutcome = outcomeMap[outcome.trim()] ||
    ({
      contacted: 'Contacted',
      'no answer': 'No answer',
      busy: 'Busy',
      ptp: 'PTP',
      paid: 'Paid',
      disputed: 'Disputed'
    })[normalized];

  if (!selectedOutcome) {
    showToast('Please enter a valid call outcome.', 'error');
    return;
  }

  const notes = window.prompt('Optional call notes:') || '';

  const previousRecords = records;

  const updatedRecord = {
    ...record,
    status: ['PTP', 'Paid', 'Disputed'].includes(selectedOutcome)
      ? selectedOutcome
      : 'Contacted',
    callHistory: [
      ...(Array.isArray(record.callHistory) ? record.callHistory : []),
      {
        id: createId(),
        date: new Date().toISOString(),
        outcome: selectedOutcome,
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
  showToast('Call activity saved.');
}

// -------------------------------------
// TABLE EVENTS
// -------------------------------------

function handleFollowupAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const recordId = button.dataset.id;

  if (action === 'log-call') {
    logCall(recordId);
  } else if (action === 'edit') {
    openCustomerModal(recordId);
  }
}

// -------------------------------------
// INITIALIZATION
// -------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('followupTableBody')
    ?.addEventListener('click', handleFollowupAction);

  document.getElementById('followupFilter')
    ?.addEventListener('change', renderFollowups);

  renderFollowups();
});
