
// CollectionX — Dashboard Module
// File: js/dashboard.js

'use strict';

// -------------------------------------
// DASHBOARD RENDERING
// -------------------------------------

function renderDashboard() {
  renderDashboardStats();
  renderStatusChart();
  renderDashboardFollowups();
  renderRecentCustomers();
}

// -------------------------------------
// DASHBOARD STATISTICS
// -------------------------------------

function renderDashboardStats() {
  const totalCustomers = records.length;

  const totalOutstanding = records.reduce(
    (sum, record) => sum + numberValue(record.outstanding),
    0
  );

  const today = todayISO();

  const todayCalls = records.filter(
    (record) => record.nextFollowup === today
  ).length;

  const ptpCases = records.filter(
    (record) => record.status === 'PTP'
  ).length;

  const paidCases = records.filter(
    (record) => record.status === 'Paid'
  ).length;

  const contactedCases = records.filter(
    (record) =>
      Array.isArray(record.callHistory) &&
      record.callHistory.length > 0
  ).length;

  const contactRate = totalCustomers
    ? Math.round((contactedCases / totalCustomers) * 100)
    : 0;

  const totalPromised = records.reduce(
    (sum, record) => sum + numberValue(record.promisedAmount),
    0
  );

  const totalPaid = records.reduce(
    (sum, record) => sum + numberValue(record.paidAmount),
    0
  );

  const achievement = totalPromised > 0
    ? Math.min(100, Math.round((totalPaid / totalPromised) * 100))
    : 0;

  setText('totalCustomers', totalCustomers);
  setText('totalOutstanding', money(totalOutstanding));
  setText('todayCalls', todayCalls);
  setText('contactRate', `${contactRate}%`);
  setText('ptpCases', ptpCases);
  setText('paidCases', paidCases);
  setText('collectionAchievement', `${achievement}%`);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

// -------------------------------------
// COLLECTION STATUS CHART
// -------------------------------------

function renderStatusChart() {
  const container = document.getElementById('statusChart');
  if (!container) return;

  const statuses = [
    { name: 'Pending', color: '#94a3b8' },
    { name: 'Contacted', color: '#38bdf8' },
    { name: 'PTP', color: '#a78bfa' },
    { name: 'Paid', color: '#34d399' },
    { name: 'Disputed', color: '#fb7185' }
  ];

  const total = records.length;

  const counts = statuses.map((status) => ({
    ...status,
    count: records.filter((record) => record.status === status.name).length
  }));

  if (total === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No customer data yet.</p>
        <span>Add customers to see your collection breakdown.</span>
      </div>
    `;
    return;
  }

  const bars = counts.map((status) => {
    const percentage = Math.round((status.count / total) * 100);

    return `
      <div class="chart-row">
        <div class="chart-label">
          <span class="chart-dot" style="background:${status.color}"></span>
          <span>${escapeHTML(status.name)}</span>
        </div>
        <div class="chart-track">
          <div
            class="chart-fill"
            style="width:${percentage}%;background:${status.color}"
          ></div>
        </div>
        <span class="chart-count">${status.count}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="status-chart-list">${bars}</div>`;
}

// -------------------------------------
// TODAY'S FOLLOW-UPS
// -------------------------------------

function renderDashboardFollowups() {
  const container = document.getElementById('dashboardFollowups');
  if (!container) return;

  const today = todayISO();

  const followups = records
    .filter((record) => record.nextFollowup === today)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 5);

  if (followups.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>You're all clear for today.</p>
        <span>No follow-ups are scheduled for today.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = followups.map((record) => `
    <div class="followup-item">
      <div class="followup-avatar">
        ${escapeHTML(getInitials(record.name))}
      </div>
      <div class="followup-info">
        <strong>${escapeHTML(record.name)}</strong>
        <span>${escapeHTML(record.mobile || 'No mobile number')}</span>
      </div>
      <div class="followup-meta">
        <span class="status-badge ${getStatusClass(record.status)}">
          ${escapeHTML(record.status || 'Pending')}
        </span>
        <strong>${money(record.outstanding)}</strong>
      </div>
    </div>
  `).join('');
}

// -------------------------------------
// RECENT CUSTOMER RECORDS
// -------------------------------------

function renderRecentCustomers() {
  const container = document.getElementById('recentCustomerRows');
  if (!container) return;

  const recent = [...records]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">
          No customer records yet.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = recent.map((record) => `
    <tr>
      <td>
        <div class="customer-cell">
          <div class="customer-avatar">
            ${escapeHTML(getInitials(record.name))}
          </div>
          <div>
            <strong>${escapeHTML(record.name)}</strong>
            <span>${escapeHTML(record.customerId || '—')}</span>
          </div>
        </div>
      </td>
      <td>${escapeHTML(record.mobile || '—')}</td>
      <td>${money(record.outstanding)}</td>
      <td>
        <span class="status-badge ${getStatusClass(record.status)}">
          ${escapeHTML(record.status || 'Pending')}
        </span>
      </td>
      <td>${formatDate(record.nextFollowup)}</td>
    </tr>
  `).join('');
}

// -------------------------------------
// SHARED DISPLAY HELPERS
// -------------------------------------

function getInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getStatusClass(status) {
  const classes = {
    Pending: 'status-pending',
    Contacted: 'status-contacted',
    PTP: 'status-ptp',
    Paid: 'status-paid',
    Disputed: 'status-disputed'
  };

  return classes[status] || 'status-pending';
}
