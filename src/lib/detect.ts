import type { Post, ScoreBreakdown, TopicSeed, TopicPerformance, Trend, TrendWindowStats } from './types'
import { ACCOUNTS, TOPICS, TOPIC_BY_ID, CORPUS_START } from '../data/seed'
import { postEngagement } from '../data/corpus'

const HOUR = 3600 * 1000

export interface ClusterResult {
  topicId: string | null
  purity: number
  matched: string[]
}

/**
 * Phrase-level keyword match with a light 4-character stemmer, so "automation"
 * also catches "automated" and "growth" catches "grows". Longer phrases weigh more,
 * so "context window" beats "context". No external NLP dependency by design.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function stem(w: string): string {
  return w.length >= 5 ? w.slice(0, 4) : w
}

function phraseHit(tokens: string[], kwTokens: string[]): boolean {
  for (let i = 0; i + kwTokens.length <= tokens.length; i++) {
    let ok = true
    for (let j = 0; j < kwTokens.length; j++) {
      if (stem(tokens[i + j]) !== stem(kwTokens[j])) {
        ok = false
        break
      }
    }
    if (ok) return true
  }
  return false
}

export const kwTokenCache = new Map<string, string[]>()

function keywordTokens(topic: TopicSeed): string[][] {
  const cached = kwTokenCache.get(topic.id)
  if (cached) return topic.keywords.map((k, i) => (cached[i] ? cached[i].split('\u0000') : []))
  const parsed = topic.keywords.map((k) => tokenize(k))
  kwTokenCache.set(topic.id, parsed.map((t) => t.join('\u0000')))
  return parsed
}

export function scoreTopic(text: string, topic: TopicSeed): { score: number; matched: string[] } {
  const tokens = tokenize(text)
  const kwTokens = keywordTokens(topic)
  let score = 0
  const matched: string[] = []
  for (let i = 0; i < topic.keywords.length; i++) {
    const kw = topic.keywords[i]
    const kt = kwTokens[i]
    if (kt.length && phraseHit(tokens, kt)) {
      score += kt.length
      matched.push(kw)
    }
  }
  return { score, matched }
}

/**
 * Keyword-anchored clustering. Deliberately not an embedding model:
 * for 9 known topics and a 7-day window this is deterministic, instant, and auditable.
 * Production swaps this for embeddings + HDBSCAN (see README).
 */
export function clusterPosts(posts: Post[]): {
  assignments: Map<string, ClusterResult>
  accuracy: { correct: number; total: number; unassigned: number }
} {
  const assignments = new Map<string, ClusterResult>()
  let correct = 0
  let total = 0
  let unassigned = 0

  for (const post of posts) {
    const scored = TOPICS.map((t) => ({ topic: t, ...scoreTopic(post.text, t) }))
    const totalScore = scored.reduce((s, x) => s + x.score, 0)
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a))

    if (best.score < 1) {
      assignments.set(post.id, { topicId: null, purity: 0, matched: [] })
      unassigned++
      continue
    }

    const purity = totalScore > 0 ? best.score / totalScore : 0
    assignments.set(post.id, { topicId: best.topic.id, purity, matched: best.matched })
    total++
    if (best.topic.id === post.seedTopicId) correct++
  }

  return { assignments, accuracy: { correct, total, unassigned } }
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

const shingleCache = new Map<string, Set<string>>()

function shingles(text: string, id?: string): Set<string> {
  if (id) {
    const hit = shingleCache.get(id)
    if (hit) return hit
  }
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + 3 < words.length; i++) out.add(words.slice(i, i + 4).join(' '))
  if (id) shingleCache.set(id, out)
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/**
 * Cross-account echo: share of posts that near-duplicate an earlier post from a
 * *different* account. High echo = the topic is being repeated, not advanced.
 */
function crossEcho(posts: Post[]): number {
  if (posts.length < 2) return 0
  const sets = posts.map((p) => shingles(p.text, p.id))
  let echo = 0
  for (let i = 0; i < posts.length; i++) {
    for (let j = 0; j < i; j++) {
      if (posts[i].accountId === posts[j].accountId) continue
      if (jaccard(sets[i], sets[j]) > 0.5) {
        echo++
        break
      }
    }
  }
  return echo / posts.length
}

function bucketsFor(posts: Post[], assignments: Map<string, ClusterResult>, now: number, hours: number) {
  const buckets: Record<string, number[]> = {}
  for (const t of TOPICS) buckets[t.id] = new Array(hours).fill(0)
  for (const p of posts) {
    const a = assignments.get(p.id)
    if (!a?.topicId) continue
    const idx = Math.floor((p.createdAt - (now - hours * HOUR)) / HOUR)
    if (idx < 0 || idx >= hours) continue
    buckets[a.topicId][idx] += postEngagement(p, now)
  }
  return buckets
}

function sumRange(arr: number[], from: number, to: number) {
  let s = 0
  for (let i = Math.max(0, from); i < Math.min(arr.length, to); i++) s += arr[i]
  return s
}

export interface TrendBuildInput {
  posts: Post[]
  assignments: Map<string, ClusterResult>
  now: number
  windowHours: number
  performance: Record<string, TopicPerformance>
}

export function buildTrends(input: TrendBuildInput): Trend[] {
  const { posts, assignments, now, windowHours, performance } = input
  const winMs = windowHours * HOUR
  const winStart = now - winMs
  const prevStart = now - 2 * winMs

  const hourly = bucketsFor(posts, assignments, now, 7 * 24)

  const raw = TOPICS.map((topic) => {
    const inWin = posts.filter(
      (p) => assignments.get(p.id)?.topicId === topic.id && p.createdAt >= winStart && p.createdAt <= now,
    )
    const inPrev = posts.filter(
      (p) => assignments.get(p.id)?.topicId === topic.id && p.createdAt >= prevStart && p.createdAt < winStart,
    )

    const engagement = inWin.reduce((s, p) => s + postEngagement(p, now), 0)
    const prevEngagement = inPrev.reduce((s, p) => s + postEngagement(p, now), 0)
    const accountSet = new Set(inWin.map((p) => p.accountId))

    const meanAgeHours = inWin.length
      ? inWin.reduce((s, p) => s + (now - p.createdAt) / HOUR, 0) / inWin.length
      : windowHours

    const kwSet = new Set<string>()
    for (const p of inWin) for (const k of assignments.get(p.id)?.matched ?? []) kwSet.add(k)
    const keywordCoverage = kwSet.size / topic.keywords.length

    const echo = crossEcho(inWin)

    const purities = inWin.map((p) => assignments.get(p.id)?.purity ?? 0)
    const purity = purities.length ? purities.reduce((a, b) => a + b, 0) / purities.length : 0

    const firstSeenAt = posts
      .filter((p) => assignments.get(p.id)?.topicId === topic.id)
      .reduce((min, p) => Math.min(min, p.createdAt), now)

    return { topic, inWin, engagement, prevEngagement, accountSet, meanAgeHours, keywordCoverage, echo, purity, firstSeenAt }
  })

  // Bayesian-ish prior: half the mean engagement rate across topics at this window.
  // Without it, "0 engagement last window -> 1 post now" reads as a 380x spike.
  const rates = raw.map((r) => r.engagement / windowHours).sort((a, b) => a - b)
  const meanRate = rates.reduce((s, x) => s + x, 0) / Math.max(1, rates.length)
  const prior = Math.max(1, meanRate * 0.5)

  // The previous window is only usable if it actually exists inside the corpus.
  const prevAvailable = prevStart >= CORPUS_START

  const maxRate = Math.max(...rates, 1)

  const trends: Trend[] = raw.map((r) => {
    const { topic } = r
    const rateNow = r.engagement / windowHours
    const ratePrev = r.prevEngagement / windowHours

    const velocityRatio = prevAvailable ? (rateNow + prior) / (ratePrev + prior) : 1
    const velocity = prevAvailable ? clamp01(0.5 + Math.log2(velocityRatio) / 2) : 0.5

    const momentum = clamp01(Math.log10(rateNow + 1) / Math.log10(maxRate + 1))
    const freshness = clamp01(Math.exp(-r.meanAgeHours / (windowHours * 0.8)))
    const relevance = topic.relevance

    // Echo above 45% starts eating the opportunity; below that it is normal topic chatter.
    const repetition = clamp01((r.echo - 0.45) / 0.55)
    const contentOpportunity = clamp01(0.55 * r.keywordCoverage + 0.45 * (1 - repetition))

    const stats: TrendWindowStats = {
      windowHours,
      posts: r.inWin.length,
      accounts: r.accountSet.size,
      engagement: r.engagement,
      prevEngagement: r.prevEngagement,
      velocityRatio,
      meanAgeHours: r.meanAgeHours,
      keywordCoverage: r.keywordCoverage,
      duplicateRatio: r.echo,
      purity: r.purity,
      prevAvailable,
    }

    const breakdown: ScoreBreakdown = { velocity, momentum, freshness, relevance, contentOpportunity }
    const baseScore =
      100 *
      (0.3 * velocity + 0.2 * momentum + 0.15 * freshness + 0.2 * relevance + 0.15 * contentOpportunity)

    const perf = performance[topic.id]
    const hitRate = perf && perf.posts > 0 ? perf.hits / perf.posts : 0.5
    const learnedFactor = 0.9 + 0.2 * hitRate

    const sampleConf = 1 - Math.exp(-stats.posts / 5)
    const confidence = clamp01(sampleConf * 0.65 + stats.purity * 0.35)

    // Three explicit multipliers on top of the weighted sum:
    //   relevanceGate  — a trend that cannot carry the product is discounted, not banned
    //   sampleShrink   — 1 post should not outrank 20 posts
    //   learnedFactor  — historical hit rate on this topic nudges future ranking
    const relevanceGate = 0.4 + 0.6 * relevance
    // A topic with zero posts in the window has no evidence at all — shrink to nothing
    // rather than letting relevance alone float it up the board.
    const sampleShrink = stats.posts === 0 ? 0.15 : 0.5 + 0.5 * sampleConf
    const score = Math.max(0, Math.min(100, baseScore * relevanceGate * sampleShrink * learnedFactor))

    let stage: Trend['stage'] = 'peaking'
    if (stats.posts < 3) stage = 'peaking'
    else if (prevAvailable && r.echo > 0.7 && velocityRatio < 1.25) stage = 'saturated'
    else if (velocityRatio > 1.45 && stats.posts < 16) stage = 'emerging'
    else if (velocityRatio > 1.15) stage = 'rising'
    else if (velocityRatio > 0.85) stage = 'peaking'
    else stage = 'declining'

    const pct = Math.round((velocityRatio - 1) * 100)
    const whyNow =
      `${stats.posts} 条帖子 / ${stats.accounts} 个账号在 ${windowHours}h 内提及，` +
      (prevAvailable ? `互动速率 ${pct >= 0 ? '+' : ''}${pct}% vs 上一窗口。` : '上一窗口无数据，速度按中性处理。') +
      (stage === 'saturated'
        ? ` 跨账号内容重合度 ${Math.round(r.echo * 100)}%，大家都在说同一句，硬跟会被淹没。`
        : stage === 'emerging'
          ? ' 量还小但加速度最高，现在占位成本最低。'
          : stage === 'declining'
            ? ' 互动速率在掉，只适合低成本评论，不适合做长内容。'
            : '')

    const spark: number[] = new Array(12).fill(0)
    const bucketMs = winMs / 12
    for (const p of r.inWin) {
      const idx = Math.min(11, Math.max(0, Math.floor((p.createdAt - winStart) / bucketMs)))
      spark[idx] += postEngagement(p, now)
    }

    const representative = [...r.inWin].sort((a, b) => postEngagement(b, now) - postEngagement(a, now)).slice(0, 3)

    return {
      topicId: topic.id,
      nameZh: topic.nameZh,
      nameEn: topic.nameEn,
      blurb: topic.blurb,
      keywords: topic.keywords,
      matchedKeywords: Array.from(
        new Set(r.inWin.flatMap((p) => assignments.get(p.id)?.matched ?? [])),
      ),
      relevance,
      relevanceWhy: topic.relevanceWhy,
      brandAsset: topic.brandAsset,
      stats,
      breakdown,
      baseScore,
      learnedFactor,
      relevanceGate,
      sampleShrink,
      score,
      confidence,
      momentumRank: 0,
      stage,
      whyNow,
      representative,
      angles: topic.angles,
      spark,
      firstSeenAt: r.firstSeenAt,
      detectedAt: null,
      leadTimeMin: null,
    }
  })

  trends.sort((a, b) => b.score - a.score)
  trends.forEach((t, i) => (t.momentumRank = i + 1))

  // Replay the ranking hour by hour: when did this trend first make Top-3?
  for (const t of trends) {
    const b = hourly[t.topicId]
    let detected: number | null = null
    for (let h = 72; h >= 1; h--) {
      const cp = now - h * HOUR
      if (cp - 2 * windowHours * HOUR < CORPUS_START) continue
      const cpStart = Math.floor((cp - (now - 7 * 24 * HOUR)) / HOUR)
      const engNow = sumRange(b, cpStart - windowHours, cpStart)
      const engPrev = sumRange(b, cpStart - 2 * windowHours, cpStart - windowHours)
      const ratio = (engNow / windowHours + prior) / (engPrev / windowHours + prior)
      if (ratio < 1.15) continue

      let hotter = 0
      for (const other of trends) {
        if (other.topicId === t.topicId) continue
        const ob = hourly[other.topicId]
        const oNow = sumRange(ob, cpStart - windowHours, cpStart)
        const oPrev = sumRange(ob, cpStart - 2 * windowHours, cpStart - windowHours)
        const oRatio = (oNow / windowHours + prior) / (oPrev / windowHours + prior)
        if (oRatio * (0.6 + other.relevance) > ratio * (0.6 + t.relevance)) hotter++
      }
      if (hotter < 3) {
        detected = cp
        break
      }
    }
    t.detectedAt = detected
  }

  // How early were we vs the market: compare detection time with the moment the topic
  // reached half of its 7-day peak hourly engagement. Positive = we were ahead.
  for (const t of trends) {
    const b = hourly[t.topicId]
    const peak = Math.max(...b)
    if (!t.detectedAt || peak <= 0) {
      t.leadTimeMin = null
      continue
    }
    const half = peak * 0.5
    let t50: number | null = null
    for (let i = 0; i < b.length; i++) {
      if (b[i] >= half) {
        t50 = now - (b.length - i) * HOUR
        break
      }
    }
    t.leadTimeMin = t50 ? Math.round((t50 - t.detectedAt) / 60000) : null
  }

  return trends
}

export function accountsInWatchlist() {
  return ACCOUNTS
}

export { TOPIC_BY_ID }
