import { useState } from 'react'
import type { Draft } from '../lib/types'
import type { Engine } from '../lib/store'
import { editRatio } from '../lib/generate'
import { fmt } from '../lib/metrics'
import { StatusRail } from '../components/ui'
import { DAILY_CAP } from '../lib/config'

type Filter = 'all' | 'draft' | 'approved' | 'published'



const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '待审批' },
  { key: 'approved', label: '已通过' },
  { key: 'published', label: '已发布' },
]

export function Review({ engine, onGoStudio }: { engine: Engine; onGoStudio: () => void }) {
  const { state, actions } = engine
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<string | null>(null)

  const list = state.drafts.filter((d) => {
    if (filter === 'all') return true
    if (filter === 'draft') return d.status === 'draft' || d.status === 'review'
    return d.status === filter
  })

  const pending = state.drafts.filter((d) => d.status === 'draft' || d.status === 'review').length
  const publishedToday = state.drafts.filter(
    (d) => d.status === 'published' && d.publishedAt && state.clock - d.publishedAt < 24 * 3600 * 1000,
  ).length

  return (
    <div className="page">
      <div className="head">
        <div className="head-titles">
          <div className="eyebrow">05 · 审核</div>
          <h1>审核队列</h1>
        </div>
        <p className="lede">
          内容生成不等于发布。每一条都要人过一遍，这是产品承诺，不是流程装饰。
        </p>
        <span className="spacer" />
      </div>

      <div className="row" style={{ marginBottom: 14, gap: 6 }}>
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="grow" />
        <span className="small muted">
          待审批 <b className="mono">{pending}</b> · 24h 内已发 <b className="mono">{publishedToday}</b>
        </span>
        {publishedToday >= DAILY_CAP && <span className="badge saturated">已达单日发布上限 {DAILY_CAP}</span>}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          队列是空的。去 <button className="btn btn-sm" onClick={onGoStudio}>内容生成</button> 造几条草稿。
        </div>
      ) : (
        <div className="col" style={{ gap: 0 }}>
          {list.map((d) => (
            <div className="draft" key={d.id}>
              <div className="row wrap" style={{ marginBottom: 8 }}>
                <span className="badge outline-accent">{d.topicNameZh}</span>
                <span className="tiny muted mono">{d.angleLabel}</span>
                <span className="tiny muted">·</span>
                <span className="tiny muted mono">{d.lang === 'en' ? 'EN' : '中文'}</span>
                <span className="grow" />
                <span className="tiny faint mono" title="生成时的话题机会分，不随之后的重算变化">
                  生成时 {Math.round(d.score)} 分
                </span>
              </div>

              <StatusRail status={d.status} edited={d.edited} />

              <div style={{ marginTop: 9 }}>
                {editing === d.id ? (
                  <>
                    <textarea
                      className="editor"
                      value={d.text}
                      onChange={(e) => actions.setDraftText(d.id, e.target.value, editRatio(d.original, e.target.value))}
                      spellCheck={false}
                    />
                    <div className="row" style={{ marginTop: 6 }}>
                      <span className="tiny muted mono">改写率 {Math.round(d.editRatio * 100)}%</span>
                      <span className="grow" />
                      <button className="btn btn-sm" onClick={() => setEditing(null)}>
                        收起
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="draft-body">{d.text}</div>
                )}
              </div>

              {d.duplicateOf && (
                <div className="note" style={{ marginTop: 8 }}>
                  相似度 {Math.round(d.similarity * 100)}% · 与已发布内容高度重合，建议换角度而不是换措辞。
                </div>
              )}

              <div className="row wrap" style={{ marginTop: 9, gap: 8 }}>
                <span className="tiny muted">
                  {d.edited ? `人工改写 ${Math.round(d.editRatio * 100)}%` : '未改写'}
                </span>
                <span className="grow" />
                {editing !== d.id && (
                  <button className="btn btn-sm" onClick={() => setEditing(d.id)}>
                    编辑
                  </button>
                )}
                {d.status === 'draft' && (
                  <button className="btn btn-sm" onClick={() => actions.setStatus(d.id, 'review')}>
                    标记已改写
                  </button>
                )}
                {(d.status === 'draft' || d.status === 'review') && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      actions.setStatus(d.id, 'approved')
                      actions.log('approve', `${d.topicNameZh} · 通过审批`)
                    }}
                  >
                    通过
                  </button>
                )}
                {d.status === 'approved' && (
                  <button
                    className="btn btn-accent btn-sm"
                    disabled={publishedToday >= DAILY_CAP}
                    onClick={() => actions.publish(d.id)}
                  >
                    发布
                  </button>
                )}
                {d.status === 'published' && (
                  <span className="badge solid">已发布</span>
                )}
              </div>

              {d.outcome && <OutcomeBlock draft={d} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OutcomeBlock({ draft }: { draft: Draft }) {
  const o = draft.outcome!
  return (
    <div
      style={{
        marginTop: 10,
        borderTop: '1px solid var(--line-2)',
        paddingTop: 9,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0,1fr))',
        gap: 10,
      }}
    >
      <Cell k="Impressions" v={fmt(o.impressions)} />
      <Cell k="Likes" v={String(o.likes)} />
      <Cell k="Reposts" v={String(o.reposts)} />
      <Cell k="Replies" v={String(o.replies)} />
      <Cell k="Qualified Eng." v={String(o.qualifiedEngagement)} accent />
    </div>
  )
}

function Cell({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="stat">
      <div className="stat-label">{k}</div>
      <span className="stat-value sm" style={accent ? { color: 'var(--accent)' } : undefined}>
        {v}
      </span>
    </div>
  )
}
