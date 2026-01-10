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
    res.status(500).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
    return;
  }

  try {
    // Get all pushups data
    const { data: pushups, error: pushupsError } = await supabase
      .from('pushups')
      .select('name, date, count')
      .order('date', { ascending: true });

    if (pushupsError) throw pushupsError;

    // Get all users for the name dropdown
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('name')
      .order('name', { ascending: true });

    if (usersError) throw usersError;

    // Process pushups into series format
    const dateSet = new Set();
    const nameSet = new Set();
    const totals = new Map(); // name -> date -> total

    pushups.forEach(row => {
      const date = row.date;
      const name = row.name;
      const count = row.count || 0;

      dateSet.add(date);
      nameSet.add(name);

      if (!totals.has(name)) totals.set(name, new Map());
      const perDate = totals.get(name);
      perDate.set(date, (perDate.get(date) || 0) + count);
    });

    // Also add users from users table
    users.forEach(u => nameSet.add(u.name));

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

    // Find latest entry with value > 0
    let latestEntry = null;
    for (let i = pushups.length - 1; i >= 0; i--) {
      if (pushups[i].count > 0) {
        latestEntry = {
          date: pushups[i].date,
          name: pushups[i].name,
          value: pushups[i].count
        };
        break;
      }
    }

    res.json({
      series,
      seriesByMetric: { pushups: series },
      metrics: ['pushups'],
      dates,
      goal: 100,
      latestEntry
    });
  } catch (error) {
    console.error('Failed to load data', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
}
