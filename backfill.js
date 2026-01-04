import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'pushups-483221-9a37d8039be6.json');
const sheetId = process.env.SHEET_ID;
const sheetName = process.env.SHEET_NAME || 'Sheet1';

if (!sheetId) {
  console.error('Missing SHEET_ID in environment.');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

const parseDateString = value => {
  if (!value) return null;
  const str = String(value).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, m, d, yRaw] = slashMatch;
    const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    return new Date(Date.UTC(year, Number(m) - 1, Number(d)));
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = date => date.toISOString().slice(0, 10);

const formatSheetDate = iso => {
  const date = new Date(`${iso}T00:00:00Z`);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
};

const buildDateRange = (startIso, endIso) => {
  const result = [];
  let cursor = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  while (cursor <= end) {
    result.push(toIsoDate(cursor));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
  }
  return result;
};

const backfillZeros = async (startIso, endIso) => {
  const range = `${sheetName}!A1:ZZ`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });
  const values = response.data.values || [];
  if (!values.length) return 0;

  const headers = values[0].map(header => String(header || '').trim());
  const lowerHeaders = headers.map(header => header.toLowerCase());
  const rows = values.slice(1);

  const dateIndex = lowerHeaders.indexOf('date');
  const nameIndex = lowerHeaders.indexOf('name');
  const pushupsIndex = lowerHeaders.indexOf('pushups');
  const pullupsIndex = lowerHeaders.indexOf('pullups');

  if (dateIndex === -1 || nameIndex === -1 || pushupsIndex === -1) return 0;

  const people = new Set();
  const existing = new Map();

  rows.forEach(row => {
    const rawDate = row[dateIndex];
    const rawName = row[nameIndex];
    if (!rawDate || !rawName) return;
    const parsed = parseDateString(rawDate);
    if (!parsed) return;
    const iso = toIsoDate(parsed);
    const name = String(rawName).trim();
    people.add(name);
    if (!existing.has(iso)) existing.set(iso, new Set());
    existing.get(iso).add(name);
  });

  if (!people.size) return 0;

  const dates = buildDateRange(startIso, endIso);
  const rowsToAppend = [];
  const hasPullups = pullupsIndex !== -1;

  dates.forEach(iso => {
    const namesForDate = existing.get(iso) || new Set();
    people.forEach(name => {
      if (namesForDate.has(name)) return;
      const row = [];
      row[dateIndex] = formatSheetDate(iso);
      row[nameIndex] = name;
      row[pushupsIndex] = 0;
      if (hasPullups) row[pullupsIndex] = 0;
      rowsToAppend.push(row);
    });
  });

  if (!rowsToAppend.length) return 0;

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rowsToAppend
    }
  });

  return rowsToAppend.length;
};

const main = async () => {
  const range = `${sheetName}!A1:ZZ`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });
  const values = response.data.values || [];
  if (values.length < 2) {
    console.log('No data rows found.');
    return;
  }

  const rows = values.slice(1);
  const parsedDates = rows
    .map(row => parseDateString(row[0]))
    .filter(Boolean)
    .sort((a, b) => a - b);

  const earliest = parsedDates.length ? toIsoDate(parsedDates[0]) : '2025-12-31';
  const startIso = earliest < '2025-12-31' ? earliest : '2025-12-31';
  const latest = parsedDates.length ? toIsoDate(parsedDates[parsedDates.length - 1]) : startIso;

  const added = await backfillZeros(startIso, latest);
  console.log(`Backfill complete. Added ${added} rows.`);
};

main().catch(error => {
  console.error('Backfill failed', error);
  process.exit(1);
});
