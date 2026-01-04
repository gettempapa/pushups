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
  if (!sheetId) {
    res.status(400).json({ error: 'Missing SHEET_ID. Set it in the environment.' });
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
      res.json({ series: [], dates: [] });
      return;
    }

    const headers = values[0].map(header => String(header || '').trim());
    const lowerHeaders = headers.map(header => header.toLowerCase());
    const rows = values.slice(1).filter(row => row.some(cell => cell));

    const dateIndex = lowerHeaders.indexOf('date');
    const nameIndex = lowerHeaders.indexOf('name');
    const pushupsIndex = lowerHeaders.indexOf('pushups');
    const pullupsIndex = lowerHeaders.indexOf('pullups');

    let dates = [];
    let series = [];
    let seriesByMetric = {};
    let metrics = [];

    if (dateIndex !== -1 && nameIndex !== -1 && pushupsIndex !== -1) {
      const dateOrder = [];
      const nameOrder = [];
      const metricColumns = [
        { key: 'pushups', index: pushupsIndex },
        { key: 'pullups', index: pullupsIndex }
      ].filter(metric => metric.index !== -1);
      const totalsByMetric = new Map();

      rows.forEach(row => {
        const date = row[dateIndex];
        const name = row[nameIndex];
        if (!date || !name) return;

        const normalizedName = String(name).trim();
        const normalizedDate = String(date).trim();

        if (!dateOrder.includes(normalizedDate)) dateOrder.push(normalizedDate);
        if (!nameOrder.includes(normalizedName)) nameOrder.push(normalizedName);

        metricColumns.forEach(metric => {
          const rawValue = row[metric.index];
          const value = Number(rawValue);
          const safeValue = rawValue === undefined || rawValue === '' || rawValue === null
            ? 0
            : Number.isFinite(value)
              ? value
              : 0;

          if (!totalsByMetric.has(metric.key)) totalsByMetric.set(metric.key, new Map());
          const totalsByName = totalsByMetric.get(metric.key);

          if (!totalsByName.has(normalizedName)) totalsByName.set(normalizedName, new Map());
          const perDate = totalsByName.get(normalizedName);
          perDate.set(normalizedDate, (perDate.get(normalizedDate) || 0) + safeValue);
        });
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
      metrics = metricColumns.map(metric => metric.key);
      seriesByMetric = Object.fromEntries(
        metrics.map(metric => {
          const totalsByName = totalsByMetric.get(metric) || new Map();
          const metricSeries = nameOrder.map(name => {
            const perDate = totalsByName.get(name) || new Map();
            const points = dates.map(date => ({
              date,
              value: perDate.get(date) || 0
            }));
            return { name, points };
          });
          return [metric, metricSeries];
        })
      );
      series = seriesByMetric.pushups || [];
    } else {
      const people = headers.slice(1).filter(Boolean);
      const wideRows = rows.filter(row => row[0]);

      dates = wideRows.map(row => row[0]);

      series = people.map((name, index) => {
        const points = wideRows.map(row => {
          const raw = row[index + 1];
          const value = Number(raw);
          return {
            date: row[0],
            value: Number.isFinite(value) ? value : 0
          };
        });

        return { name, points };
      });
      metrics = ['pushups'];
      seriesByMetric = { pushups: series };
    }

    res.json({ series, seriesByMetric, metrics, dates, goal: 100 });
  } catch (error) {
    console.error('Failed to load sheet data', error);
    res.status(500).json({ error: 'Failed to load sheet data' });
  }
}
