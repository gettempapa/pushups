import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

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
}
