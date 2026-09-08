import Anthropic from '@anthropic-ai/sdk';
import { Alt, generateAlternatives } from './alternatives-gen';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface Verdict {
  score: number;      // 0-100 overall quality
  issues: string[];   // short descriptions of problems found
  drop: string[];     // exact names of alternatives that should be removed
}

const PASS_SCORE = 80;

/** Run a web-search-grounded turn and return the joined text (handles pause_turn). */
async function groundedText(system: string, userContent: string, maxUses: number): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }];
  let final: Anthropic.Message | undefined;
  for (let i = 0; i < 6; i++) {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1536,
      system,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxUses } as any],
      messages,
    });
    if (resp.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: resp.content });
      continue;
    }
    final = resp;
    break;
  }
  return (final?.content ?? [])
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * Independently review a suggestion list against a rubric, using web search to
 * spot-check that each service is real, on-purpose, cheaper, and correctly
 * priced. Returns an overall score plus which entries to drop and why.
 */
export async function judgeAlternatives(
  service: string, category: string, currentCost: number | null, alts: Alt[],
): Promise<Verdict> {
  if (alts.length === 0) return { score: 0, issues: ['No alternatives were produced.'], drop: [] };

  const costNote = currentCost != null ? `The user currently pays about $${currentCost.toFixed(2)}/month for ${service}.` : '';
  const list = alts
    .map((a, i) => `${i + 1}. ${a.name} — ${a.monthly_price == null ? 'Free' : '$' + a.monthly_price + '/mo'} — ${a.website ?? '(no url)'} — ${a.description}`)
    .join('\n');

  const system = `You are a strict QA reviewer for a subscription app's "cheaper alternatives" feature. Use web search to verify each suggested alternative on five criteria: (1) it is a real, currently-available service; (2) it serves the SAME core purpose as the original; (3) it is genuinely cheaper than what the user pays (free counts); (4) the quoted price is within ~20% of its current official price; (5) the URL is its real homepage. Respond with ONLY JSON (no prose, no code fences): {"score": <0-100 overall quality of the list>, "issues": [<short problem descriptions>], "drop": [<exact names of alternatives that fail a criterion and should be removed>]}.`;
  const user = `Original service: ${service}${category ? ` (${category})` : ''}. ${costNote}\n\nSuggested alternatives:\n${list}\n\nReview them and return the JSON verdict.`;

  const text = await groundedText(system, user, 2);
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const v = JSON.parse(m[0]);
      return {
        score: typeof v.score === 'number' ? Math.max(0, Math.min(100, v.score)) : 0,
        issues: Array.isArray(v.issues) ? v.issues.map(String).slice(0, 10) : [],
        drop: Array.isArray(v.drop) ? v.drop.map(String).slice(0, 10) : [],
      };
    }
  } catch { /* fall through */ }
  return { score: 0, issues: ['Judge returned an unparseable verdict.'], drop: [] };
}

/**
 * Generate → judge → refine. Produces a list, has the judge critique it, drops
 * the entries it fails, and regenerates with that feedback until the list scores
 * well or we run out of rounds. Intended for the OFFLINE catalog builder — it
 * makes several grounded calls, so it's too slow/expensive for the live path
 * (which just reads the cache this fills).
 */
export async function generateJudgedAlternatives(
  name: string, category: string, currentCost: number | null, maxRounds = 2,
): Promise<{ alts: Alt[]; score: number; issues: string[]; rounds: number }> {
  let alts = await generateAlternatives(name, category);
  let verdict = await judgeAlternatives(name, category, currentCost, alts);
  let round = 0;

  while (verdict.score < PASS_SCORE && round < maxRounds) {
    // Remove the entries the judge rejected.
    if (verdict.drop.length) {
      const dropSet = new Set(verdict.drop.map((s) => s.toLowerCase()));
      alts = alts.filter((a) => !dropSet.has(a.name.toLowerCase()));
    }
    // Regenerate with the judge's feedback, then merge in any new, unseen entries.
    const fresh = await generateAlternatives(name, category, verdict.issues.join('; '));
    const seen = new Set(alts.map((a) => a.name.toLowerCase()));
    for (const f of fresh) {
      if (!seen.has(f.name.toLowerCase())) { alts.push(f); seen.add(f.name.toLowerCase()); }
    }
    verdict = await judgeAlternatives(name, category, currentCost, alts);
    round++;
  }

  return { alts, score: verdict.score, issues: verdict.issues, rounds: round };
}
