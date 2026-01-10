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
  if (!milesSheetId) {
    res.json({ series: [], dates: [], enabled: false });
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
      res.json({ series: [], dates: [], enabled: true });
      return;
    }

    const headers = values[0].map(header => String(header || '').trim());
    const lowerHeaders = headers.map(header => header.toLowerCase());
    const rows = values.slice(1).filter(row => row.some(cell => cell));

    const dateIndex = lowerHeaders.indexOf('date');
    const nameIndex = lowerHeaders.indexOf('name');
    const milesIndex = lowerHeaders.indexOf('miles');

    let dates = [];
    let series = [];

    if (dateIndex !== -1 && nameIndex !== -1 && milesIndex !== -1) {
      const dateOrder = [];
      const nameOrder = [];
      const totalsByName = new Map();

      rows.forEach(row => {
        const date = row[dateIndex];
        const name = row[nameIndex];
        if (!date || !name) return;

        const normalizedName = String(name).trim();
        const normalizedDate = String(date).trim();
        const parsedDate = parseDateString(normalizedDate);
        const isoKey = parsedDate ? toISODate(parsedDate) : normalizedDate;

        if (!dateOrder.includes(isoKey)) dateOrder.push(isoKey);
        if (!nameOrder.includes(normalizedName)) nameOrder.push(normalizedName);

        const rawValue = row[milesIndex];
        const value = Number(rawValue);
        const safeValue = rawValue === undefined || rawValue === '' || rawValue === null
          ? 0
          : Number.isFinite(value)
            ? value
            : 0;

        if (!totalsByName.has(normalizedName)) totalsByName.set(normalizedName, new Map());
        const perDate = totalsByName.get(normalizedName);
        perDate.set(isoKey, (perDate.get(isoKey) || 0) + safeValue);
      });

      const sortedDates = [...dateOrder];
      const parsedDates = sortedDates.map(date => ({
        date,
        parsed: parseDateString(date)
      }));
      parsedDates.sort((a, b) => {
        if (a.parsed && b.parsed) return a.parsed - b.parsed;
        if (a.parsed) return -1;
        if (b.parsed) return 1;
        return String(a.date).localeCompare(String(b.date));
      });

      dates = parsedDates.map(item => item.date);
      series = nameOrder.map(name => {
        const perDate = totalsByName.get(name) || new Map();
        const points = dates.map(date => ({
          date,
          value: perDate.get(date) || 0
        }));
        return { name, points };
      });
    }

    res.json({ series, dates, goal: 10, enabled: true });
  } catch (error) {
    console.error('Failed to load miles data', error);
    res.status(500).json({ error: 'Failed to load miles data' });
  }
}
