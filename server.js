import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3456;

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'pushups-483221-9a37d8039be6.json');
const sheetId = process.env.SHEET_ID ? process.env.SHEET_ID.trim() : undefined;
const sheetName = process.env.SHEET_NAME ? process.env.SHEET_NAME.trim() : 'Sheet1';
const milesSheetId = process.env.MILES_SHEET_ID ? process.env.MILES_SHEET_ID.trim() : undefined;
const milesSheetName = process.env.MILES_SHEET_NAME ? process.env.MILES_SHEET_NAME.trim() : 'Sheet1';

if (!sheetId) {
  console.warn('Missing SHEET_ID in environment. Set SHEET_ID in .env or your shell.');
}
if (!milesSheetId) {
  console.warn('Missing MILES_SHEET_ID in environment. Miles tracking will be disabled.');
}

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
  if (!sheetId) return;
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${sheetName}!A1:ZZ`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });
  const values = response.data.values || [];
  if (!values.length) return;

  const headers = values[0].map(header => String(header || '').trim());
  const lowerHeaders = headers.map(header => header.toLowerCase());
  const rows = values.slice(1);

  const dateIndex = lowerHeaders.indexOf('date');
  const nameIndex = lowerHeaders.indexOf('name');
  const pushupsIndex = lowerHeaders.indexOf('pushups');
  const pullupsIndex = lowerHeaders.indexOf('pullups');

  if (dateIndex === -1 || nameIndex === -1 || pushupsIndex === -1) return;

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

  if (!people.size) return;

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

  if (!rowsToAppend.length) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rowsToAppend
    }
  });
};

const scheduleDailyBackfill = () => {
  let lastPstDate = getPstDateIso();
  setInterval(async () => {
    const nowPst = getPstDateIso();
    if (nowPst !== lastPstDate) {
      const target = lastPstDate;
      lastPstDate = nowPst;
      try {
        await backfillZeros(target, target);
      } catch (error) {
        console.error('Daily backfill failed', error);
      }
    }
  }, 60 * 1000);
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/data', async (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  if (!sheetId) {
    return res.status(400).json({ error: 'Missing SHEET_ID. Set it in the environment.' });
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
      return res.json({ series: [], dates: [] });
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
});

app.use(express.json());

app.post('/api/summary', async (req, res) => {
  try {
    const { standings, date } = req.body;
    if (!standings || !Array.isArray(standings)) {
      return res.status(400).json({ error: 'Missing standings data' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });
    }

    const anthropic = new Anthropic({ apiKey });

    const standingsText = standings
      .sort((a, b) => b.value - a.value)
      .map((s, i) => `${i + 1}. ${s.name}: ${s.value} pushups${s.isDeceased ? ' (inactive 4+ days)' : ''}`)
      .join('\n');

    const prompt = `You are a witty sports commentator giving a daily pushup competition update. Write a brief, entertaining 2-3 sentence summary of today's standings in the style of a golf SportsCenter recap. Be playful and include some well-meaning but pointed smack talk for anyone falling behind (especially those marked as inactive). Reference specific names and their pushup counts. Keep it fun and motivating.

Today's date: ${date}
Current standings:
${standingsText}

Write ONLY the summary text, no intro or sign-off. Be concise but entertaining.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = message.content[0].text;
    res.json({ summary });
  } catch (error) {
    console.error('Summary generation failed', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

app.listen(port, () => {
  console.log(`Pushups server running at http://localhost:${port}`);
  scheduleDailyBackfill();
});
