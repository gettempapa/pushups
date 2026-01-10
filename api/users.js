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
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

  if (req.method === 'GET') {
    // Get all users
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('name')
        .order('name', { ascending: true });

      if (error) throw error;
      res.json({ users: users.map(u => u.name) });
    } catch (error) {
      console.error('Failed to fetch users', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
    return;
  }

  if (req.method === 'POST') {
    // Add a new user
    const { name } = req.body || {};
    const safeName = String(name || '').trim();

    if (!safeName) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .upsert({ name: safeName }, { onConflict: 'name' });

      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to add user', error);
      res.status(500).json({ error: 'Failed to add user' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
