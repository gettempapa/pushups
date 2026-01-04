import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'pushups-483221-9a37d8039be6.json');
const sheetId = process.env.SHEET_ID ? process.env.SHEET_ID.trim() : undefined;
const sheetName = process.env.SHEET_NAME ? process.env.SHEET_NAME.trim() : 'Sheet1';

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

const getAuth = () => {
  const rawB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (rawB64) {
    const json = Buffer.from(rawB64, 'base64').toString('utf8');
    const credentials = JSON.parse(json);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  }
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const credentials = JSON.parse(raw);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  }
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
};

const getPstDateIso = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

const addDaysIso = (iso, delta) => {
  const date = new Date(`${iso}T00:00:00Z`);
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + delta));
  return toIsoDate(next);
};

const backfillZeros = async (targetIso, sheets) => {
  if (!sheetId) return 0;
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
  const existing = new Set();

  rows.forEach(row => {
    const rawDate = row[dateIndex];
    const rawName = row[nameIndex];
    if (!rawDate || !rawName) return;
    const parsed = parseDateString(rawDate);
    if (!parsed) return;
    const iso = toIsoDate(parsed);
    const name = String(rawName).trim();
    people.add(name);
    if (iso === targetIso) existing.add(name);
  });

  if (!people.size) return 0;

  const rowsToAppend = [];
  const hasPullups = pullupsIndex !== -1;

  people.forEach(name => {
    if (existing.has(name)) return;
    const row = [];
    row[dateIndex] = formatSheetDate(targetIso);
    row[nameIndex] = name;
    row[pushupsIndex] = 0;
    if (hasPullups) row[pullupsIndex] = 0;
    rowsToAppend.push(row);
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

export default async function handler(req, res) {
  if (!sheetId) {
    res.status(400).json({ error: 'Missing SHEET_ID.' });
    return;
  }

  const isCron = req.headers['x-vercel-cron'] === '1';
  if (!isCron) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const todayIso = getPstDateIso();
    const targetIso = addDaysIso(todayIso, -1);
    const added = await backfillZeros(targetIso, sheets);
    res.json({ ok: true, date: targetIso, added });
  } catch (error) {
    console.error('Backfill failed', error);
    res.status(500).json({ error: 'Backfill failed' });
  }
}
