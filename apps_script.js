// Paste this into your Google Apps Script editor.
// Replace SPREADSHEET_ID_HERE with your Google Sheet ID (from its URL).

const SPREADSHEET_ID = "1GlAj7RuXpRvBerSDXWhXoJfBP5ELs_H7Oj9rTUqPAcw";

function doPost(e) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  const data  = JSON.parse(e.postData.contents);

  const row = [new Date().toISOString(), data.completionCode || ""];
  data.answers.forEach(ans => {
    row.push(`sample=${ans.sampleIdx}|methodLeft=${ans.methodLeft}|methodRight=${ans.methodRight}|winner=${ans.winner}|winnerMethod=${ans.winnerMethod}`);
  });

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this once manually to add header row
function addHeaders() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  const headers = ["Timestamp", "Completion Code"];
  for (let i = 0; i < 10; i++) headers.push(`Sample ${String(i).padStart(2, "0")}`);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}
