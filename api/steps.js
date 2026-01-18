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
    res.json({ series: [], dates: [], enabled: false });
    return;
  }

  try {
    const { data: steps, error: stepsError } = await supabase
      .from('steps')
      .select('name, date, count')
      .order('date', { ascending: true });

    if (stepsError) throw stepsError;

    const dateSet = new Set();
    const nameSet = new Set();
    const totals = new Map();

    steps.forEach(row => {
      const date = row.date;
      const name = row.name;
      const count = Number(row.count) || 0;

      dateSet.add(date);
      nameSet.add(name);

      if (!totals.has(name)) totals.set(name, new Map());
      const perDate = totals.get(name);
      perDate.set(date, (perDate.get(date) || 0) + count);
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
      goal: 15000,
      enabled: true
    });
  } catch (error) {
    console.error('Failed to load steps data', error);
    res.status(500).json({ error: 'Failed to load steps data' });
  }
}
