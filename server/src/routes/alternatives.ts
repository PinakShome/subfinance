import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../lib/auth';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const router = Router();

router.get('/:name', requireAuth, async (req, res) => {
  const { name } = req.params;
  const { cost, currency = 'USD', category } = req.query as {
    cost?: string; currency?: string; category?: string;
  };

  const costNote = cost ? ` currently costing ${currency} ${cost}/month` : '';
  const catNote = category ? ` in the ${category} category` : '';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a subscription advisor. When given a subscription service name, provide 3-4 real cheaper or free alternatives with their pricing. Be concise and accurate. Respond ONLY with a JSON array.`,
      messages: [
        {
          role: 'user',
          content: `Find cheaper alternatives to "${name}"${costNote}${catNote}. Return a JSON array of objects with these fields: name (string), description (string, 1 sentence), monthly_price (number or null if free), currency (string, default USD), website (string URL). Example: [{"name":"Plex","description":"Free self-hosted media server","monthly_price":0,"currency":"USD","website":"https://plex.tv"}]`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const alternatives = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.json({ alternatives });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
