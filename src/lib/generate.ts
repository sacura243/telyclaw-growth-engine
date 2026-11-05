import type { AngleKind, Draft, Evidence, Trend, TweetFormat } from './types'
import { accountById, postEngagement } from '../data/corpus'
import { BASELINE_QUALIFIED, TELYCLAW_FOLLOWERS } from './config'
import { ACCOUNTS } from '../data/seed'

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export function dataLine(trend: Trend, lang: 'en' | 'zh'): string {
  const pct = Math.round((trend.stats.velocityRatio - 1) * 100)
  const sign = pct >= 0 ? '+' : ''
  if (lang === 'zh') {
    return `（我们盯的账号里，${trend.stats.accounts} 个账号在 ${trend.stats.windowHours} 小时内提了 ${trend.stats.posts} 次，互动速率 ${sign}${pct}%。）`
  }
  return `(${trend.stats.accounts} accounts we track posted about it ${trend.stats.posts} times in ${trend.stats.windowHours}h. Engagement rate ${sign}${pct}% vs the previous window.)`
}

function hashtags(trend: Trend): string {
  const picks = trend.matchedKeywords.slice(0, 3).map((k) =>
    k
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(''),
  )
  return picks.map((p) => `#${p}`).join(' ')
}

export function evidenceFor(trend: Trend, now: number): Evidence[] {
  return trend.representative.map((p) => {
    const a = accountById(p.accountId)
    return {
      handle: a.handle,
      category: a.category,
      text: p.text,
      engagement: Math.round(postEngagement(p, now)),
    }
  })
}

function trimToSentence(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const at = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('\n'))
  return at > 40 ? cut.slice(0, at + 1).trim() : cut.slice(0, max - 1).trim() + '…'
}

function takeaways(trend: Trend, lang: 'en' | 'zh'): string[] {
  const pct = Math.round((trend.stats.velocityRatio - 1) * 100)
  const sign = pct >= 0 ? '+' : ''
  if (lang === 'zh') {
    return [
      `${trend.stats.posts} 条帖子 / ${trend.stats.accounts} 个账号，互动速率 ${sign}${pct}%。`,
      `关键词覆盖 ${Math.round(trend.stats.keywordCoverage * 100)}%，跨账号重复 ${Math.round(trend.stats.duplicateRatio * 100)}%。`,
      trend.stage === 'saturated'
        ? '结论：不追热点本身，只补一个别人没说的角度。'
        : '结论：现在进场的成本最低，值得占一个位置。',
    ]
  }
  return [
    `${trend.stats.posts} posts from ${trend.stats.accounts} accounts, engagement rate ${sign}${pct}%.`,
    `Keyword coverage ${Math.round(trend.stats.keywordCoverage * 100)}%, cross-account echo ${Math.round(trend.stats.duplicateRatio * 100)}%.`,
    trend.stage === 'saturated'
      ? 'So: do not chase the trend itself. Add the one angle nobody has taken.'
      : 'So: the entry cost is lowest right now. Worth a slot.',
  ]
}

/**
 * The angle decides the argument; the format decides the shape.
 *   copy    — one tweet, cut at a sentence boundary, hashtags only if it fits
 *   rewrite — quote the strongest post in the window, then our take
 *   summary — the full argument plus three numbered takeaways
 */
export function generateDraft(
  trend: Trend,
  angleKind: AngleKind,
  lang: 'en' | 'zh',
  variant = 0,
  format: TweetFormat = 'copy',
): { text: string; angleLabel: string } {
  const angle = trend.angles.find((a) => a.kind === angleKind) ?? trend.angles[0]
  const pool = angle.templates[lang]
  const idx = (hash(trend.topicId + angleKind) + variant) % pool.length
  const core = pool[idx].replace('{data}', dataLine(trend, lang))
  const tags = lang === 'en' ? hashtags(trend) : ''

  let text = core
  if (format === 'copy') {
    // One tweet: keep the hook, drop everything that does not survive 280 chars.
    const budget = 240 - tags.length
    text = trimToSentence(core.split('\n\n')[0], budget)
    if (tags) text = `${text}\n\n${tags}`
  } else if (format === 'rewrite') {
    const src = trend.representative[0]
    if (src) {
      const handle = accountById(src.accountId).handle
      // Nested double quotes look broken inside a quote — normalise to single quotes.
      const quote = trimToSentence(src.text.replace(/\n+/g, ' ').replace(/"/g, "'"), 120)
      // If the draft opens with the line we are quoting, start from the second paragraph —
      // otherwise the post reads as the same sentence twice.
      const paras = core.split('\n\n')
      const body = paras.length > 1 && similarity(paras[0], quote) > 0.4 ? paras.slice(1).join('\n\n') : core
      text = `> @${handle}: "${quote}"\n\n${body}`
    }
    if (tags) text = `${text}\n\n${tags}`
  } else {
    const list = takeaways(trend, lang)
    text =
      lang === 'zh'
        ? `${core}\n\n三点补充：\n1. ${list[0]}\n2. ${list[1]}\n3. ${list[2]}`
        : `${core}\n\nThree things worth adding:\n1. ${list[0]}\n2. ${list[1]}\n3. ${list[2]}`
    if (tags) text = `${text}\n\n${tags}`
  }

  return { text: text.trim(), angleLabel: lang === 'zh' ? angle.labelZh : angle.labelEn }
}

/** 4-word shingles, used both for duplicate detection and for the corpus saturation metric. */
function shingles(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + 3 < words.length; i++) out.add(words.slice(i, i + 4).join(' '))
  return out
}

export function similarity(a: string, b: string): number {
  const A = shingles(a)
  const B = shingles(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

/**
 * Guardrail: block a draft that repeats something already published on the same topic.
 * Threshold 0.45 is empirical — below that, drafts share template skeleton but not claims.
 */
export function findDuplicate(text: string, drafts: Draft[]): { draft: Draft; score: number } | null {
  let best: { draft: Draft; score: number } | null = null
  for (const d of drafts) {
    const s = similarity(text, d.text)
    if (!best || s > best.score) best = { draft: d, score: s }
  }
  return best && best.score >= 0.45 ? best : null
}

/** Approximate Levenshtein for the "how much did the human rewrite it" readout. */
export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m || !n) return Math.max(m, n)
  let prev = new Array(n + 1).fill(0).map((_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

export function editRatio(original: string, edited: string): number {
  if (!original.length) return 0
  return Math.min(1, editDistance(original, edited) / original.length)
}

/**
 * Simulated publish outcome.
 *
 * This is the one place in the demo that invents numbers, and it says so in the UI.
 * The shape of the model is the point: outcome scales with opportunity score,
 * decays with saturation, and gets a penalty when a human had to rewrite a lot
 * (heavy rewrites are a signal the angle did not fit the brand).
 */
export function simulateOutcome(
  trend: Trend,
  draft: Draft,
  accountFollowers: number,
  rand: () => number,
): {
  impressions: number
  likes: number
  reposts: number
  replies: number
  qualifiedEngagement: number
  hit: boolean
} {
  const quality = trend.score / 100
  const saturationPenalty = 1 - trend.stats.duplicateRatio * 0.35
  const rewritePenalty = 1 - Math.min(0.35, draft.editRatio * 0.5)
  const noise = 0.8 + rand() * 0.4

  const impressions = Math.round(
    Math.pow(accountFollowers, 0.42) * 26 * quality * saturationPenalty * noise,
  )
  const likes = Math.round(impressions * (0.012 + quality * 0.028) * noise)
  const reposts = Math.round(likes * (0.06 + rand() * 0.14))
  const replies = Math.round(likes * (0.04 + rand() * 0.1))

  // Qualified = engagement from ICP accounts, roughly 9-22% of total for this audience mix.
  const qualifiedEngagement = Math.round(
    (likes + reposts * 2 + replies * 3) * (0.09 + rand() * 0.13) * rewritePenalty,
  )

  return {
    impressions,
    likes,
    reposts,
    replies,
    qualifiedEngagement,
    // "Hit" = clears the baseline the challenge sets for a trend-generated post.
    hit: qualifiedEngagement >= BASELINE_QUALIFIED,
  }
}

export const TELYCLAW_ACCOUNT = { handle: 'telyclaw', followers: TELYCLAW_FOLLOWERS }

export function followersFor(handle: string): number {
  const a = ACCOUNTS.find((x) => x.handle === handle)
  return a?.followers ?? TELYCLAW_ACCOUNT.followers
}
