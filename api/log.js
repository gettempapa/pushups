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

const columnToLetter = index => {
  let col = '';
  let i = index + 1;
  while (i > 0) {
    const rem = (i - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    i = Math.floor((i - 1) / 26);
  }
  return col;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!sheetId) {
    res.status(400).json({ error: 'Missing SHEET_ID. Set it in the environment.' });
    return;
  }

  const { name, date, pushups, mode, existingTotal } = req.body || {};
  const safeName = String(name || '').trim();
  const safeDate = String(date || '').trim();
  const value = Number(pushups);
  if (!safeName || !safeDate || !Number.isFinite(value)) {
    res.status(400).json({ error: 'Missing name, date, or pushups' });
    return;
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const range = `${sheetName}!A1:ZZ`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
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
    const pushupsIndex = lowerHeaders.indexOf('pushups');

    if (dateIndex !== -1 && nameIndex !== -1 && pushupsIndex !== -1) {
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
      row[pushupsIndex] = amount;

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
      });

      res.json({ ok: true });
      return;
    }

    const nameColumnIndex = headers.findIndex(header => header.trim().toLowerCase() === safeName.toLowerCase());
    if (nameColumnIndex === -1) {
      res.status(400).json({ error: 'Name not found in header row' });
      return;
    }

    const formatDate = pickDateFormatter(values, 0);
    let targetRowIndex = -1;
    for (let i = 1; i < values.length; i += 1) {
      const rawDate = values[i][0];
      if (!rawDate) continue;
      const parsed = parseDateString(rawDate);
      if (parsed && toISODate(parsed) === safeDate) {
        targetRowIndex = i;
        break;
      }
      if (String(rawDate).trim() === safeDate) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      const row = Array(headers.length).fill('');
      row[0] = formatDate(safeDate);
      row[nameColumnIndex] = value;
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
      });
      res.json({ ok: true });
      return;
    }

    const currentValue = Number(values[targetRowIndex][nameColumnIndex]) || 0;
    const nextValue = mode === 'set' ? value : currentValue + value;
    const column = columnToLetter(nameColumnIndex);
    const rowNumber = targetRowIndex + 1;
    const cellRange = `${sheetName}!${column}${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: cellRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[nextValue]] }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to log pushups', error);
    res.status(500).json({ error: 'Failed to log pushups' });
  }
}
