import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Draft, ScoreBreakdown, Trend } from '../lib/types'
import { fmt } from '../lib/metrics'

export function Sparkline({
  data,
  width = 120,
  height = 26,
  color = '#1c1b1a',
  fill = true,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  fill?: boolean
}) {
  const uid = useId().replace(/[:]/g, '')
  if (!data.length) return <svg className="spark" width={width} height={height} />
  // 3-point moving average: raw 2-hour buckets are mostly zero with one spike, which
  // reads as noise rather than a trend.
  const smooth = data.map((v, i) => {
    const a = data[i - 1] ?? v
    const b = data[i + 1] ?? v
    return (a + v * 2 + b) / 4
  })
  const max = Math.max(...smooth, 1)
  const step = smooth.length > 1 ? width / (smooth.length - 1) : width
  const pts = smooth.map((v, i) => [i * step, height - (v / max) * (height - 3) - 1.5] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#g${uid})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={1.8} fill={color} />
    </svg>
  )
}

export function StageBadge({ stage, thin }: { stage: Trend['stage']; thin?: boolean }) {
  const label: Record<Trend['stage'], string> = {
    emerging: '早期信号',
    rising: '上升',
    peaking: '平台期',
    saturated: '已饱和',
    declining: '退潮',
  }
  if (thin) return <span className="badge saturated">样本不足</span>
  return <span className={`badge ${stage}`}>{label[stage]}</span>
}

export function FactorBars({ b }: { b: ScoreBreakdown }) {
  const rows: { k: string; label: string; w: string; c: string }[] = [
    { k: 'velocity', label: 'Trend Velocity', w: '30%', c: 'f-velocity' },
    { k: 'momentum', label: 'Engagement', w: '20%', c: 'f-momentum' },
    { k: 'relevance', label: 'TelyClaw 相关性', w: '20%', c: 'f-relevance' },
    { k: 'freshness', label: 'Freshness', w: '15%', c: 'f-freshness' },
    { k: 'contentOpportunity', label: 'Content Opp.', w: '15%', c: 'f-content' },
  ]
  return (
    <div>
      {rows.map((r) => {
        const v = (b as unknown as Record<string, number>)[r.k]
        return (
          <div className="factor" key={r.k}>
            <span className="factor-name">
              {r.label} <span className="tiny muted">{r.w}</span>
            </span>
            <span className="factor-track">
              <span
                className={`factor-fill ${r.c}`}
                style={{ width: `${Math.round(v * 100)}%`, animationDelay: `${rows.indexOf(r) * 40}ms` }}
              />
            </span>
            <span className="factor-val">{v.toFixed(2)}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Counts up on mount and eases between values — used for the numbers that carry the screen. */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 700,
  format,
}: {
  value: number
  decimals?: number
  duration?: number
  format?: (n: number) => string
}) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      from.current = value
      setDisplay(value)
      return
    }
    const start = performance.now()
    const a = from.current
    const b = value
    if (a === b) return
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = a + (b - a) * eased
      setDisplay(v)
      from.current = v
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const text = format ? format(display) : display.toFixed(decimals)
  return <span className="num">{text}</span>
}

/** One number with its label and a one-line caveat. Lives inside a .band strip. */
export function Stat({
  label,
  value,
  foot,
  size,
  tone,
}: {
  label: string
  value: ReactNode
  foot?: ReactNode
  size?: 'sm' | 'hero'
  tone?: 'accent'
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <span className={`stat-value ${size ?? ''} ${tone ?? ''}`}>{value}</span>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}

const STEPS: { key: Draft['status']; label: string }[] = [
  { key: 'draft', label: 'AI 草稿' },
  { key: 'review', label: '人工改写' },
  { key: 'approved', label: '通过' },
  { key: 'published', label: '已发布' },
]

export function StatusRail({ status, edited }: { status: Draft['status']; edited: boolean }) {
  const idx = STEPS.findIndex((s) => s.key === status)
  const finished = status === 'published'
  return (
    <div className="status-rail">
      {STEPS.map((s, i) => {
        const cls = finished || i < idx ? 'done' : i === idx ? 'now' : ''
        const label = s.key === 'review' && edited ? '人工改写 ✓' : s.label
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`status-step ${cls}`}>
              <span className="dot2" />
              {label}
            </div>
            {i < STEPS.length - 1 && <span className="status-conn" />}
          </div>
        )
      })}
    </div>
  )
}

export function Delta({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const up = value >= 0
  return (
    <span className={`mono ${up ? 'accent' : 'muted'}`} style={{ fontSize: '12px' }}>
      {up ? '↑' : '↓'} {Math.abs(Math.round(value))}
      {suffix}
    </span>
  )
}

export function EngNum({ v }: { v: number }) {
  return <span className="num">{fmt(v)}</span>
}

export function PanelHead({
  children,
  sub,
  right,
}: {
  children: ReactNode
  sub?: string
  right?: ReactNode
}) {
  return (
    <div className="panel-head">
      <h2>{children}</h2>
      {sub && <span className="sub">{sub}</span>}
      <span className="spacer" style={{ flex: 1 }} />
      {right}
    </div>
  )
}
