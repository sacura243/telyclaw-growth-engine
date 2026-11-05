import type { Draft, Trend } from './types'
import { BASELINE_QUALIFIED } from './config'

export interface Metrics {
  publishedCount: number
  generatedCount: number
  approvedCount: number
  qualifiedTotal: number
  /** North Star */
  qualifiedPerPost: number
  hitRate: number
  acceptanceRate: number
  medianTimeToContentMin: number | null
  engagementLift: number
  medianLeadTimeMin: number | null
  totalImpressions: number
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function computeMetrics(drafts: Draft[], trends: Trend[]): Metrics {
  const published = drafts.filter((d) => d.status === 'published' && d.outcome)
  const approved = drafts.filter((d) => d.status === 'approved' || d.status === 'published')
  const generated = drafts.length

  const qualifiedTotal = published.reduce((s, d) => s + (d.outcome?.qualifiedEngagement ?? 0), 0)
  const impressions = published.reduce((s, d) => s + (d.outcome?.impressions ?? 0), 0)
  const hits = published.filter((d) => d.outcome?.hit).length

  // A draft approved in the same virtual minute is a click, not a review — drop it
  // rather than letting it drag the median to zero.
  const times = approved
    .filter((d) => d.approvedAt && d.approvedAt - d.createdAt > 60_000)
    .map((d) => (d.approvedAt! - d.createdAt) / 60000)

  const leads = trends
    .slice(0, 3)
    .map((t) => t.leadTimeMin)
    .filter((x): x is number => x !== null)

  const lift = published.length
    ? published.reduce((s, d) => s + (d.outcome?.qualifiedEngagement ?? 0), 0) /
      published.length /
      BASELINE_QUALIFIED
    : 0

  return {
    publishedCount: published.length,
    generatedCount: generated,
    approvedCount: approved.length,
    qualifiedTotal,
    qualifiedPerPost: published.length ? qualifiedTotal / published.length : 0,
    hitRate: published.length ? hits / published.length : 0,
    acceptanceRate: generated ? approved.length / generated : 0,
    medianTimeToContentMin: median(times),
    engagementLift: lift,
    medianLeadTimeMin: median(leads),
    totalImpressions: impressions,
  }
}

/** Qualified engagement per published post, oldest -> newest, for the learning-curve chart. */
export function qualifiedSeries(drafts: Draft[]): { label: string; value: number }[] {
  return drafts
    .filter((d) => d.status === 'published' && d.outcome)
    .sort((a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0))
    .map((d, i) => ({
      label: `#${i + 1} ${d.topicNameZh}`,
      value: d.outcome!.qualifiedEngagement,
    }))
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(Math.round(n))
}

/** "早 6.0h" / "滞后 3.0h" — a lead can be negative, the word "提前" cannot. */
export function leadLabel(min: number | null): string {
  if (min === null) return '—'
  return min >= 0 ? `早 ${fmtMin(min)}` : `滞后 ${fmtMin(Math.abs(min))}`
}

export function fmtMin(min: number | null): string {
  if (min === null) return '—'
  if (Math.abs(min) >= 60) return `${(min / 60).toFixed(1)}h`
  return `${Math.round(min)}m`
}
