import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

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
}
