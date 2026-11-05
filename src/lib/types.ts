/**
 * Domain types for the TelyClaw Growth Engine.
 *
 * The whole app is built around one loop:
 *   Monitor -> Detect -> Rank -> Ideate -> Draft -> Review -> Publish -> Measure -> (feed back into Rank)
 */

export type AccountCategory =
  | 'AI Lab'
  | 'Dev Tool'
  | 'Indie Builder'
  | 'Growth Operator'
  | 'Analyst / VC'
  | 'Media'

export interface Account {
  id: string
  handle: string
  name: string
  category: AccountCategory
  followers: number
  /** Part of TelyClaw's ICP -> engagement from this account counts as *qualified*. */
  qualified: boolean
  bio: string
  /** Topic ids this account tends to post about. Drives corpus generation. */
  affinities: string[]
  /** 0.5 - 1.4, how often this account posts. */
  activity: number
  addedAt: number
}

export interface Post {
  id: string
  accountId: string
  /** Ground-truth topic label used by the corpus generator. Detection does NOT read this. */
  seedTopicId: string
  createdAt: number
  text: string
  likes: number
  reposts: number
  replies: number
  bookmarks: number
  quotes: number
}

export type AngleKind = 'hot-take' | 'teardown' | 'product-angle'

/** Output length/format, straight from the brief: "Copy / Rewrite 或 Summary 等 Tweet 格式". */
export type TweetFormat = 'copy' | 'rewrite' | 'summary'

export interface AngleSpec {
  kind: AngleKind
  labelZh: string
  labelEn: string
  /** Why this angle is the right move for this trend. Shown in the Studio. */
  rationale: string
  templates: { en: string[]; zh: string[] }
}

export interface TopicSeed {
  id: string
  nameZh: string
  nameEn: string
  blurb: string
  /** Keywords used by the clustering step. Phrases, lowercase. */
  keywords: string[]
  /** How strongly this topic connects to TelyClaw's product and ICP (0-1). Hand-set, reviewed weekly. */
  relevance: number
  relevanceWhy: string
  /** Relative posting intensity per day, oldest -> newest. Shapes velocity. */
  curve: number[]
  /** Posts/day across the whole watchlist when curve multiplier = 1. */
  baseVolume: number
  angles: AngleSpec[]
  /** What a TelyClaw reply would add. Used as the "content opportunity" narrative. */
  brandAsset: string
}

export interface TrendWindowStats {
  windowHours: number
  posts: number
  accounts: number
  engagement: number
  prevEngagement: number
  velocityRatio: number
  meanAgeHours: number
  keywordCoverage: number
  duplicateRatio: number
  purity: number
  /** False when the previous window falls outside the corpus — velocity is then neutral, not zero. */
  prevAvailable: boolean
}

export interface ScoreBreakdown {
  velocity: number
  momentum: number
  freshness: number
  relevance: number
  contentOpportunity: number
}

export interface Trend {
  topicId: string
  nameZh: string
  nameEn: string
  blurb: string
  keywords: string[]
  matchedKeywords: string[]
  relevance: number
  relevanceWhy: string
  brandAsset: string
  stats: TrendWindowStats
  breakdown: ScoreBreakdown
  /** Weighted 0-100 before the learned adjustment. */
  baseScore: number
  /** Multiplier from historical publish performance on this topic (0.9 - 1.1). */
  learnedFactor: number
  /** 0.4 - 1.0 discount for topics that cannot carry the product. */
  relevanceGate: number
  /** 0.5 - 1.0 shrinkage when the sample is too thin to trust. */
  sampleShrink: number
  score: number
  confidence: number
  momentumRank: number
  /** 'emerging' = few posts but high acceleration. 'saturated' = lots of near-duplicate posts. */
  stage: 'emerging' | 'rising' | 'peaking' | 'saturated' | 'declining'
  whyNow: string
  representative: Post[]
  angles: AngleSpec[]
  /** 12-point engagement sparkline for the window, oldest -> newest bucket. */
  spark: number[]
  firstSeenAt: number
  detectedAt: number | null
  leadTimeMin: number | null
}

export interface Evidence {
  handle: string
  category: AccountCategory
  text: string
  engagement: number
}

export interface Draft {
  id: string
  topicId: string
  topicNameZh: string
  angle: AngleKind
  angleLabel: string
  format: TweetFormat
  lang: 'en' | 'zh'
  text: string
  original: string
  status: 'draft' | 'review' | 'approved' | 'published'
  score: number
  createdAt: number
  updatedAt: number
  approvedAt: number | null
  publishedAt: number | null
  edited: boolean
  editRatio: number
  duplicateOf: string | null
  similarity: number
  evidence: Evidence[]
  outcome: PublishOutcome | null
}

export interface PublishOutcome {
  impressions: number
  likes: number
  reposts: number
  replies: number
  qualifiedEngagement: number
  /** Beats the account's trailing median engagement for comparable posts. */
  hit: boolean
  measuredAt: number
}

export interface TopicPerformance {
  posts: number
  qualified: number
  hits: number
}

export interface AppState {
  accounts: Account[]
  drafts: Draft[]
  performance: Record<string, TopicPerformance>
  /** Virtual clock (ms). The corpus is synthetic, so "now" is a variable, not Date.now(). */
  clock: number
  live: boolean
  windowHours: number
}

export interface EventLogEntry {
  id: string
  at: number
  kind: 'detect' | 'generate' | 'edit' | 'approve' | 'publish' | 'measure' | 'guardrail'
  text: string
}
