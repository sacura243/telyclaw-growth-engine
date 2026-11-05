import { accountById, postEngagement } from '../data/corpus'
import type { Engine } from '../lib/store'
import { fmt, fmtMin } from '../lib/metrics'
import { FactorBars, Sparkline, StageBadge } from '../components/ui'

export function Trends({
  engine,
  selectedId,
  onSelect,
  onGoStudio,
}: {
  engine: Engine
  selectedId: string | null
  onSelect: (id: string) => void
  onGoStudio: (id: string) => void
}) {
  const { trends, state, cluster } = engine
  const sel = trends.find((t) => t.topicId === selectedId) ?? trends[0]

  return (
    <div className="page">
      <div className="head">
        <div className="head-titles">
          <div className="eyebrow">02 · 检测</div>
          <h1>趋势检测</h1>
        </div>
        <p className="lede">
          把最近 {state.windowHours} 小时的帖子按话题聚类，给出摘要、命中的关键词、代表性帖子和置信度。
          这一页只回答「发生了什么」，排序在下一步。
        </p>
        <span className="spacer" />
      </div>

      <div className="grid g-side">
        <div className="grid g2" style={{ alignContent: 'start' }}>
          {trends.map((t, i) => (
            <div
              key={t.topicId}
              className={`trend ${sel?.topicId === t.topicId ? 'sel' : ''}`}
              onClick={() => onSelect(t.topicId)}
            >
              <div className="trend-top">
                <span className="trend-rank">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="trend-title grow">{t.nameZh}</h3>
                <StageBadge stage={t.stage} thin={t.stats.posts < 3} />
              </div>
              <p className="trend-blurb">{t.blurb}</p>
              <Sparkline data={t.spark} width={280} height={30} color={t.stage === 'declining' || t.stage === 'saturated' ? '#b3ada2' : '#a6532b'} />
              <div className="mini-stats">
                <div className="mini-stat">
                  <span className="v">{t.stats.posts}</span>
                  <span className="k">帖子</span>
                </div>
                <div className="mini-stat">
                  <span className="v">{t.stats.accounts}</span>
                  <span className="k">账号</span>
                </div>
                <div className="mini-stat">
                  <span className="v" style={{ color: t.stats.velocityRatio >= 1 ? 'var(--accent)' : undefined }}>
                    {t.stats.velocityRatio >= 1 ? '+' : ''}
                    {Math.round((t.stats.velocityRatio - 1) * 100)}%
                  </span>
                  <span className="k">速率</span>
                </div>
                <div className="mini-stat">
                  <span className="v">{fmt(t.stats.engagement)}</span>
                  <span className="k">互动</span>
                </div>
                <div className="mini-stat">
                  <span className="v">{Math.round(t.confidence * 100)}%</span>
                  <span className="k">置信度</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sel && (
          <div className="col" style={{ gap: 14, alignSelf: 'start', position: 'sticky', top: 70 }}>
            <div className="panel">
              <div className="row" style={{ marginBottom: 6 }}>
                <StageBadge stage={sel.stage} thin={sel.stats.posts < 3} />
                <span className="tiny muted mono">rank #{sel.momentumRank}</span>
                <span className="spacer grow" />
                <span className="tiny muted mono">conf {Math.round(sel.confidence * 100)}%</span>
              </div>
              <h2 className="serif" style={{ fontSize: 20, margin: '0 0 4px', fontWeight: 500 }}>
                {sel.nameZh}
              </h2>
              <div className="tiny muted mono" style={{ marginBottom: 10 }}>
                {sel.nameEn}
              </div>
              <p className="small" style={{ margin: '0 0 12px', color: 'var(--ink-2)' }}>
                {sel.whyNow}
              </p>

              <div className="divider" />
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                话题关键词 · 命中 {sel.matchedKeywords.length}/{sel.keywords.length}
              </div>
              <div className="pill-row" style={{ marginBottom: 14 }}>
                {sel.keywords.map((k) => (
                  <span key={k} className={`kw ${sel.matchedKeywords.includes(k) ? 'hit' : ''}`}>
                    {k}
                  </span>
                ))}
              </div>

              <div className="eyebrow" style={{ marginBottom: 7 }}>
                代表性帖子
              </div>
              <div className="col" style={{ gap: 9 }}>
                {sel.representative.map((p) => {
                  const a = accountById(p.accountId)
                  return (
                    <div key={p.id}>
                      <div className="row" style={{ gap: 6, marginBottom: 2 }}>
                        <span className="small mono">@{a.handle}</span>
                        <span className="tiny muted">{a.category}</span>
                        <span className="grow" />
                        <span className="tiny mono muted">{fmt(postEngagement(p, engine.state.clock))} eng</span>
                      </div>
                      <div className="quote small clamp">{p.text}</div>
                    </div>
                  )
                })}
              </div>

              <div className="divider" />
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                为什么与 TelyClaw 相关
              </div>
              <p className="small" style={{ margin: '0 0 8px', color: 'var(--ink-2)' }}>
                {sel.relevanceWhy}
              </p>
              <div className="note small">{sel.brandAsset}</div>

              <div className="divider" />
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-accent btn-block" onClick={() => onGoStudio(sel.topicId)}>
                  用这个话题生成内容 →
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>打分拆解</h2>
                <span className="spacer" />
                <span className="tiny muted mono">score {sel.score.toFixed(1)}</span>
              </div>
              <FactorBars b={sel.breakdown} />
              <div className="divider" />
              <div className="col" style={{ gap: 5 }}>
                <MiniRow k="互动速率比" v={`${sel.stats.velocityRatio.toFixed(2)}×`} />
                <MiniRow k="平均帖龄" v={`${sel.stats.meanAgeHours.toFixed(1)}h`} />
                <MiniRow k="关键词覆盖" v={`${Math.round(sel.stats.keywordCoverage * 100)}%`} />
                <MiniRow k="内容重复度" v={`${Math.round(sel.stats.duplicateRatio * 100)}%`} />
                <MiniRow k="聚类纯度" v={`${Math.round(sel.stats.purity * 100)}%`} />
                <MiniRow k="相关性门" v={`${sel.relevanceGate.toFixed(2)}×`} />
                <MiniRow k="样本收缩" v={`${sel.sampleShrink.toFixed(2)}×`} />
                <MiniRow k="历史命中修正" v={`${sel.learnedFactor.toFixed(2)}×`} />
                <MiniRow k="检测提前量" v={fmtMin(sel.leadTimeMin)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="tiny muted">{k}</span>
      <span className="tiny mono">{v}</span>
    </div>
  )
}
