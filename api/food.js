import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

  // GET: List all foods OR get food logs for a user/date
  if (req.method === 'GET') {
    const { name, date } = req.query || {};

    // If name and date provided, return food logs
    if (name && date) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      const safeName = String(name).trim();
      const safeDate = String(date).trim();

      try {
        const { data, error } = await supabase
          .from('food_logs')
          .select('id, food_name, points, created_at')
          .eq('name', safeName)
          .eq('date', safeDate)
          .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ logs: data || [] });
      } catch (error) {
        console.error('Failed to fetch food logs', error);
        res.status(500).json({ error: 'Failed to fetch food logs' });
      }
      return;
    }

    // Otherwise return all foods
    res.setHeader('Cache-Control', 'public, max-age=3600');
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, category, subcategory, tier, points')
        .order('tier', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      res.json({ foods: data || [] });
    } catch (error) {
      console.error('Failed to fetch foods', error);
      res.status(500).json({ error: 'Failed to fetch foods' });
    }
    return;
  }

  // POST: Log a food entry
  if (req.method === 'POST') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    const { name, food_id, food_name, points, date } = req.body || {};
    const safeName = String(name || '').trim();
    const safeFoodName = String(food_name || '').trim();
    const safeDate = String(date || '').trim();
    const safePoints = Number(points);

    if (!safeName || !safeFoodName || !safeDate || !Number.isFinite(safePoints)) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    try {
      // Ensure user exists
      const { error: userError } = await supabase
        .from('users')
        .upsert({ name: safeName }, { onConflict: 'name' });

      if (userError) console.warn('User upsert warning:', userError);

      // Insert food log record
      const { error: insertError } = await supabase
        .from('food_logs')
        .insert({
          name: safeName,
          food_id: food_id ? Number(food_id) : null,
          food_name: safeFoodName,
          points: safePoints,
          date: safeDate
        });

      if (insertError) throw insertError;

      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to log food', error);
      res.status(500).json({ error: 'Failed to log food' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
