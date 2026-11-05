import type { Engine } from '../lib/store'
import type { Metrics } from '../lib/metrics'
import { computeMetrics, fmt, fmtMin, leadLabel, qualifiedSeries } from '../lib/metrics'
import { SCAN_MINUTES } from '../lib/config'
import { AnimatedNumber, Sparkline, Stat } from '../components/ui'

function targetRows(m: Metrics) {
  return [
    {
      label: '检测延迟（扫描间隔）',
      value: `${SCAN_MINUTES} min`,
      target: '< 30 min',
      ok: SCAN_MINUTES < 30,
      note: '设计值：生产每 15 分钟扫一次',
    },
    {
      label: 'Trend Hit Rate',
      value: `${Math.round(m.hitRate * 100)}%`,
      target: '> 50%',
      ok: m.publishedCount ? m.hitRate > 0.5 : null,
      note: '超过账号基线即算命中',
    },
    {
      label: 'Acceptance Rate',
      value: `${Math.round(m.acceptanceRate * 100)}%`,
      target: '> 50%',
      ok: m.generatedCount ? m.acceptanceRate > 0.5 : null,
      note: '审批通过 / 生成总数',
    },
    {
      label: 'Trend → Content Time',
      value: fmtMin(m.medianTimeToContentMin),
      target: '< 30 min',
      ok: m.medianTimeToContentMin === null ? null : m.medianTimeToContentMin < 30,
      note: '含 6 条预置耗时；需求建议 5–10 min，差额全在人工改写',
    },
  ]
}

export function Analytics({ engine, onGoStudio }: { engine: Engine; onGoStudio: () => void }) {
  const { state, trends, cluster } = engine
  const m = computeMetrics(state.drafts, trends)
  const series = qualifiedSeries(state.drafts)

  const half = Math.floor(series.length / 2)
  const firstHalf = series.slice(0, half)
  const secondHalf = series.slice(half)
  const avg = (xs: { value: number }[]) => (xs.length ? xs.reduce((s, x) => s + x.value, 0) / xs.length : 0)
  const learningDelta = half > 0 ? avg(secondHalf) - avg(firstHalf) : 0

  const rows = Object.entries(state.performance)
    .map(([topicId, p]) => ({
      topicId,
      name: trends.find((t) => t.topicId === topicId)?.nameZh ?? topicId,
      ...p,
      rate: p.posts ? p.hits / p.posts : 0,
    }))
    .sort((a, b) => b.qualified - a.qualified)

  const seriesByTopic: Record<string, number[]> = {}
  for (const d of state.drafts) {
    if (d.status !== 'published' || !d.outcome) continue
    seriesByTopic[d.topicId] = [...(seriesByTopic[d.topicId] ?? []), d.outcome.qualifiedEngagement]
  }

  return (
    <div className="page">
      <div className="head">
        <div className="head-titles">
          <div className="eyebrow">06 · 闭环</div>
          <h1>指标闭环</h1>
        </div>
        <p className="lede">
          北极星不是发了多少条，是每条内容带来多少有效互动。这个数字会回写进下一次排序。
        </p>
        <span className="spacer" />
      </div>

      <div className="band">
        <Stat
          size="hero"
          tone="accent"
          label="北极星 · 每条内容的有效互动"
          value={<AnimatedNumber value={m.qualifiedPerPost} decimals={1} />}
          foot={`只算 ICP 账号带来的互动，${m.publishedCount} 条已发布`}
        />
        <Stat
          size="sm"
          label="有效互动总量"
          value={<AnimatedNumber value={m.qualifiedTotal} />}
          foot="Qualified Engagement"
        />
        <Stat
          size="sm"
          label="命中率"
          value={<AnimatedNumber value={Math.round(m.hitRate * 100)} format={(n) => `${Math.round(n)}%`} />}
          foot="超过账号基线即算命中"
        />
        <Stat
          size="sm"
          label="互动提升"
          value={<AnimatedNumber value={m.engagementLift} decimals={1} format={(n) => `${n.toFixed(1)}×`} />}
          foot="相对基线 3.0"
        />
      </div>

      <div className="grid g-side">
        <div className="col" style={{ gap: 14 }}>
          <div className="panel">
            <div className="panel-head">
              <h2>发布表现</h2>
              <span className="sub">每条已发布内容的 Qualified Engagement</span>
              <span className="spacer" />
              {series.length >= 4 && (
                <span className="tiny mono" style={{ color: learningDelta >= 0 ? 'var(--accent)' : 'var(--muted)' }}>
                  后半程 {learningDelta >= 0 ? '+' : ''}
                  {learningDelta.toFixed(1)}
                </span>
              )}
            </div>
            {series.length === 0 ? (
              <div className="empty">
                还没有发布数据。去 <button className="btn btn-sm" onClick={onGoStudio}>内容生成</button> 发一条，回来看这条曲线。
              </div>
            ) : (
              <>
                <BarChart data={series.map((s) => s.value)} />
                <div className="row wrap" style={{ marginTop: 8, gap: 12 }}>
                  <span className="tiny muted">
                    共 {series.length} 条 · 均值{' '}
                    <span className="mono">{(series.reduce((s, x) => s + x.value, 0) / series.length).toFixed(1)}</span>
                  </span>
                  <span className="tiny muted">
                    最高 <span className="mono">{Math.max(...series.map((s) => s.value))}</span>
                  </span>
                  <span className="grow" />
                  <span className="tiny muted">
                    排序收敛到高相关话题，曲线随之抬高；命中率回写后权重只会小幅修正（0.9×–1.1×）
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="panel">
            <div className="card-head" style={{ padding: '14px 18px 0' }}>
              <h2>话题级表现</h2>
              <span className="sub">命中率 → 权重修正 0.9×–1.1×</span>
            </div>
            {rows.length === 0 ? (
              <div style={{ padding: 18 }} className="tiny muted">
                还没有发布记录，这张表是空的。
              </div>
            ) : (
              <table className="tbl" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>话题</th>
                    <th className="right">发布</th>
                    <th className="right">Qualified</th>
                    <th className="right">命中率</th>
                    <th className="right">权重修正</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.topicId}>
                      <td>{r.name}</td>
                      <td className="right num">{r.posts}</td>
                      <td className="right num">{r.qualified}</td>
                      <td className="right num">{Math.round(r.rate * 100)}%</td>
                      <td className="right num">{(0.9 + 0.2 * r.rate).toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="panel">
            <div className="panel-head">
              <h2>支撑指标 vs 目标</h2>
            </div>
            <div>
              {targetRows(m).map((t) => (
                <div
                  key={t.label}
                  className="row"
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '9px 0',
                    borderBottom: '1px solid var(--line-2)',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="small">{t.label}</div>
                    <div className="tiny faint" style={{ lineHeight: 1.45 }}>
                      目标 {t.target} · {t.note}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flex: 'none' }}>
                    <span className="num small">{t.value}</span>
                    {t.ok === null ? (
                      <span className="tiny faint">—</span>
                    ) : t.ok ? (
                      <span className="badge rising">达标</span>
                    ) : (
                      <span className="badge">未达</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="tiny muted" style={{ lineHeight: 1.6 }}>
              Trend → Content Time 是生成到审批的耗时。demo 里 6 条预置草稿带真实分布（13–41 分钟），你自己新生成的草稿按虚拟时钟计时，暂停状态下记为 0 不计入。
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>检测质量</h2>
            </div>
            <div className="col" style={{ gap: 6 }}>
              <Row k="语料条数" v={String(engine.posts.length)} />
              <Row
                k="聚类准确率"
                v={`${Math.round((cluster.accuracy.correct / Math.max(1, cluster.accuracy.total)) * 100)}%`}
              />
              <Row k="未归类" v={`${cluster.accuracy.unassigned} 条`} />
              <Row k="识别话题" v={`${trends.filter((t) => t.stats.posts > 0).length} / ${trends.length}`} />
              <Row k="已生成草稿" v={String(m.generatedCount)} />
              <Row k="已审批" v={String(m.approvedCount)} />
              <Row k="总曝光" v={fmt(m.totalImpressions)} />
            </div>
            <div className="divider" />
            <div className="note">
              准确率是聚类结果与语料真值标签的对照。它衡量的是"检测是否靠谱"，不是"生意是否成立"。
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>市场提前量（近似）</h2>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="tiny muted" style={{ lineHeight: 1.5 }}>
                用 1 小时粒度回放算的，正数=早于话题达峰，负数=已过峰值。它是参考量，不是 KPI。
              </div>
              {trends.slice(0, 3).map((t) => (
                <div key={t.topicId}>
                  <div className="row">
                    <span className="small">{t.nameZh}</span>
                    <span className="grow" />
                    <span className="tiny mono">{leadLabel(t.leadTimeMin)}</span>
                  </div>
                  <div className="tiny muted">
                    {t.leadTimeMin === null
                      ? '数据不足，无法计算'
                      : t.leadTimeMin > 0
                        ? `比话题达峰一半早 ${fmtMin(t.leadTimeMin)} 介入`
                        : `达峰后 ${fmtMin(Math.abs(t.leadTimeMin))} 才进榜，只值一条低成本评论`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const mid = Math.floor(data.length / 2)
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 132 }}>
        {data.map((v, i) => (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
          >
            <span className="tiny mono faint" style={{ textAlign: 'center', marginBottom: 2 }}>
              {v}
            </span>
            <div
              style={{
                height: `${Math.max(2, (v / max) * 100)}%`,
                background: i >= mid ? '#a6532b' : '#cbb9a4',
                borderRadius: '2px 2px 0 0',
                maxWidth: 72,
                margin: '0 auto',
                width: '100%',
              }}
              title={`第 ${i + 1} 条：${v}`}
            />
            <span className="tiny faint" style={{ textAlign: 'center', marginTop: 4 }}>
              #{i + 1}
            </span>
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 14, marginTop: 10 }}>
        <span className="tiny faint">
          <span
            style={{ display: 'inline-block', width: 8, height: 8, background: '#cbb9a4', marginRight: 4 }}
          />
          前 {mid} 条
        </span>
        <span className="tiny faint">
          <span
            style={{ display: 'inline-block', width: 8, height: 8, background: '#a6532b', marginRight: 4 }}
          />
          后 {data.length - mid} 条
        </span>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="small muted">{k}</span>
      <span className="small mono">{v}</span>
    </div>
  )
}
