import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'pushups-483221-9a37d8039be6.json');
const milesSheetId = process.env.MILES_SHEET_ID ? process.env.MILES_SHEET_ID.trim() : undefined;
const milesSheetName = process.env.MILES_SHEET_NAME ? process.env.MILES_SHEET_NAME.trim() : 'Sheet1';

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

const toISODate = date => date.toISOString().slice(0, 10);

const isIsoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());

const formatSheetDate = iso => {
  const date = new Date(`${iso}T00:00:00Z`);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
};

const pickDateFormatter = (values, dateIndex) => {
  const rows = values.slice(1);
  for (const row of rows) {
    const raw = row[dateIndex];
    if (!raw) continue;
    const trimmed = String(raw).trim();
    if (isIsoDate(trimmed)) return iso => iso;
    if (trimmed.includes('/')) return formatSheetDate;
  }
  return iso => iso;
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!milesSheetId) {
    res.status(400).json({ error: 'Missing MILES_SHEET_ID. Set it in the environment.' });
    return;
  }

  const { name, date, miles, mode, existingTotal } = req.body || {};
  const safeName = String(name || '').trim();
  const safeDate = String(date || '').trim();
  const value = Number(miles);
  if (!safeName || !safeDate || !Number.isFinite(value)) {
    res.status(400).json({ error: 'Missing name, date, or miles' });
    return;
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const range = `${milesSheetName}!A1:ZZ`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: milesSheetId,
      range
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      res.status(400).json({ error: 'Sheet is empty' });
      return;
    }

    const headers = values[0].map(header => String(header || '').trim());
    const lowerHeaders = headers.map(header => header.toLowerCase());
    const dateIndex = lowerHeaders.indexOf('date');
    const nameIndex = lowerHeaders.indexOf('name');
    const milesIndex = lowerHeaders.indexOf('miles');

    if (dateIndex !== -1 && nameIndex !== -1 && milesIndex !== -1) {
      const formatDate = pickDateFormatter(values, dateIndex);
      let amount = value;
      if (mode === 'set' && Number.isFinite(existingTotal)) {
        amount = value - Number(existingTotal);
      }
      if (amount === 0) {
        res.json({ ok: true, message: 'No change' });
        return;
      }

      const row = Array(headers.length).fill('');
      row[dateIndex] = formatDate(safeDate);
      row[nameIndex] = safeName;
      row[milesIndex] = amount;

      await sheets.spreadsheets.values.append({
        spreadsheetId: milesSheetId,
        range: milesSheetName,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
      });

      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Sheet must have Date, Name, and Miles columns' });
  } catch (error) {
    console.error('Failed to log miles', error);
    res.status(500).json({ error: 'Failed to log miles' });
  }
}
