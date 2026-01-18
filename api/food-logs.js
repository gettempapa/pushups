import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

  const { name, date } = req.query || {};
  const safeName = String(name || '').trim();
  const safeDate = String(date || '').trim();

  if (!safeName || !safeDate) {
    res.status(400).json({ error: 'Missing name or date' });
    return;
  }

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
}
