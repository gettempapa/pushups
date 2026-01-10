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
    res.status(500).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
    return;
  }

  const { name, date, pushups, mode, existingTotal } = req.body || {};
  const safeName = String(name || '').trim();
  const safeDate = String(date || '').trim();
  const value = Number(pushups);

  if (!safeName || !safeDate || !Number.isFinite(value)) {
    res.status(400).json({ error: 'Missing name, date, or pushups' });
    return;
  }

  try {
    // Ensure user exists
    const { error: userError } = await supabase
      .from('users')
      .upsert({ name: safeName }, { onConflict: 'name' });

    if (userError) console.warn('User upsert warning:', userError);

    // Calculate amount to log
    let amount = value;
    if (mode === 'set' && Number.isFinite(existingTotal)) {
      amount = value - Number(existingTotal);
    }

    if (amount === 0) {
      res.json({ ok: true, message: 'No change' });
      return;
    }

    // Insert pushups record
    const { error: insertError } = await supabase
      .from('pushups')
      .insert({
        name: safeName,
        date: safeDate,
        count: amount
      });

    if (insertError) throw insertError;

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to log pushups', error);
    res.status(500).json({ error: 'Failed to log pushups' });
  }
}
