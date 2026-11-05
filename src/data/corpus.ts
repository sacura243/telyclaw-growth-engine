import type { Account, Post } from '../lib/types'
import { ACCOUNTS, CORPUS_END, CORPUS_START, TOPICS } from './seed'

const DAY = 24 * 3600 * 1000
const HOUR = 3600 * 1000

/** Deterministic PRNG so the demo looks identical on every reload (and in the recorded video). */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FILLERS = [
  'watching 6 accounts converge on this in 4 hours.',
  'three separate threads said the same thing today.',
  'this keeps coming up in every call we have.',
  'our own numbers say the same thing.',
  'the replies are more useful than the post.',
  'six weeks ago nobody was talking about this.',
  'still true after two rewrites.',
  'the comments split 70/30 and the 30% are right.',
]

function fillTemplate(tpl: string, rand: () => number): string {
  if (!tpl.includes('{data}')) return tpl
  return tpl.replace('{data}', FILLERS[Math.floor(rand() * FILLERS.length)])
}

function pickWeighted<T>(items: T[], weight: (t: T) => number, rand: () => number): T {
  const total = items.reduce((s, it) => s + weight(it), 0)
  let r = rand() * total
  for (const it of items) {
    r -= weight(it)
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

function buildCorpus(): Post[] {
  const rand = mulberry32(20261104)
  const posts: Post[] = []
  let n = 0

  for (const topic of TOPICS) {
    const eligible: Account[] = ACCOUNTS.filter((a) => a.affinities.includes(topic.id))
    const pool = eligible.length ? eligible : ACCOUNTS
    const templates = topic.angles.flatMap((a) => a.templates.en)

    // 7 full days + 8 hours of "future" posts so the live clock has something to reveal.
    for (let day = 0; day <= 7; day++) {
      const mult = day < 7 ? topic.curve[day] : topic.curve[6] * 1.06
      const dayStart = CORPUS_START + day * DAY
      const span = day < 7 ? DAY : 8 * HOUR
      const count = Math.max(1, Math.round(topic.baseVolume * mult * (0.75 + rand() * 0.5)))

      for (let i = 0; i < count; i++) {
        const account = pickWeighted(pool, (a) => a.activity, rand)
        const tpl = templates[Math.floor(rand() * templates.length)]
        const createdAt = dayStart + rand() * span
        const followerBase = Math.pow(account.followers / 1000, 0.55) * 12
        const potential = followerBase * (0.6 + mult * 0.75) * (0.45 + rand() * 1.3)
        const likes = potential * (0.65 + rand() * 0.7)
        const reposts = likes * (0.08 + rand() * 0.16)
        const replies = likes * (0.03 + rand() * 0.1)
        const bookmarks = likes * (0.06 + rand() * 0.22)
        const quotes = reposts * (0.12 + rand() * 0.3)

        posts.push({
          id: `p${++n}`,
          accountId: account.id,
          seedTopicId: topic.id,
          createdAt,
          text: fillTemplate(tpl, rand),
          likes: Math.round(likes),
          reposts: Math.round(reposts),
          replies: Math.round(replies),
          bookmarks: Math.round(bookmarks),
          quotes: Math.round(quotes),
        })
      }
    }
  }

  return posts.sort((a, b) => a.createdAt - b.createdAt)
}

export const CORPUS: Post[] = buildCorpus()

/**
 * Engagement accumulates over time — a 10-minute-old post has not had the chance
 * to collect what a 3-day-old post has. Everything downstream (velocity, momentum)
 * reads engagement through this function so windows stay comparable.
 */
export function accumulateFactor(createdAt: number, now: number): number {
  const ageH = Math.max(0, (now - createdAt) / HOUR)
  // X engagement is heavily front-loaded: ~90% lands within the first 6 hours.
  return 1 - Math.exp(-ageH / 3)
}

export function postEngagement(post: Post, now: number): number {
  const f = accumulateFactor(post.createdAt, now)
  return (
    (post.likes + post.reposts * 2 + post.replies * 3 + post.bookmarks * 1.5 + post.quotes * 2) * f
  )
}

export function postRaw(post: Post, now: number) {
  const f = accumulateFactor(post.createdAt, now)
  return {
    likes: Math.round(post.likes * f),
    reposts: Math.round(post.reposts * f),
    replies: Math.round(post.replies * f),
    bookmarks: Math.round(post.bookmarks * f),
  }
}

/**
 * When a user adds an account to the watchlist, we backfill its recent history
 * instead of showing an empty row. Same generator, different seed.
 */
export function makeBackfill(account: Account, now: number): Post[] {
  const rand = mulberry32(account.handle.split('').reduce((s, c) => s + c.charCodeAt(0), 7))
  const out: Post[] = []
  const topics = TOPICS.filter((t) => account.affinities.includes(t.id))
  const pool = topics.length ? topics : TOPICS.slice(0, 2)

  for (const topic of pool) {
    const templates = topic.angles.flatMap((a) => a.templates.en)
    const n = 3 + Math.floor(rand() * 4)
    for (let i = 0; i < n; i++) {
      const daysAgo = rand() * 6.5
      const createdAt = now - daysAgo * DAY
      const followerBase = Math.pow(account.followers / 1000, 0.55) * 12
      const potential = followerBase * (0.5 + rand() * 0.9)
      const likes = potential * (0.6 + rand() * 0.7)
      out.push({
        id: `x-${account.id}-${now.toString(36)}-${topic.id}-${i}`,
        accountId: account.id,
        seedTopicId: topic.id,
        createdAt,
        text: fillTemplate(templates[Math.floor(rand() * templates.length)], rand),
        likes: Math.round(likes),
        reposts: Math.round(likes * (0.08 + rand() * 0.16)),
        replies: Math.round(likes * (0.03 + rand() * 0.1)),
        bookmarks: Math.round(likes * (0.06 + rand() * 0.22)),
        quotes: Math.round(likes * 0.03),
      })
    }
  }
  return out.sort((a, b) => a.createdAt - b.createdAt)
}

export function postsUntil(now: number, extra: Post[] = []): Post[] {
  return CORPUS.concat(extra).filter((p) => p.createdAt <= now)
}

export function accountById(id: string): Account {
  return ACCOUNTS.find((a) => a.id === id) ?? ACCOUNTS[0]
}

/** Baseline engagement per post for an account, used for "did this beat the baseline" checks. */
export function accountBaseline(accountId: string, now: number): number {
  const own = postsUntil(now).filter((p) => p.accountId === accountId)
  if (!own.length) return 1
  const vals = own.map((p) => postEngagement(p, now)).sort((a, b) => a - b)
  return vals[Math.floor(vals.length / 2)] || 1
}

export { CORPUS_END, CORPUS_START }
