/**
 * Google Apps Script Web App endpoint for valuation form submissions.
 *
 * Setup:
 * 1) Create a sheet named "BSB Valuation Leads" and tab "Submissions".
 * 2) Add headers in row 1 matching FIELDS below.
 * 3) Deploy as Web App (execute as you, access anyone with link).
 * 4) Paste deployment URL into CONFIG.WEBHOOK_URL in valuation-form.js.
 */
const SHEET_NAME = 'Submissions';
const FIELDS = [
  'submittedAt',
  'contactName',
  'email',
  'businessType',
  'revenue',
  'ebitda',
  'ebitdaMarginPct',
  'growthRatePct',
  'recurringRevenuePct',
  'topCustomerPct',
  'ownerDependence',
  'multipleLow',
  'multipleHigh',
  'valuationLow',
  'valuationHigh'
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    const values = FIELDS.map((field) => payload[field] ?? '');
    sheet.appendRow(values);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
