const board = document.getElementById('board');
const statusEl = document.getElementById('status');
const metricToggle = document.getElementById('metric-toggle');
const todayBars = document.getElementById('today-bars');
const dayFilter = document.getElementById('day-filter');
const satisBars = document.getElementById('satis-bars');
const victoryRows = document.getElementById('victory-rows');
const latestUpdate = document.getElementById('latest-update');
const averageRows = document.getElementById('average-rows');
const deadlineClock = document.getElementById('deadline-clock');
const logFab = document.getElementById('log-fab');
const logModal = document.getElementById('log-modal');
const logForm = document.getElementById('log-form');
const logName = document.getElementById('log-name');
const logDate = document.getElementById('log-date');
const logCount = document.getElementById('log-count');
const logStatus = document.getElementById('log-status');
const logClose = document.getElementById('log-close');
const logExisting = document.getElementById('log-existing');
const logExistingText = document.getElementById('log-existing-text');
const dailySummary = document.getElementById('daily-summary');
const dailySummaryText = document.getElementById('daily-summary-text');

const animation = {
  start: null,
  duration: 2400,
  progress: 0,
  running: false
};

let charts = [];
let payloadCache = null;

const getMotivationalMessage = (name, count) => {
  if (count <= 1) {
    return `ONE pushup, ${name}? Really? My grandma does more than that getting out of bed. Pathetic.`;
  } else if (count <= 5) {
    return `${count} pushups, ${name}? That's not even a warmup. That's embarrassing.`;
  } else if (count <= 10) {
    return `${count} pushups... I mean, it's technically exercise I guess. Not impressive though, ${name}.`;
  } else if (count <= 20) {
    return `${count} pushups, ${name}. You're making a small dent. Baby steps I suppose.`;
  } else if (count <= 30) {
    return `Alright ${name}, ${count} pushups - now we're getting somewhere. Keep it up.`;
  } else if (count <= 50) {
    return `FUCK YEAH ${name}!! ${count} pushups, LET'S GOOOO!!!!`;
  } else if (count <= 75) {
    return `${name} just dropped ${count} pushups like it's NOTHING. ABSOLUTE BEAST MODE!!!!`;
  } else if (count <= 100) {
    return `${count} PUSHUPS?! ${name} IS ON FIRE!!! UNSTOPPABLE FORCE RIGHT HERE!!!!`;
  } else {
    return `HOLY SHIT ${name}!!! ${count} PUSHUPS?!?! YOU'RE A GODDAMN MACHINE!!!! LEGENDARY!!!!`;
  }
};

const showSuccessToast = (message) => {
  const toast = document.getElementById('success-toast');
  const toastMessage = document.getElementById('success-toast-message');
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 4000);
};

const generateDailySummary = async (series, targetDate) => {
  if (!dailySummary || !dailySummaryText) return;

  const todayIso = targetDate || getLocalIsoDate();

  // Build standings for today
  const standings = series.map(s => {
    const todayPoint = s.points.find(p => p.date === todayIso);
    const value = todayPoint?.value ?? 0;

    // Check if deceased (4+ days inactive)
    const datesWithActivity = s.points.filter(p => p.value > 0).map(p => p.date).sort();
    const lastActiveDate = datesWithActivity.length > 0 ? datesWithActivity[datesWithActivity.length - 1] : null;
    let isDeceased = false;
    if (lastActiveDate) {
      const lastDate = new Date(`${lastActiveDate}T00:00:00`);
      const today = new Date(`${todayIso}T00:00:00`);
      const daysSinceActive = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      isDeceased = daysSinceActive >= 4;
    }

    return { name: s.name, value, isDeceased };
  });

  try {
    const res = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standings, date: todayIso })
    });

    if (!res.ok) throw new Error('Failed to generate summary');

    const { summary } = await res.json();
    dailySummaryText.textContent = summary;
    dailySummary.style.display = 'block';

    // Persist to localStorage
    localStorage.setItem('dailySummary', JSON.stringify({ summary, date: todayIso, timestamp: Date.now() }));
  } catch (error) {
    console.error('Failed to generate summary:', error);
  }
};

const loadPersistedSummary = () => {
  if (!dailySummary || !dailySummaryText) return;

  const stored = localStorage.getItem('dailySummary');
  if (!stored) return;

  try {
    const { summary, date, timestamp } = JSON.parse(stored);
    // Show the summary if it exists
    if (summary) {
      dailySummaryText.textContent = summary;
      dailySummary.style.display = 'block';
    }
  } catch (e) {
    // Ignore parse errors
  }
};

let currentMetric = 'pushups';
let currentDay = null;
let currentDayIndex = null;
let isoIndexMap = new Map();
let dailyCache = { metric: null, series: [], dates: [] };
let canonicalDates = [];
let baseMonth = null;
let satisMonthState = new Map();
let activeLockedChart = null;
let documentClickBound = false;

const goal = 100;
const palette = [
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#fb7185',
  '#60a5fa',
  '#f97316',
  '#a3e635',
  '#e879f9'
];

const chartPadding = { top: 20, right: 16, bottom: 44, left: 40 };

const lerp = (a, b, t) => a + (b - a) * t;

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

const getPstParts = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
};

const updateDeadlineClock = () => {
  if (!deadlineClock) return;
  const now = new Date();
  const { year, month, day, hour, minute, second } = getPstParts();
  const nowUtc = Date.UTC(year, month - 1, day, hour, minute, second) + now.getMilliseconds();
  const endUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0);
  const remaining = Math.max(0, endUtc - nowUtc);
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const millis = String(Math.floor(remaining % 1000)).padStart(3, '0');
  deadlineClock.textContent = `${hours}:${minutes}:${seconds}.${millis}`;
};

const getLocalIsoDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toISODate = date => date.toISOString().slice(0, 10);

const formatPstTimestamp = () => {
  const now = new Date();
  const { year, month, day, hour, minute, second } = getPstParts();
  const millis = String(now.getMilliseconds()).padStart(3, '0');
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${millis}`;
};

const placePopup = (popup, container, desiredLeft, desiredTop) => {
  popup.style.left = `${desiredLeft}px`;
  popup.style.top = `${desiredTop}px`;
  const popupRect = popup.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  let left = desiredLeft;
  let top = desiredTop;

  if (popupRect.right > containerRect.right) {
    left = desiredLeft - popupRect.width - 12;
  }
  if (popupRect.left < containerRect.left) {
    left = 8;
  }
  if (popupRect.bottom > containerRect.bottom) {
    top = desiredTop - popupRect.height - 12;
  }
  if (popupRect.top < containerRect.top) {
    top = 8;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
};

const colorForValue = value => {
  const ratio = Math.min(Math.max(value / goal, 0), 1);
  // Modern gradient: muted pink -> cyan -> bright green
  const start = [100, 116, 139];  // Slate
  const mid = [34, 211, 238];     // Cyan
  const end = [52, 211, 153];     // Green
  const midPoint = 0.7;
  if (ratio < midPoint) {
    const t = ratio / midPoint;
    const r = Math.round(lerp(start[0], mid[0], t));
    const g = Math.round(lerp(start[1], mid[1], t));
    const b = Math.round(lerp(start[2], mid[2], t));
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = (ratio - midPoint) / (1 - midPoint);
  const r = Math.round(lerp(mid[0], end[0], t));
  const g = Math.round(lerp(mid[1], end[1], t));
  const b = Math.round(lerp(mid[2], end[2], t));
  return `rgb(${r}, ${g}, ${b})`;
};

const statusLabelForValue = value => {
  if (value >= 160) return 'ABSOLUTE CHAD-LIKE';
  if (value >= 140) return 'GODLIKE';
  if (value >= 120) return 'SUPERHUMAN';
  if (value >= 110) return 'MIND-BOGGLING';
  if (value >= 101) return 'RELENTLESS';
  if (value >= 100) return 'SATISFACTORY';
  if (value >= 90) return 'LEGENDARY';
  if (value >= 80) return 'LACKLUSTER';
  if (value >= 70) return 'HALF-ASSED';
  if (value >= 60) return 'UNDERWHELMING';
  if (value >= 50) return 'SUBPAR';
  if (value >= 40) return 'MEAGER';
  if (value >= 30) return 'ANEMIC';
  if (value >= 20) return 'PALTRY';
  if (value >= 10) return 'FEEBLE';
  return 'PATHETIC';
};

const articleFor = word => {
  if (!word) return 'a';
  const lower = word.toLowerCase();
  return ['a', 'e', 'i', 'o', 'u'].includes(lower[0]) ? 'an' : 'a';
};

const statusClassForValue = value => {
  if (value >= 110) return 'status hot';
  if (value >= 100) return 'status good';
  if (value < 10) return 'status pathetic';
  return 'status';
};

const formatDateLabel = iso => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!month || !day) return '';
  return `${month}/${day}`;
};

const monthLabel = date =>
  date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const addMonths = (date, delta) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));

const monthStart = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const buildCanonicalDates = dates => {
  const parsed = dates
    .map(date => parseDateString(date))
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (!parsed.length) return [];

  const start = new Date(Date.UTC(parsed[0].getUTCFullYear(), parsed[0].getUTCMonth(), parsed[0].getUTCDate()));
  const end = new Date(Date.UTC(parsed[parsed.length - 1].getUTCFullYear(), parsed[parsed.length - 1].getUTCMonth(), parsed[parsed.length - 1].getUTCDate()));
  const result = [];
  let cursor = start;
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
  }
  return result;
};

const buildCumulativeSeries = metricSeries =>
  metricSeries.map(series => {
    let total = 0;
    const points = [];

    series.points.forEach(point => {
      const daily = Number(point.value) || 0;
      const open = total;
      total += daily;
      points.push({
        date: point.date,
        daily,
        open,
        close: total
      });
    });

    return { name: series.name, points };
  });

const buildDailySeries = metricSeries =>
  metricSeries.map(series => ({
    name: series.name,
    points: series.points.map(point => ({
      date: point.date,
      daily: Number(point.value) || 0,
      open: Number(point.value) || 0,
      close: Number(point.value) || 0
    }))
  }));

const buildRollingSeries = (metricSeries, windowSize = 30) =>
  metricSeries.map(series => {
    const values = series.points.map(point => Number(point.value) || 0);
    const points = series.points.map((point, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const slice = values.slice(start, index + 1);
      const avg = slice.length ? Math.round(slice.reduce((sum, v) => sum + v, 0) / slice.length) : 0;
      return {
        date: point.date,
        daily: avg,
        open: avg,
        close: avg
      };
    });
    return { name: series.name, points };
  });

const buildCombinedCard = (metricSeries, metric, options = {}) => {
  const card = document.createElement('article');
  card.className = 'card flash combined';

  const header = document.createElement('div');
  header.className = 'card-header';

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = options.title || `YTD CUMULATIVE · ${metric}`;

  const badges = document.createElement('div');
  badges.className = 'badges';

  const note = document.createElement('span');
  note.className = 'badge';
  note.textContent = options.note || 'Cumulative YTD · hover for details';
  badges.appendChild(note);

  header.appendChild(name);
  header.appendChild(badges);

  const chartLayout = document.createElement('div');
  chartLayout.className = 'chart-layout';

  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  metricSeries.forEach((series, index) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = palette[index % palette.length];
    const label = document.createElement('span');
    label.textContent = series.name;
    label.style.color = palette[index % palette.length];
    if (options.showTotals !== false) {
      const total = series.points[series.points.length - 1]?.close ?? 0;
      const totalBadge = document.createElement('span');
      totalBadge.className = 'legend-total';
      totalBadge.textContent = total;
      item.appendChild(totalBadge);
    }
    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  });

  const chartWrap = document.createElement('div');
  chartWrap.className = 'chart-wrap';

  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 320;
  chartWrap.appendChild(canvas);

  const tooltip = document.createElement('div');
  tooltip.className = 'calendar-popup';
  chartWrap.appendChild(tooltip);

  card.appendChild(header);
  chartLayout.appendChild(legend);
  chartLayout.appendChild(chartWrap);

  card.appendChild(chartLayout);

  return {
    card,
    canvas,
    tooltip,
    series: metricSeries,
    metric,
    valueType: options.valueType || 'daily',
    yTicks: options.yTicks || null,
    yMax: options.yMax || null,
    hover: null,
    hoverSeries: null,
    selectedSeries: new Set(),
    legendItems: Array.from(legend.children)
  };
};

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const drawCombinedChart = (ctx, seriesList, progress, metricLabel, hoverState, hoverSeries, width, height, yTicks, yMaxOverride) => {
  const padding = chartPadding;
  if (!seriesList.length) return;

  const dateCount = seriesList[0].points.length;
  if (!dateCount) return;

  const computedMax = Math.max(
    ...seriesList.flatMap(series => series.points.map(point => point.close))
  );
  const maxValue = Math.max(yMaxOverride || 0, computedMax || 0, 1);

  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;
  const easedProgress = easeOutCubic(progress);

  ctx.save();
  ctx.translate(padding.left, padding.top);

  // Draw refined grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  if (Array.isArray(yTicks) && yTicks.length) {
    yTicks.forEach(tick => {
      const y = drawHeight - (tick / maxValue) * drawHeight;
      ctx.beginPath();
      ctx.setLineDash([4, 6]);
      ctx.moveTo(0, y);
      ctx.lineTo(drawWidth, y);
      ctx.stroke();
    });
  } else {
    for (let i = 0; i <= 4; i += 1) {
      const y = (drawHeight / 4) * i;
      ctx.beginPath();
      ctx.setLineDash([4, 6]);
      ctx.moveTo(0, y);
      ctx.lineTo(drawWidth, y);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  const totalSegments = Math.max(1, dateCount - 1);
  const maxIndex = totalSegments * easedProgress;

  const hasSelection = hoverSeries !== null && hoverSeries.size > 0;
  const order = hasSelection
    ? seriesList.map((_, index) => index).filter(index => !hoverSeries.has(index)).concat([...hoverSeries])
    : seriesList.map((_, index) => index);

  // Draw gradient fills first (behind lines)
  order.forEach(seriesIndex => {
    const series = seriesList[seriesIndex];
    const lineColor = palette[seriesIndex % palette.length];
    const rgb = hexToRgb(lineColor);
    const dimmed = hasSelection && !hoverSeries.has(seriesIndex);

    if (dimmed) return;

    ctx.save();
    ctx.beginPath();

    let firstX = null;
    let lastX = null;

    for (let i = 0; i < dateCount; i += 1) {
      if (i > maxIndex + 1) break;
      const point = series.points[i];

      const t = i <= maxIndex ? 1 : Math.max(0, maxIndex - (i - 1));
      if (t <= 0) continue;

      const x = dateCount > 1 ? (drawWidth / totalSegments) * i : drawWidth / 2;
      const y = drawHeight - (point.close / maxValue) * drawHeight;

      if (firstX === null) {
        firstX = x;
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      lastX = x;
    }

    if (firstX !== null && lastX !== null) {
      ctx.lineTo(lastX, drawHeight);
      ctx.lineTo(firstX, drawHeight);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, drawHeight);
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
      gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`);
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    ctx.restore();
  });

  // Draw smooth curves
  order.forEach(seriesIndex => {
    const series = seriesList[seriesIndex];
    const lineColor = palette[seriesIndex % palette.length];
    const scale = isCoarsePointer() ? 0.85 : 1;
    const dimmed = hasSelection && !hoverSeries.has(seriesIndex);
    const highlighted = hasSelection && hoverSeries.has(seriesIndex);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = (highlighted ? 3.5 : dimmed ? 1.5 : 2.5) * scale;
    ctx.globalAlpha = dimmed ? 0.35 : 1;

    // Glow effect
    if (!dimmed) {
      ctx.shadowBlur = highlighted ? 16 : 10;
      ctx.shadowColor = lineColor;
    }

    ctx.strokeStyle = dimmed ? 'rgba(148, 163, 184, 0.6)' : lineColor;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < dateCount; i += 1) {
      if (i > maxIndex + 1) break;
      const point = series.points[i];

      const x = dateCount > 1 ? (drawWidth / totalSegments) * i : drawWidth / 2;
      const y = drawHeight - (point.close / maxValue) * drawHeight;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        // Smooth curve using quadratic bezier
        const prevPoint = series.points[i - 1];
        const prevX = dateCount > 1 ? (drawWidth / totalSegments) * (i - 1) : drawWidth / 2;
        const prevY = drawHeight - (prevPoint.close / maxValue) * drawHeight;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        if (i <= maxIndex) {
          ctx.quadraticCurveTo(x, y, x, y);
        }
      }
    }
    ctx.stroke();
    ctx.restore();

    // Draw data points
    ctx.shadowBlur = 0;
    series.points.forEach((point, index) => {
      if (index > maxIndex) return;
      const x = dateCount > 1 ? (drawWidth / totalSegments) * index : drawWidth / 2;
      const y = drawHeight - (point.close / maxValue) * drawHeight;
      const radius = (highlighted ? 5 : dimmed ? 3 : 4) * scale;

      ctx.save();
      ctx.globalAlpha = dimmed ? 0.4 : 1;

      // Outer glow
      if (!dimmed) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = lineColor;
      }

      // Point fill
      ctx.fillStyle = dimmed ? 'rgba(148, 163, 184, 0.6)' : lineColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // White inner dot
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  });

  // Draw axis labels
  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.font = '11px JetBrains Mono, ui-monospace, monospace';

  // Always draw 25, 50, 75, 100 tick marks for daily/rolling charts
  const defaultTicks = [25, 50, 75, 100];
  const ticksToUse = Array.isArray(yTicks) && yTicks.length ? yTicks : defaultTicks;

  ticksToUse.forEach(tick => {
    if (tick <= maxValue) {
      const y = drawHeight - (tick / maxValue) * drawHeight + 4;
      ctx.fillText(`${tick}`, 0, y);
    }
  });

  // Draw 0 at bottom
  ctx.fillText('0', 0, drawHeight + 16);

  let lastLabelRight = -Infinity;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  for (let i = 0; i < dateCount; i += 1) {
    const label = formatDateLabel(seriesList[0].points[i].date);
    if (!label) continue;
    const x = dateCount > 1 ? (drawWidth / totalSegments) * i : drawWidth / 2;
    const isEdge = i === 0 || i === dateCount - 1;
    const labelWidth = ctx.measureText(label).width;
    let labelX = x - labelWidth / 2;
    if (labelX < 0) labelX = 0;
    if (labelX + labelWidth > drawWidth) labelX = drawWidth - labelWidth;
    const left = labelX;
    const right = labelX + labelWidth;
    if (!isEdge && left <= lastLabelRight + 20) continue;
    ctx.fillText(label, labelX, drawHeight + 32);
    lastLabelRight = right;
  }

  // Highlight hovered point
  if (hoverState) {
    const { seriesIndex, pointIndex } = hoverState;
    const series = seriesList[seriesIndex];
    if (series) {
      const point = series.points[pointIndex];
      if (point && point.date !== 'Start') {
        const lineColor = palette[seriesIndex % palette.length];
        const x = dateCount > 1 ? (drawWidth / totalSegments) * pointIndex : drawWidth / 2;
        const y = drawHeight - (point.close / maxValue) * drawHeight;

        // Pulse ring
        ctx.save();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = lineColor;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Center dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
};

const resizeCanvas = canvas => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { rect, dpr };
};

const drawAll = progress => {
  charts.forEach(chart => {
    const ctx = chart.canvas.getContext('2d');
    const { rect, dpr } = resizeCanvas(chart.canvas);
    if (!rect.width || !rect.height) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const effectiveProgress = chart.hover || chart.hoverSeries !== null ? 1 : progress;
    drawCombinedChart(
      ctx,
      chart.series,
      effectiveProgress,
      chart.metric,
      chart.hover,
      chart.hoverSeries,
      rect.width,
      rect.height,
      chart.yTicks,
      chart.yMax
    );
  });
};

const animate = timestamp => {
  if (!animation.running) return;
  if (!animation.start) animation.start = timestamp;
  const elapsed = timestamp - animation.start;
  animation.progress = Math.min(1, elapsed / animation.duration);
  drawAll(animation.progress);

  if (animation.progress < 1) {
    requestAnimationFrame(animate);
  } else {
    animation.running = false;
    statusEl.textContent = 'Live now';
  }
};

const isCoarsePointer = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const inputHint = () => (isCoarsePointer() ? 'tap' : 'click');

const renderMetricButtons = metrics => {
  metricToggle.innerHTML = '';
  if (metrics.length <= 1) {
    metricToggle.style.display = 'none';
    return;
  }
  metricToggle.style.display = 'flex';
  metrics.forEach(metric => {
    const button = document.createElement('button');
    button.className = 'metric-btn';
    button.type = 'button';
    button.textContent = metric;
    if (metric === currentMetric) button.classList.add('active');
    button.addEventListener('click', () => {
      if (metric === currentMetric) return;
      currentMetric = metric;
      renderBoard(metric);
      renderMetricButtons(metrics);
    });
    metricToggle.appendChild(button);
  });
};

const renderTodayBars = (metricSeries, metric, selectedDay, dates) => {
  todayBars.innerHTML = '';
  if (!metricSeries.length) return;

  const targetDay = selectedDay || dates[dates.length - 1];
  const todayIso = getLocalIsoDate();

  const latestValues = metricSeries.map(series => {
    const byDate = new Map(series.points.map(point => [point.date, point.value]));
    // Find last day with any pushups logged
    const datesWithActivity = series.points.filter(p => p.value > 0).map(p => p.date).sort();
    const lastActiveDate = datesWithActivity.length > 0 ? datesWithActivity[datesWithActivity.length - 1] : null;
    let daysSinceActive = null;
    if (lastActiveDate) {
      const lastDate = new Date(`${lastActiveDate}T00:00:00`);
      const today = new Date(`${todayIso}T00:00:00`);
      daysSinceActive = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    }
    return {
      name: series.name,
      value: byDate.get(targetDay) ?? 0,
      isDeceased: daysSinceActive !== null && daysSinceActive >= 4
    };
  });

  latestValues.sort((a, b) => b.value - a.value);

  const maxValue = Math.max(goal, ...latestValues.map(item => item.value));
  const scaleMax = Math.max(maxValue, goal * 1.2);
  const winnerValue = Math.max(...latestValues.map(item => item.value));

  latestValues.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.className = 'today-bar';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = item.name;
    if (item.isDeceased) {
      const deceased = document.createElement('span');
      deceased.className = 'deceased-label';
      deceased.textContent = ' (assumed deceased)';
      name.appendChild(deceased);
    }

    const track = document.createElement('div');
    track.className = 'bar-track';

    const goalLine = document.createElement('div');
    goalLine.className = 'goal-line';
    const goalPercent = Math.min(100, (goal / scaleMax) * 100);
    goalLine.style.left = `${goalPercent}%`;
    const goalLabel = document.createElement('div');
    goalLabel.className = 'goal-label';
    goalLabel.textContent = '100';
    goalLabel.style.left = `${goalPercent}%`;

    const bar = document.createElement('div');
    bar.className = 'bar';
    const widthPercent = Math.min(100, Math.max(4, (item.value / scaleMax) * 100));
    bar.style.width = `${widthPercent}%`;
    bar.style.background = colorForValue(item.value);
    if (item.value > goal) {
      bar.classList.add('flame');
      const intensity = Math.min(3, Math.max(1, (item.value - goal) / 30));
      wrapper.style.setProperty('--shake', intensity.toFixed(2));
      bar.style.setProperty('--over', Math.min(1, (item.value - goal) / 50).toFixed(2));

      // Add fire gif at the tip of the bar
      const fireGif = document.createElement('img');
      fireGif.src = 'https://www.nchca.ca/wp-content/uploads/revslider/fire-png-gif-489.gif';
      fireGif.className = 'fire-gif';
      fireGif.alt = 'Fire';
      bar.appendChild(fireGif);

      // Add glow effect
      const glow = document.createElement('div');
      glow.className = 'flame-glow';
      bar.appendChild(glow);
    }

    const value = document.createElement('div');
    value.className = 'value';
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = item.value;
    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = metric === 'pushups' ? 'push-ups' : metric;
    value.appendChild(count);
    value.appendChild(unit);

    if (item.value > goal) {
      wrapper.classList.add('flame');
    }

    if (item.value === winnerValue) {
      const trophy = document.createElement('div');
      trophy.className = 'trophy';
      trophy.textContent = '🏆';
      name.appendChild(trophy);
    }

    if (metric === 'pushups') {
      const adjective = document.createElement('span');
      const statusClass = statusClassForValue(item.value);
      const modifier = statusClass.split(' ')[1] || 'neutral';
      adjective.className = `adjective ${modifier}`;
      adjective.textContent = statusLabelForValue(item.value);
      value.appendChild(adjective);
    }

    track.appendChild(goalLine);
    track.appendChild(goalLabel);
    track.appendChild(bar);

    wrapper.appendChild(name);
    wrapper.appendChild(track);
    wrapper.appendChild(value);
    todayBars.appendChild(wrapper);
  });
};

const renderSatisBars = metricSeries => {
  satisBars.innerHTML = '';
  if (!metricSeries.length) return;

  const earliestIso = canonicalDates[0];
  const todayIso = getLocalIsoDate();
  const maxMonth = monthStart(new Date(`${todayIso}T00:00:00Z`));
  const minMonth = addMonths(maxMonth, -5);
  const lastPossibleStart = addMonths(maxMonth, -1);
  const clampStart = start => {
    let next = start;
    if (minMonth && next < minMonth) next = minMonth;
    if (lastPossibleStart && next > lastPossibleStart) next = lastPossibleStart;
    return next;
  };
  const defaultStart = addMonths(maxMonth, -1);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const rows = [...metricSeries]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(series => {
      const good = series.points.filter(point => point.value >= goal).length;
      const bad = series.points.filter(point => point.value <= 0).length;
      const total = series.points.length;
      const ratio = total ? Math.round((good / total) * 100) : 0;
      const label = ratio >= 50 ? 'SATISFACTORY' : 'PATHETIC';
      return { name: series.name, good, bad, ratio, label, points: series.points };
    });

  // Build mini calendar data (last 20 days, no empty - only good/bad)
  const buildMiniCalendar = (points) => {
    const byDate = new Map(points.map(p => [p.date, p.value]));
    const last20 = canonicalDates.slice(-20);
    return last20.map(date => {
      const value = byDate.get(date) ?? 0;
      return { date, value, status: value >= goal ? 'good' : 'bad' };
    });
  };

  // Summary view with per-person expand
  const summarySection = document.createElement('div');
  summarySection.className = 'satis-summary';

  rows.forEach((row, index) => {
    const rowContainer = document.createElement('div');
    rowContainer.className = 'satis-row-container';

    const summaryRow = document.createElement('div');
    summaryRow.className = 'satis-summary-row';
    summaryRow.dataset.personIndex = index;

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = row.name;

    // Mini calendar dots (last 20 days)
    const miniCal = document.createElement('div');
    miniCal.className = 'mini-calendar';
    const miniData = buildMiniCalendar(row.points);
    miniData.forEach(day => {
      const cell = document.createElement('div');
      cell.className = `mini-cell ${day.status}`;
      miniCal.appendChild(cell);
    });

    const statusBadge = document.createElement('div');
    statusBadge.className = `status-badge ${row.ratio >= 50 ? 'good' : 'bad'}`;
    statusBadge.textContent = row.label;

    // Percent group with label underneath
    const percentGroup = document.createElement('div');
    percentGroup.className = 'percent-group';
    const percentEl = document.createElement('div');
    percentEl.className = `percent ${row.ratio >= 50 ? 'good' : 'bad'}`;
    percentEl.textContent = `${row.ratio}%`;
    const percentLabel = document.createElement('div');
    percentLabel.className = 'percent-label';
    percentLabel.textContent = 'Daily 100+ push-up success rate';
    percentGroup.appendChild(percentEl);
    percentGroup.appendChild(percentLabel);

    // Expand button with chevron SVG
    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'satis-expand-btn';
    expandBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    summaryRow.appendChild(nameEl);
    summaryRow.appendChild(miniCal);
    summaryRow.appendChild(statusBadge);
    summaryRow.appendChild(percentGroup);
    summaryRow.appendChild(expandBtn);

    // Click name to filter charts
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const personName = row.name;
      charts.forEach(chart => {
        const seriesIndex = chart.series.findIndex(s => s.name === personName);
        if (seriesIndex !== -1) {
          if (chart.selectedSeries.has(seriesIndex) && chart.selectedSeries.size === 1) {
            chart.selectedSeries.clear();
          } else {
            chart.selectedSeries.clear();
            chart.selectedSeries.add(seriesIndex);
          }
          chart.hoverSeries = chart.selectedSeries.size ? chart.selectedSeries : null;
          chart.legendItems.forEach((el, itemIndex) => {
            el.classList.toggle('active', chart.selectedSeries.has(itemIndex));
          });
        }
      });
      drawAll(animation.progress);
      const chartsSection = document.querySelector('.chart-tabs');
      if (chartsSection) {
        chartsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Per-person details section
    const personDetails = document.createElement('div');
    personDetails.className = 'satis-person-details';
    personDetails.dataset.person = row.name;

    // Expand button click
    expandBtn.addEventListener('click', () => {
      const isExpanded = personDetails.classList.contains('visible');
      // Close all other expanded sections
      document.querySelectorAll('.satis-person-details.visible').forEach(el => {
        el.classList.remove('visible');
      });
      document.querySelectorAll('.satis-expand-btn.expanded').forEach(el => {
        el.classList.remove('expanded');
      });
      if (!isExpanded) {
        expandBtn.classList.add('expanded');
        personDetails.classList.add('visible');
        // Build the calendar content if not already built
        if (!personDetails.dataset.built) {
          buildPersonCalendar(personDetails, row);
          personDetails.dataset.built = 'true';
        }
      }
    });

    rowContainer.appendChild(summaryRow);
    rowContainer.appendChild(personDetails);
    summarySection.appendChild(rowContainer);
  });

  satisBars.appendChild(summarySection);

  // Helper to build calendar for a person
  const buildPersonCalendar = (container, row) => {
    const byDate = new Map(row.points.map(point => [point.date, point.value]));
    const startMonth = clampStart(satisMonthState.get(row.name) || defaultStart);
    satisMonthState.set(row.name, startMonth);

    const calendarsWrap = document.createElement('div');
    calendarsWrap.className = 'satis-calendars';

    const hint = document.createElement('div');
    hint.className = 'satis-hint';
    hint.textContent = `${inputHint()} day for details`;

    const nav = document.createElement('div');
    nav.className = 'satis-nav';
    const navLabel = document.createElement('div');
    navLabel.className = 'satis-nav-label';
    const navMonths = [];
    if (startMonth) navMonths.push(monthLabel(startMonth));
    if (startMonth && maxMonth > startMonth) navMonths.push(monthLabel(addMonths(startMonth, 1)));
    navLabel.textContent = navMonths.join(' · ');
    const navButtons = document.createElement('div');
    navButtons.className = 'satis-nav-buttons';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'satis-nav-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = !!(minMonth && startMonth <= minMonth);
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'satis-nav-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = !!(lastPossibleStart && startMonth >= lastPossibleStart);

    const rebuildCalendar = () => {
      container.innerHTML = '';
      container.dataset.built = '';
      buildPersonCalendar(container, row);
    };

    prevBtn.addEventListener('click', () => {
      if (prevBtn.disabled) return;
      satisMonthState.set(row.name, clampStart(addMonths(startMonth, -1)));
      rebuildCalendar();
    });
    nextBtn.addEventListener('click', () => {
      if (nextBtn.disabled) return;
      satisMonthState.set(row.name, clampStart(addMonths(startMonth, 1)));
      rebuildCalendar();
    });
    navButtons.appendChild(prevBtn);
    navButtons.appendChild(nextBtn);
    nav.appendChild(navLabel);
    nav.appendChild(navButtons);
    calendarsWrap.appendChild(hint);
    calendarsWrap.appendChild(nav);

    const months = [];
    if (startMonth) months.push(startMonth);
    if (startMonth && maxMonth > startMonth) months.push(addMonths(startMonth, 1));

    months.forEach(monthDate => {
      const month = document.createElement('div');
      month.className = 'satis-month';
      const title = document.createElement('div');
      title.className = 'satis-month-title';
      title.textContent = monthLabel(monthDate);
      const weekdayRow = document.createElement('div');
      weekdayRow.className = 'satis-weekdays';
      weekdays.forEach(day => {
        const label = document.createElement('span');
        label.textContent = day;
        weekdayRow.appendChild(label);
      });
      const grid = document.createElement('div');
      grid.className = 'satis-grid';
      const firstDay = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
      const startOffset = firstDay.getUTCDay();
      const daysInMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
      for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'satis-cell empty';
        grid.appendChild(empty);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), day)).toISOString().slice(0, 10);
        const value = byDate.get(iso) ?? 0;
        const cell = document.createElement('div');
        cell.className = 'satis-cell';
        if ((earliestIso && iso < earliestIso) || iso > todayIso) {
          cell.classList.add('empty');
        } else {
          if (value >= goal) cell.classList.add('good');
          if (value < goal) cell.classList.add('bad');
          cell.dataset.count = value;
          cell.addEventListener('click', () => {
            document.querySelectorAll('.satis-cell.selected').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.calendar-popup').forEach(el => el.remove());
            cell.classList.add('selected');
            const label = statusLabelForValue(value).toLowerCase();
            const popup = document.createElement('div');
            popup.className = `calendar-popup ${value >= goal ? 'good' : 'bad'}`;
            popup.textContent = `${row.name} performed ${articleFor(label)} ${label} ${value} pushups`;
            calendarsWrap.appendChild(popup);
            const rect = cell.getBoundingClientRect();
            const parentRect = calendarsWrap.getBoundingClientRect();
            const desiredLeft = rect.left - parentRect.left;
            const desiredTop = rect.bottom - parentRect.top + 8;
            placePopup(popup, calendarsWrap, desiredLeft, desiredTop);
          });
        }
        cell.textContent = day;
        grid.appendChild(cell);
      }
      month.appendChild(title);
      month.appendChild(weekdayRow);
      month.appendChild(grid);
      calendarsWrap.appendChild(month);
    });

    container.appendChild(calendarsWrap);
  };

};

const renderVictories = (metricSeries, dates) => {
  victoryRows.innerHTML = '';
  if (!metricSeries.length || !dates.length) return;

  const wins = new Map(metricSeries.map(series => [series.name, 0]));

  dates.forEach(date => {
    let max = -Infinity;
    const daily = metricSeries.map(series => {
      const point = series.points.find(p => p.date === date);
      const value = point ? point.value : 0;
      if (value > max) max = value;
      return { name: series.name, value };
    });

    if (max <= 0) return;
    daily.forEach(item => {
      if (item.value === max) {
        wins.set(item.name, (wins.get(item.name) || 0) + 1);
      }
    });
  });

  const rows = Array.from(wins.entries()).sort((a, b) => b[1] - a[1]);
  rows.forEach(([name, count], index) => {
    const row = document.createElement('div');
    row.className = 'victory-row';
    const who = document.createElement('span');
    const emoji = count === 0 ? '💩' : index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔥';
    who.textContent = `${emoji} ${name}`;
    const total = document.createElement('span');
    total.textContent = count;
    row.appendChild(who);
    row.appendChild(total);
    victoryRows.appendChild(row);
  });
};

const renderAverages = metricSeries => {
  if (!averageRows) return;
  averageRows.innerHTML = '';
  if (!metricSeries.length) return;

  const sorted = [...metricSeries].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(series => {
    const last30 = series.points.slice(-30);
    const total = last30.reduce((sum, point) => sum + (Number(point.value) || 0), 0);
    const avg = last30.length ? Math.round(total / last30.length) : 0;

    const row = document.createElement('div');
    row.className = 'victory-row';
    const who = document.createElement('span');
    who.textContent = series.name;
    const value = document.createElement('span');
    value.textContent = `${avg} pushups`;
    row.appendChild(who);
    row.appendChild(value);
    averageRows.appendChild(row);
  });
};

const renderLatestUpdate = (metricSeries, dates) => {
  if (!latestUpdate) return;
  if (!metricSeries.length || !dates.length) {
    latestUpdate.textContent = 'No updates yet.';
    return;
  }

  const latestEntry = payloadCache?.latestEntry;
  if (latestEntry && latestEntry.value > 0) {
    const timestamp = formatPstTimestamp();
    const dateLabel = latestEntry.date || dates[dates.length - 1];
    latestUpdate.innerHTML = `<div class="latest-title"><span class="bang">❗</span>Most recent update (${dateLabel} · ${timestamp}):</div><div class="latest-detail"><strong>${latestEntry.name}</strong> just logged <strong>${latestEntry.value}</strong> pushups.</div>`;
    return;
  }

  const latestDate = dates[dates.length - 1];
  let topName = null;
  let topValue = -Infinity;

  metricSeries.forEach(series => {
    const point = series.points.find(p => p.date === latestDate);
    const value = point ? point.value : 0;
    if (value > topValue) {
      topValue = value;
      topName = series.name;
    }
  });

  const timestamp = formatPstTimestamp();
  if (topValue <= 0 || !topName) {
    latestUpdate.textContent = `Most recent update (${latestDate} · ${timestamp}): no pushups logged.`;
    return;
  }

  latestUpdate.innerHTML = `<div class="latest-title"><span class="bang">❗</span>Most recent update (${latestDate} · ${timestamp}):</div><div class="latest-detail"><strong>${topName}</strong> just logged <strong>${topValue}</strong> pushups.</div>`;
};
const setupDateFilter = dates => {
  isoIndexMap = new Map();

  const parsedDates = dates
    .map(date => {
      const parsed = parseDateString(date);
      return parsed ? { date, parsed } : null;
    })
    .filter(Boolean);

  if (!parsedDates.length) return;

  canonicalDates = buildCanonicalDates(dates);
  canonicalDates.forEach((iso, index) => {
    isoIndexMap.set(iso, index);
  });

  const firstParsed = parsedDates[0].parsed;
  const lastParsed = parsedDates[parsedDates.length - 1].parsed;
  baseMonth = new Date(Date.UTC(lastParsed.getUTCFullYear(), lastParsed.getUTCMonth(), 1));

  const todayIso = getLocalIsoDate();
  const lastIso = canonicalDates[canonicalDates.length - 1];
  const maxIso = todayIso > lastIso ? todayIso : lastIso;

  dayFilter.min = canonicalDates[0];
  dayFilter.max = maxIso;
  dayFilter.value = todayIso >= canonicalDates[0] && todayIso <= maxIso ? todayIso : lastIso;
  const initialIndex = isoIndexMap.get(dayFilter.value);
  currentDayIndex = initialIndex ?? null;
  currentDay = currentDayIndex === null ? dayFilter.value : canonicalDates[currentDayIndex];
};

const normalizeSeries = (metricSeries, dates) =>
  metricSeries.map(series => {
    const byDate = new Map(
      series.points
        .map(point => {
          const parsed = parseDateString(point.date);
          if (!parsed) return null;
          return [toISODate(parsed), point.value];
        })
        .filter(Boolean)
    );
    const points = dates.map(date => ({
      date,
      value: byDate.get(date) ?? 0
    }));
    return { name: series.name, points };
  });

const getSeriesForMetric = metric => {
  if (!payloadCache) return [];
  const metricSeries = payloadCache.seriesByMetric?.[metric] || payloadCache.series || [];
  const dates = canonicalDates.length ? canonicalDates : payloadCache.dates || [];
  return dates.length ? normalizeSeries(metricSeries, dates) : metricSeries;
};

const renderBoard = metric => {
  if (!payloadCache) return;
  board.innerHTML = '';
  const metricSeries = payloadCache.seriesByMetric?.[metric] || payloadCache.series || [];
  const dates = canonicalDates.length ? canonicalDates : payloadCache.dates || [];
  const normalizedSeries = dates.length ? normalizeSeries(metricSeries, dates) : metricSeries;
  const alphaSeries = [...normalizedSeries].sort((a, b) => a.name.localeCompare(b.name));
  dailyCache = { metric, series: normalizedSeries, dates };
  renderTodayBars(normalizedSeries, metric, currentDay || dates[dates.length - 1], dates);
  const cumulativeSeries = buildCumulativeSeries(alphaSeries);
  const dailySeries = buildDailySeries(alphaSeries);
  const rollingSeries = buildRollingSeries(alphaSeries);
  const maxDaily = Math.max(100, ...dailySeries.flatMap(series => series.points.map(point => point.daily)));
  const maxRolling = Math.max(100, ...rollingSeries.flatMap(series => series.points.map(point => point.daily)));
  const cumulativeChart = buildCombinedCard(cumulativeSeries, metric, {
    title: `YTD CUMULATIVE · ${metric}`,
    note: `Cumulative total · ${inputHint()} for details`,
    valueType: 'cumulative'
  });
  const dailyChart = buildCombinedCard(dailySeries, metric, {
    title: `DAILY VOLUME · ${metric}`,
    note: `Daily totals · ${inputHint()} for details`,
    yTicks: [25, 50, 75, 100],
    yMax: maxDaily,
    showTotals: false,
    valueType: 'daily'
  });
  const rollingChart = buildCombinedCard(rollingSeries, metric, {
    title: `TRENDS · ${metric}`,
    note: `Rolling 30-day average · ${inputHint()} for details`,
    yTicks: [25, 50, 75, 100],
    yMax: maxRolling,
    showTotals: false,
    valueType: 'rolling'
  });
  charts = [cumulativeChart, dailyChart, rollingChart];
  renderSatisBars(alphaSeries);
  renderVictories(normalizedSeries, dates);
  renderAverages(alphaSeries);
  renderLatestUpdate(normalizedSeries, dates);

  const tabs = document.createElement('section');
  tabs.className = 'chart-tabs';
  const chartsHeader = document.createElement('div');
  chartsHeader.className = 'charts-header';
  chartsHeader.innerHTML = '<h2>Performance Charts</h2><p>Cumulative, daily volume, and rolling 30-day trendlines.</p>';
  const tabBar = document.createElement('div');
  tabBar.className = 'chart-tabs-bar';
  const panels = document.createElement('div');
  panels.className = 'chart-tabs-panels';

  const tabDefs = [
    { id: 'ytd', label: 'YTD CUMULATIVE', chart: cumulativeChart },
    { id: 'daily', label: 'DAILY VOLUME', chart: dailyChart },
    { id: 'trends', label: 'TRENDS', chart: rollingChart }
  ];

  tabDefs.forEach((tab, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chart-tab ${index === 0 ? 'active' : ''}`;
    button.textContent = tab.label;
    button.dataset.tab = tab.id;
    button.addEventListener('click', () => {
      tabBar.querySelectorAll('.chart-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab.id);
      });
      panels.querySelectorAll('.chart-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.tab === tab.id);
      });
      setTimeout(() => drawAll(animation.progress), 0);
    });
    tabBar.appendChild(button);

    tab.chart.card.classList.add('chart-panel');
    tab.chart.card.dataset.tab = tab.id;
    if (index === 0) tab.chart.card.classList.add('active');
    panels.appendChild(tab.chart.card);
  });

  tabs.appendChild(chartsHeader);
  tabs.appendChild(tabBar);
  tabs.appendChild(panels);
  board.appendChild(tabs);

  const attachLegend = chart => {
    chart.legendItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        if (chart.selectedSeries.has(index)) {
          chart.selectedSeries.delete(index);
        } else {
          chart.selectedSeries.add(index);
        }
        chart.hoverSeries = chart.selectedSeries.size ? chart.selectedSeries : null;
        chart.legendItems.forEach((el, itemIndex) => {
          el.classList.toggle('active', chart.selectedSeries.has(itemIndex));
        });
        drawAll(animation.progress);
      });
    });
  };

  const attachHover = chart => {
    const handleHover = (event, forceShow) => {
      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const padding = chartPadding;
      const width = rect.width - padding.left - padding.right;
      const height = rect.height - padding.top - padding.bottom;
      if (x < padding.left || x > padding.left + width || y < padding.top || y > padding.top + height) {
        chart.hover = null;
        if (chart.tooltip.parentElement) chart.tooltip.remove();
        drawAll(animation.progress);
        return;
      }

      const dateCount = chart.series[0]?.points.length || 0;
      if (!dateCount) return;
      const totalSegments = Math.max(1, dateCount - 1);
      const maxValue = Math.max(
        chart.yMax || 0,
        ...chart.series.flatMap(series => series.points.map(point => point.close))
      );

      const hoverX = x - padding.left;
      const hoverY = y - padding.top;
      let closest = null;
      let closestDistance = Infinity;

    chart.series.forEach((series, seriesIndex) => {
      series.points.forEach((point, pointIndex) => {
          const px = dateCount > 1 ? (width / totalSegments) * pointIndex : width / 2;
        const py = height - (point.close / maxValue) * height;
          const dx = px - hoverX;
          const dy = py - hoverY;
          const distance = Math.hypot(dx, dy);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = { seriesIndex, pointIndex, px, py };
          }
        });
      });

      const threshold = forceShow ? 18 : 14;
      if (!closest || closestDistance > threshold) {
        chart.hover = null;
        if (forceShow) {
          chart.locked = null;
          if (activeLockedChart === chart) activeLockedChart = null;
          if (chart.tooltip.parentElement) chart.tooltip.remove();
          drawAll(animation.progress);
        }
        return;
      }

      if (forceShow) {
        chart.locked = { seriesIndex: closest.seriesIndex, pointIndex: closest.pointIndex };
        activeLockedChart = chart;
      }
      if (chart.locked && !forceShow) return;
      chart.hover = { seriesIndex: closest.seriesIndex, pointIndex: closest.pointIndex };
      const point = chart.series[closest.seriesIndex].points[closest.pointIndex];
      const value = chart.valueType === 'cumulative' ? point.close : point.daily;
      const adjective = statusLabelForValue(value).toLowerCase();
      chart.tooltip.textContent = `${chart.series[closest.seriesIndex].name} performed ${articleFor(adjective)} ${adjective} ${value} pushups`;
      chart.tooltip.className = `calendar-popup ${value >= goal ? 'good' : 'bad'}`;
      const container = chart.canvas.parentElement;
      if (container) {
        container.appendChild(chart.tooltip);
        const desiredLeft = padding.left + closest.px + 12;
        const desiredTop = padding.top + closest.py - 12;
        placePopup(chart.tooltip, container, desiredLeft, desiredTop);
      }
      drawAll(animation.progress);
    };

    const handleClick = event => handleHover(event, true);
    chart.canvas.addEventListener('mousemove', event => handleHover(event, false));
    chart.canvas.addEventListener('click', handleClick);
    chart.canvas.addEventListener('mouseleave', () => {
      if (!chart.locked) {
        chart.hover = null;
        if (chart.tooltip.parentElement) chart.tooltip.remove();
        drawAll(animation.progress);
      }
    });
  };

  charts.forEach(chart => {
    chart.locked = null;
    attachLegend(chart);
    attachHover(chart);
  });
  if (!documentClickBound) {
    document.addEventListener('click', event => {
      const chart = activeLockedChart;
      if (!chart) return;
      if (event.target === chart.canvas) return;
      if (chart.tooltip.contains(event.target)) return;
      chart.locked = null;
      chart.hover = null;
      activeLockedChart = null;
      if (chart.tooltip.parentElement) chart.tooltip.remove();
      drawAll(animation.progress);
    });
    documentClickBound = true;
  }
  animation.start = null;
  animation.progress = 0;
  animation.running = true;
  requestAnimationFrame(animate);
};

const populateLogNames = series => {
  if (!logName) return;
  logName.innerHTML = '';
  const sorted = [...series].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.name;
    option.textContent = entry.name;
    logName.appendChild(option);
  });
  const saved = document.cookie
    .split(';')
    .map(item => item.trim())
    .find(item => item.startsWith('pushup_name='));
  if (saved) {
    const value = decodeURIComponent(saved.split('=')[1] || '');
    if (value) logName.value = value;
  }
};

const refreshLogExisting = () => {
  if (!logName || !logDate || !logExisting || !logExistingText) return;
  const name = logName.value.trim();
  const date = logDate.value;
  if (!name || !date) {
    logExisting.setAttribute('aria-hidden', 'true');
    logExisting.classList.remove('visible');
    return;
  }
  const series = getSeriesForMetric('pushups');
  const existing = series.find(entry => entry.name === name)?.points.find(point => point.date === date)?.value ?? 0;
  if (existing > 0) {
    logExistingText.textContent = `${name} already has ${existing} pushups on ${date}. Choose how to log this entry.`;
    logExisting.setAttribute('aria-hidden', 'false');
    logExisting.classList.add('visible');
  } else {
    logExisting.setAttribute('aria-hidden', 'true');
    logExisting.classList.remove('visible');
  }
};

const openLogModal = () => {
  if (!logModal) return;
  logModal.classList.add('open');
  logModal.setAttribute('aria-hidden', 'false');
  if (logDate) logDate.value = getLocalIsoDate();
  if (logCount) logCount.value = '';
  if (logStatus) logStatus.textContent = '';
  if (logExisting) {
    logExisting.setAttribute('aria-hidden', 'true');
    logExisting.classList.remove('visible');
  }
  if (payloadCache && logName && logName.options.length === 0) {
    populateLogNames(getSeriesForMetric('pushups'));
  }
  refreshLogExisting();
};

const closeLogModal = () => {
  if (!logModal) return;
  logModal.classList.remove('open');
  logModal.setAttribute('aria-hidden', 'true');
};

if (logFab) logFab.addEventListener('click', openLogModal);
if (logClose) logClose.addEventListener('click', closeLogModal);
if (logModal) {
  logModal.addEventListener('click', event => {
    if (event.target === logModal) closeLogModal();
  });
}
if (logName) logName.addEventListener('change', refreshLogExisting);
if (logDate) logDate.addEventListener('change', refreshLogExisting);
if (logName) {
  logName.addEventListener('change', () => {
    const value = encodeURIComponent(logName.value || '');
    document.cookie = `pushup_name=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  });
}

if (logForm) {
  logForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!logName || !logDate || !logCount || !logStatus) return;

    const name = logName.value.trim();
    const date = logDate.value;
    const count = Number(logCount.value);
    if (!name || !date || !Number.isFinite(count)) {
      logStatus.textContent = 'Enter a name, date, and pushup count.';
      return;
    }

    const series = getSeriesForMetric('pushups');
    const existing = series.find(entry => entry.name === name)?.points.find(point => point.date === date)?.value ?? 0;
    let mode = 'add';
    if (existing > 0 && logExisting && logExistingText) {
      logExistingText.textContent = `${name} already has ${existing} pushups on ${date}. Choose how to log this entry.`;
      logExisting.setAttribute('aria-hidden', 'false');
      logExisting.classList.add('visible');
    } else if (logExisting) {
      logExisting.setAttribute('aria-hidden', 'true');
      logExisting.classList.remove('visible');
    }
    const selected = logForm.querySelector('input[name="log-mode"]:checked');
    mode = selected?.value || 'add';

    logStatus.textContent = 'Saving...';
    try {
      // 1/100 chance of pushup redistribution
      const allNames = series.map(entry => entry.name);
      const isRedistribution = Math.random() < 0.01 && allNames.length > 1;

      if (isRedistribution) {
        const perPerson = Math.floor(count / allNames.length);
        const remainder = count % allNames.length;

        // Log pushups for each person
        for (let i = 0; i < allNames.length; i++) {
          const personName = allNames[i];
          const personCount = perPerson + (i < remainder ? 1 : 0);
          if (personCount > 0) {
            const personExisting = series.find(entry => entry.name === personName)?.points.find(point => point.date === date)?.value ?? 0;
            const res = await fetch('/api/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: personName, date, pushups: personCount, mode: 'add', existingTotal: personExisting })
            });
            if (!res.ok) throw new Error('Failed');
          }
        }
        closeLogModal();
        showSuccessToast(`Uh oh, time to check your pushup privilege! Katie Wilson has redistributed this batch of ${count} pushups fairly to all competitors.`);
        await loadData();
        const updatedSeries = getSeriesForMetric('pushups');
        generateDailySummary(updatedSeries, date);
        return;
      } else {
        const res = await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, date, pushups: count, mode, existingTotal: existing })
        });
        if (!res.ok) throw new Error('Failed');
        closeLogModal();
        const message = getMotivationalMessage(name, count);
        showSuccessToast(message);
      }
      await loadData();
      // Generate a new daily summary after logging pushups
      const updatedSeries = getSeriesForMetric('pushups');
      generateDailySummary(updatedSeries, date);
    } catch (error) {
      logStatus.textContent = 'Failed to log pushups.';
    }
  });
}

const loadData = async () => {
  statusEl.textContent = 'Syncing...';
  if (latestUpdate) {
    latestUpdate.textContent = 'Contacting servers to fetch the latest pushup data...';
  }
  const res = await fetch('/api/data');
  if (!res.ok) {
    statusEl.textContent = 'Sync failed';
    return;
  }
  const payload = await res.json();
  payloadCache = payload;
  let metrics = payload.metrics?.length ? payload.metrics : ['pushups'];
  metrics = metrics.filter(metric => metric === 'pushups');
  if (!metrics.length) metrics = ['pushups'];
  if (!metrics.includes(currentMetric)) currentMetric = metrics[0];
  if (payload.dates?.length) {
    setupDateFilter(payload.dates);
  }
  renderMetricButtons(metrics);
  populateLogNames(getSeriesForMetric('pushups'));
  renderBoard(currentMetric);
};

dayFilter.addEventListener('change', event => {
  if (!isoIndexMap.size) return;
  const iso = event.target.value;
  const nextIndex = isoIndexMap.get(iso);
  currentDayIndex = nextIndex ?? null;
  currentDay = currentDayIndex === null ? iso : dailyCache.dates[currentDayIndex];
  if (dailyCache.series.length) {
    renderTodayBars(dailyCache.series, currentMetric, currentDay, dailyCache.dates);
  }
});


loadPersistedSummary();
loadData().catch(() => {
  statusEl.textContent = 'Sync failed';
});

updateDeadlineClock();
setInterval(updateDeadlineClock, 50);
initMascot();
