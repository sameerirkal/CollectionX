
// CollectionX — Excel Import, Export & MIS Module
// File: js/excel.js

'use strict';

// -------------------------------------
// 1. EXCEL LIBRARY CHECK
// -------------------------------------

function isExcelAvailable() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library is unavailable. Check your internet connection.', 'error');
    return false;
  }
  return true;
}

// -------------------------------------
// 2. HEADER NORMALIZATION
// -------------------------------------

function normalizeHeader(header) {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const excelHeaderMap = {
  name: ['name', 'customername', 'customer'],
  mobile: ['mobile', 'mobilenumber', 'phone', 'phonenumber', 'contact'],
  customerId: ['customerid', 'customeridnumber', 'clientid'],
  accountReference: ['accountreference', 'accountref', 'accountnumber', 'account'],
  outstanding: ['outstanding', 'outstandingamount', 'balance', 'dues'],
  minimumDue: ['minimumdue', 'minimumamountdue', 'mindue'],
  bareMinimum: ['bareminimum', 'baremin'],
  cycleAllocation: ['cycleallocation', 'cycle'],
  accountStatus: ['accountstatus', 'accountstate'],
  status: ['status', 'collectionstatus', 'callstatus'],
  nextFollowup: ['nextfollowup', 'followupdate', 'nextcall', 'nextfollowupdate'],
  ptpDate: ['ptpdate', 'promisedate', 'promiseby'],
  promisedAmount: ['promisedamount', 'ptpamount', 'promiseamount'],
  paidAmount: ['paidamount', 'amountpaid', 'paymentreceived', 'paid'],
  notes: ['notes', 'remarks', 'comments']
};

function mapExcelRow(row) {
  const normalizedRow = {};

  Object.entries(row).forEach(([key, value]) => {
    normalizedRow[normalizeHeader(key)] = value;
  });

  const result = {};

  Object.entries(excelHeaderMap).forEach(([field, aliases]) => {
    const matchedKey = aliases.find((alias) =>
      Object.prototype.hasOwnProperty.call(normalizedRow, alias)
    );

    if (matchedKey) result[field] = normalizedRow[matchedKey];
  });

  return result;
}

function excelDateToISO(value) {
  if (!value) return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0')
    ].join('-');
  }

  if (typeof value === 'number' && isExcelAvailable()) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return [
        parsed.y,
        String(parsed.m).padStart(2, '0'),
        String(parsed.d).padStart(2, '0')
      ].join('-');
    }
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsedDate = new Date(text);
  if (Number.isNaN(parsedDate.getTime())) return '';

  return [
    parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, '0'),
    String(parsedDate.getDate()).padStart(2, '0')
  ].join('-');
}

function normalizeImportedRecord(row) {
  const mapped = mapExcelRow(row);

  const validStatuses = [
    'Pending',
    'Contacted',
    'PTP',
    'Paid',
    'Disputed'
  ];

  const importedStatus = String(mapped.status || 'Pending').trim();
  const status = validStatuses.find(
    (item) => item.toLowerCase() === importedStatus.toLowerCase()
  ) || 'Pending';

  return {
    id: createId(),
    name: String(mapped.name || '').trim(),
    mobile: String(mapped.mobile || '').trim(),
    customerId: String(mapped.customerId || '').trim(),
    accountReference: String(mapped.accountReference || '').trim(),
    outstanding: numberValue(mapped.outstanding),
    minimumDue: numberValue(mapped.minimumDue),
    bareMinimum: numberValue(mapped.bareMinimum),
    cycleAllocation: String(mapped.cycleAllocation || '').trim(),
    accountStatus: String(mapped.accountStatus || 'Active').trim(),
    status,
    nextFollowup: excelDateToISO(mapped.nextFollowup),
    ptpDate: excelDateToISO(mapped.ptpDate),
    promisedAmount: numberValue(mapped.promisedAmount),
    paidAmount: numberValue(mapped.paidAmount),
    notes: String(mapped.notes || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    callHistory: [],
    payments: []
  };
}

// -------------------------------------
// 3. IMPORT EXCEL FILE
// -------------------------------------

async function importExcelFile(file) {
  if (!file || !isExcelAvailable()) return;

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      showToast('The spreadsheet has no worksheets.', 'error');
      return;
    }

    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: true
    });

    if (rows.length === 0) {
      showToast('The spreadsheet contains no customer rows.', 'error');
      return;
    }

    const imported = rows
      .map(normalizeImportedRecord)
      .filter((record) => record.name);

    if (imported.length === 0) {
      showToast('No valid customer names were found.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Import ${imported.length} customer records? Existing records will be kept.`
    );

    if (!confirmed) return;

    const previousRecords = records;
    records = [...imported, ...records];

    if (!saveRecords()) {
      records = previousRecords;
      return;
    }

    renderAll();
    showToast(`${imported.length} customers imported.`);
  } catch (error) {
    console.error('Excel import failed:', error);
    showToast('Could not read this Excel file.', 'error');
  }
}

// -------------------------------------
// 4. EXPORT CUSTOMER DATA
// -------------------------------------

function exportCustomersExcel() {
  if (!isExcelAvailable()) return;

  const rows = records.map((record) => ({
    'Customer Name': record.name,
    'Mobile Number': record.mobile,
    'Customer ID': record.customerId,
    'Account Reference': record.accountReference,
    'Outstanding Amount': numberValue(record.outstanding),
    'Minimum Due': numberValue(record.minimumDue),
    'Bare Minimum': numberValue(record.bareMinimum),
    'Cycle Allocation': record.cycleAllocation,
    'Account Status': record.accountStatus,
    'Collection Status': record.status,
    'Next Follow-up': record.nextFollowup,
    'PTP Date': record.ptpDate,
    'Promised Amount': numberValue(record.promisedAmount),
    'Paid Amount': numberValue(record.paidAmount),
    'Notes': record.notes
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
    { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
    { wch: 18 }, { wch: 16 }, { wch: 32 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  XLSX.writeFile(workbook, `CollectionX_Customers_${todayISO()}.xlsx`);
  showToast('Customer Excel file downloaded.');
}

// -------------------------------------
// 5. GENERATE MIS REPORT
// -------------------------------------

function buildMISSummary() {
  const totalOutstanding = records.reduce(
    (sum, record) => sum + numberValue(record.outstanding),
    0
  );

  const totalPaid = records.reduce(
    (sum, record) => sum + numberValue(record.paidAmount),
    0
  );

  const totalPromised = records.reduce(
    (sum, record) => sum + numberValue(record.promisedAmount),
    0
  );

  const statusCounts = {};

  records.forEach((record) => {
    const status = record.status || 'Pending';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return {
    generatedOn: new Date().toLocaleString('en-IN'),
    totalCustomers: records.length,
    totalOutstanding,
    totalPaid,
    totalPromised,
    achievement: totalPromised > 0
      ? Math.round((totalPaid / totalPromised) * 100)
      : 0,
    statusCounts
  };
}

function exportMISReport() {
  if (!isExcelAvailable()) return;

  const summary = buildMISSummary();

  const overviewRows = [
    { Metric: 'Report Generated', Value: summary.generatedOn },
    { Metric: 'Total Customers', Value: summary.totalCustomers },
    { Metric: 'Total Outstanding', Value: summary.totalOutstanding },
    { Metric: 'Total Paid', Value: summary.totalPaid },
    { Metric: 'Total Promised', Value: summary.totalPromised },
    { Metric: 'Collection Achievement (%)', Value: summary.achievement }
  ];

  const statusRows = Object.entries(summary.statusCounts).map(
    ([status, count]) => ({
      'Collection Status': status,
      'Customer Count': count
    })
  );

  const customerRows = records.map((record) => ({
    'Customer Name': record.name,
    'Customer ID': record.customerId,
    'Account Reference': record.accountReference,
    'Mobile Number': record.mobile,
    'Outstanding': numberValue(record.outstanding),
    'Paid Amount': numberValue(record.paidAmount),
    'Promised Amount': numberValue(record.promisedAmount),
    'Collection Status': record.status,
    'Next Follow-up': record.nextFollowup,
    'PTP Date': record.ptpDate
  }));

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(overviewRows),
    'Overview'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(statusRows),
    'Status Summary'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(customerRows),
    'Customer Details'
  );

  XLSX.writeFile(workbook, `CollectionX_MIS_${todayISO()}.xlsx`);
  showToast('MIS report downloaded.');
}

// -------------------------------------
// 6. CONNECT BUTTONS & FILE INPUT
// -------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const importButton = document.getElementById('importExcelBtn');
  const fileInput = document.getElementById('excelFileInput');
  const exportButton = document.getElementById('exportExcelBtn');
  const reportButton = document.getElementById('exportReportBtn');

  importButton?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (file) await importExcelFile(file);
    event.target.value = '';
  });

  exportButton?.addEventListener('click', exportCustomersExcel);
  reportButton?.addEventListener('click', exportMISReport);
});
