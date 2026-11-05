import type { Trend } from '../lib/types'
import type { Engine } from '../lib/store'
import { fmt, fmtMin, leadLabel } from '../lib/metrics'
import { AnimatedNumber, Sparkline, StageBadge } from '../components/ui'

const WEIGHTS: { k: string; label: string; w: number; why: string }[] = [
  { k: 'velocity', label: 'Trend Velocity', w: 0.3, why: '加速度比绝对值重要：已经爆了三天的热点，进去只剩残羹。' },
  { k: 'momentum', label: 'Engagement Momentum', w: 0.2, why: '窗口内互动总量的对数归一化，代表"这件事现在有多大声"。' },
  { k: 'relevance', label: 'TelyClaw Relevance', w: 0.2, why: '话题能否自然带出产品与 ICP。不相关的高热度对我们等于噪音。' },
  { k: 'freshness', label: 'Freshness', w: 0.15, why: '窗口内平均帖龄衰减。越新的讨论越值得介入。' },
  { k: 'contentOpportunity', label: 'Content Opportunity', w: 0.15, why: '角度覆盖度减去内容重复度。重复度高说明没位置了。' },
]

function reason(t: Trend): string {
  if (t.stage === 'saturated')
    return `跨账号重复度 ${Math.round(t.stats.duplicateRatio * 100)}%，都在说同一句，跟进去没有增量。`
  if (t.stage === 'declining')
    return `互动速率 ${Math.round((t.stats.velocityRatio - 1) * 100)}%，话题在退潮，只值一条评论。`
  if (t.relevance < 0.5) return `相关性只有 ${t.relevance.toFixed(2)}，热度再高也带不出产品。`
  if (t.stats.posts < 3) return `窗口内只有 ${t.stats.posts} 条帖子，样本不足以下判断。`
  return `机会分 ${Math.round(t.score)}，速度与体量都不占优，排不进本周的出手名单。`
}

function decision(t: Trend): { label: string; cls: string } {
  if (t.stage === 'saturated' || t.stage === 'declining') return { label: '放弃', cls: 'saturated' }
  if (t.relevance < 0.5) return { label: '放弃', cls: 'saturated' }
  if (t.score >= 55 && (t.stage === 'rising' || t.stage === 'emerging')) return { label: '主攻', cls: 'rising' }
  if (t.score >= 45) return { label: '观察', cls: 'peaking' }
  return { label: '放弃', cls: 'declining' }
}

export function Opportunity({ engine, onGoStudio }: { engine: Engine; onGoStudio: (id: string) => void }) {
  const { trends } = engine
  const top = trends.slice(0, 3)
  const watchOnly = trends.filter((t) => decision(t).label === '观察')

  return (
    <div className="page">
      <div className="head">
        <div className="head-titles">
          <div className="eyebrow">03 · 排序</div>
          <h1>机会排序</h1>
        </div>
        <p className="lede">
          机会分不是热度榜。它回答的是：以 TelyClaw 的身份，现在介入哪个话题的期望回报最高。
        </p>
        <span className="spacer" />
      </div>

      <div className="grid g3" style={{ marginBottom: 14 }}>
        {top.map((t, i) => {
          const d = decision(t)
          return (
            <div className={`panel ${i === 0 ? 'hero-card' : ''}`} key={t.topicId}>
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="tiny mono muted">#{i + 1}</span>
                <StageBadge stage={t.stage} thin={t.stats.posts < 3} />
                <span className="grow" />
                <span className={`badge ${d.cls}`}>{d.label}</span>
              </div>
              <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
                <span className="score-big">
                  <AnimatedNumber value={t.score} />
                </span>
                <span className="score-denom">/100</span>
                <span className="grow" />
                <Sparkline data={t.spark} width={90} height={26} color="#a6532b" />
              </div>
              <div className="serif" style={{ fontSize: 15, margin: '6px 0 2px' }}>
                {t.nameZh}
              </div>
              <p className="small muted" style={{ margin: '0 0 10px' }}>
                {t.blurb}
              </p>
              <div className="mini-stats" style={{ marginBottom: 12 }}>
                <Metric v={`${t.stats.velocityRatio >= 1 ? '+' : ''}${Math.round((t.stats.velocityRatio - 1) * 100)}%`} k="速率" />
                <Metric v={fmt(t.stats.engagement)} k="互动" />
                <Metric v={String(t.stats.accounts)} k="账号" />
                <Metric v={leadLabel(t.leadTimeMin)} k="市场位置" />
              </div>
              <button className="btn btn-primary btn-block btn-sm" onClick={() => onGoStudio(t.topicId)}>
                生成内容 →
              </button>
            </div>
          )
        })}
      </div>

      <div className="grid g-side">
        <div className="panel flush">
          <div className="panel-head">
            <h2>完整排序</h2>
            <span className="sub">含不建议介入的话题</span>
          </div>
          <table className="tbl" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>话题</th>
                <th className="right">Score</th>
                <th>构成（V/M/R/F/C）</th>
                <th className="right">历史命中</th>
                <th>结论</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t, i) => {
                const d = decision(t)
                const perf = engine.state.performance[t.topicId]
                return (
                  <tr key={t.topicId}>
                    <td className="num muted">{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ minWidth: 150 }}>
                      <div style={{ fontWeight: 500 }}>{t.nameZh}</div>
                      <div className="tiny muted">
                        <StageBadge stage={t.stage} thin={t.stats.posts < 3} />
                      </div>
                    </td>
                    <td className="right num" style={{ fontSize: 14 }}>
                      {t.score.toFixed(1)}
                    </td>
                    <td style={{ width: 190 }}>
                      <StackedBar t={t} />
                    </td>
                    <td className="right num small nowrap">
                      {perf ? `${Math.round((perf.hits / perf.posts) * 100)}% (${perf.posts})` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${d.cls}`}>{d.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--line-2)' }} className="tiny muted">
            历史命中 = 该话题下已发布内容的达标比例；它会在 0.9×–1.1× 之间修正下一次排序，这是闭环的入口。
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="panel">
            <div className="panel-head">
              <h2>权重与理由</h2>
              <span className="spacer" />
              <span className="tiny muted mono">Σ = 1.00</span>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {WEIGHTS.map((w) => (
                <div key={w.k}>
                  <div className="row">
                    <span className="small" style={{ fontWeight: 500 }}>
                      {w.label}
                    </span>
                    <span className="grow" />
                    <span className="tiny mono muted">{w.w.toFixed(2)}</span>
                  </div>
                  <div className="tiny muted">{w.why}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>我们主动放弃的</h2>
            </div>
            <div className="col" style={{ gap: 9 }}>
              {trends
                .filter((t) => decision(t).label === '放弃')
                .slice(0, 3)
                .map((t) => (
                  <div key={t.topicId}>
                    <div className="row">
                      <span className="small" style={{ fontWeight: 500 }}>
                        {t.nameZh}
                      </span>
                      <span className="grow" />
                      <span className="tiny mono muted">{Math.round(t.score)}</span>
                    </div>
                    <div className="tiny muted">{reason(t)}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>观察名单</h2>
              <span className="sub">还没到出手时机</span>
            </div>
            <div className="col" style={{ gap: 6 }}>
              {watchOnly.length === 0 && <span className="tiny faint">这一窗口没有值得继续观察的话题。</span>}
              {watchOnly.map((t) => (
                <div className="row" key={t.topicId} style={{ justifyContent: 'space-between' }}>
                  <span className="small muted">{t.nameZh}</span>
                  <span className="tiny mono">{t.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StackedBar({ t }: { t: Trend }) {
  const parts = [
    { v: t.breakdown.velocity * 0.3, c: 'var(--c-velocity)' },
    { v: t.breakdown.momentum * 0.2, c: 'var(--c-momentum)' },
    { v: t.breakdown.relevance * 0.2, c: 'var(--c-relevance)' },
    { v: t.breakdown.freshness * 0.15, c: 'var(--c-freshness)' },
    { v: t.breakdown.contentOpportunity * 0.15, c: 'var(--c-content)' },
  ]
  const total = parts.reduce((s, p) => s + p.v, 0)
  return (
    <div style={{ display: 'flex', gap: 1, height: 8, width: '100%', background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }}>
      {parts.map((p, i) => (
        <div
          key={i}
          className="stack-seg"
          style={{
            width: `${(p.v / total) * 100}%`,
            background: p.c,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  )
}

function Metric({ v, k }: { v: string; k: string }) {
  return (
    <div className="mini-stat">
      <span className="v">{v}</span>
      <span className="k">{k}</span>
    </div>
  )
}
