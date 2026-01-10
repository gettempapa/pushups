import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const supabase = getSupabase();
  if (!supabase) {
    // Miles is optional - return disabled state if not configured
    res.json({ series: [], dates: [], enabled: false });
    return;
  }

  try {
    // Get all miles data
    const { data: miles, error: milesError } = await supabase
      .from('miles')
      .select('name, date, distance')
      .order('date', { ascending: true });

    if (milesError) throw milesError;

    // Process miles into series format
    const dateSet = new Set();
    const nameSet = new Set();
    const totals = new Map(); // name -> date -> total

    miles.forEach(row => {
      const date = row.date;
      const name = row.name;
      const distance = Number(row.distance) || 0;

      dateSet.add(date);
      nameSet.add(name);

      if (!totals.has(name)) totals.set(name, new Map());
      const perDate = totals.get(name);
      perDate.set(date, (perDate.get(date) || 0) + distance);
    });

    const dates = Array.from(dateSet).sort();
    const names = Array.from(nameSet).sort();

    const series = names.map(name => {
      const perDate = totals.get(name) || new Map();
      const points = dates.map(date => ({
        date,
        value: perDate.get(date) || 0
      }));
      return { name, points };
    });

    res.json({
      series,
      dates,
      goal: 10,
      enabled: true
    });
  } catch (error) {
    console.error('Failed to load miles data', error);
    res.status(500).json({ error: 'Failed to load miles data' });
  }
}
