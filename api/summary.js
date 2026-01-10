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

    const prompt = `ESPN bottom-ticker style pushup update. One line, like a golf leaderboard scroll. Names, numbers, quick sharp jab at slackers. Third person only.

${standingsText}

One sentence. Ticker style. Example: "Smith leads at 85, Jones close behind at 72 — Williams still missing in action."`;


    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = message.content[0].text;
    res.json({ summary });
  } catch (error) {
    console.error('Summary generation failed', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
}
