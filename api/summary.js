import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { standings, date } = req.body || {};
    if (!standings || !Array.isArray(standings)) {
      res.status(400).json({ error: 'Missing standings data' });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });
      return;
    }

    const anthropic = new Anthropic({ apiKey });

    const standingsText = standings
      .sort((a, b) => b.value - a.value)
      .map((s, i) => `${i + 1}. ${s.name}: ${s.value} pushups${s.isDeceased ? ' (inactive 4+ days)' : ''}`)
      .join('\n');

    const prompt = `You are David Goggins giving a daily pushup competition update. Be INTENSE. Be RUTHLESS. You are NOT impressed by these numbers - these are WEAK numbers from SOFT people making EXCUSES. Call out specific people by name and their pathetic counts. For anyone marked as inactive, absolutely DESTROY them - they've gone soft, they've quit on themselves, they're letting the enemy win. But ultimately, underneath the brutality, you're trying to forge mental toughness. End with a hard challenge or demand. Use short, punchy sentences. ALL CAPS for emphasis on key words. Channel pure Goggins energy - "Stay hard!", "Who's gonna carry the boats?", "They don't know me, son!"

Today's date: ${date}
Current standings:
${standingsText}

Write ONLY the summary text in David Goggins' voice. 2-4 sentences. Be absolutely ruthless but ultimately motivating. No pleasantries.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = message.content[0].text;
    res.json({ summary });
  } catch (error) {
    console.error('Summary generation failed', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
}
