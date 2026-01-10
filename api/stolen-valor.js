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

  try {
    if (req.method === 'GET') {
      // Get all accused users
      const { data, error } = await supabase
        .from('stolen_valor')
        .select('name');

      if (error) throw error;

      const accused = data.map(row => row.name);
      res.json({ accused });

    } else if (req.method === 'POST') {
      const { name, accused } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      if (accused) {
        // Add accusation
        const { error } = await supabase
          .from('stolen_valor')
          .upsert({ name }, { onConflict: 'name' });

        if (error) throw error;
      } else {
        // Remove accusation
        const { error } = await supabase
          .from('stolen_valor')
          .delete()
          .eq('name', name);

        if (error) throw error;
      }

      res.json({ success: true });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Stolen valor error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
