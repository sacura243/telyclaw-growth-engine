import { useMemo, useState } from 'react'
import type { AngleKind, TweetFormat } from '../lib/types'
import type { Engine } from '../lib/store'
import { editRatio, evidenceFor, findDuplicate, generateDraft, dataLine } from '../lib/generate'
import { fmt } from '../lib/metrics'
import { StatusRail, StageBadge } from '../components/ui'
import { DAILY_CAP } from '../lib/config'

export function Studio({
  engine,
  initialTopicId,
  onGoReview,
}: {
  engine: Engine
  initialTopicId: string | null
  onGoReview: () => void
}) {
  const { state, actions, trends } = engine
  const [topicId, setTopicId] = useState<string | null>(initialTopicId ?? trends[0]?.topicId ?? null)
  const [lang, setLang] = useState<'en' | 'zh'>('en')
  const [format, setFormat] = useState<TweetFormat>('copy')
  const [variant, setVariant] = useState(0)
  const [draftId, setDraftId] = useState<string | null>(null)

  const trend = trends.find((t) => t.topicId === topicId) ?? trends[0]
  const draft = state.drafts.find((d) => d.id === draftId) ?? null
  const evidence = useMemo(() => (trend ? evidenceFor(trend, state.clock) : []), [trend, state.clock])
  // Same guardrail as the review queue — a cap you can bypass from another screen is not a cap.
  const publishedToday = state.drafts.filter(
    (d) => d.status === 'published' && d.publishedAt && state.clock - d.publishedAt < 24 * 3600 * 1000,
  ).length

  if (!trend) return <div className="page">没有可用的趋势数据。</div>

  // Which angle fits this stage. Saturated topics reward a short contrarian take;
  // emerging ones reward the teardown that establishes expertise first.
  const recommended: AngleKind =
    trend.stage === 'saturated' || trend.stage === 'declining'
      ? 'hot-take'
      : trend.stage === 'emerging'
        ? 'teardown'
        : 'product-angle'

  const generate = (angle: AngleKind) => {
    const { text, angleLabel } = generateDraft(trend, angle, lang, variant, format)
    const dup = findDuplicate(text, state.drafts)
    const id = actions.createDraft({
      topicId: trend.topicId,
      topicNameZh: trend.nameZh,
      angle,
      angleLabel,
      format,
      lang,
      text,
      original: text,
      status: 'draft',
      score: trend.score,
      approvedAt: null,
      publishedAt: null,
      edited: false,
      editRatio: 0,
      duplicateOf: dup?.draft.id ?? null,
      similarity: dup?.score ?? 0,
      evidence,
      outcome: null,
    })
    setDraftId(id)
    actions.log('generate', `${trend.nameZh} · ${angleLabel} 草稿已生成`)
  }

  return (
    <div className="page">
      <div className="head">
        <div className="head-titles">
          <div className="eyebrow">04 · 生成</div>
          <h1>内容生成</h1>
        </div>
        <p className="lede">
          一个话题给三个角度，每个角度三个版本，每个版本三种格式。系统按阶段标出推荐角度，但选哪个仍然是人说了算。
        </p>
        <span className="spacer" />
      </div>

      <div className="grid g-side">
        <div className="col" style={{ gap: 14 }}>
          <div className="panel">
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              <div className="col" style={{ gap: 2 }}>
                <span className="eyebrow">话题</span>
                <select
                  className="input"
                  value={trend.topicId}
                  onChange={(e) => {
                    setTopicId(e.target.value)
                    setDraftId(null)
                  }}
                  style={{ minWidth: 260 }}
                >
                  {trends.map((t) => (
                    <option key={t.topicId} value={t.topicId}>
                      {Math.round(t.score)} · {t.nameZh}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span className="eyebrow">语言</span>
                <div className="seg">
                  <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                    EN
                  </button>
                  <button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
                    中文
                  </button>
                </div>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span className="eyebrow">格式</span>
                <div className="seg" title="Copy=单条 · Rewrite=引用转发 · Summary=长帖+三点">
                  {(['copy', 'rewrite', 'summary'] as TweetFormat[]).map((f) => (
                    <button
                      key={f}
                      className={format === f ? 'active' : ''}
                      onClick={() => {
                        setFormat(f)
                        if (draft && draft.status === 'draft') {
                          const { text } = generateDraft(trend, draft.angle, draft.lang, variant, f)
                          actions.restyleDraft(draft.id, f, text)
                        }
                      }}
                    >
                      {f === 'copy' ? 'Copy' : f === 'rewrite' ? 'Rewrite' : 'Summary'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span className="eyebrow">变体</span>
                <div className="row" style={{ gap: 4 }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      const next = Math.max(0, variant - 1)
                      setVariant(next)
                      if (draft && draft.status === 'draft') {
                        const { text } = generateDraft(trend, draft.angle, draft.lang, next, format)
                        actions.restyleDraft(draft.id, format, text)
                      }
                    }}
                  >
                    −
                  </button>
                  <span className="mono small" style={{ width: 18, textAlign: 'center' }}>
                    {variant}
                  </span>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      const next = variant + 1
                      setVariant(next)
                      if (draft && draft.status === 'draft') {
                        const { text } = generateDraft(trend, draft.angle, draft.lang, next, format)
                        actions.restyleDraft(draft.id, format, text)
                      }
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="grow" />
              <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
                <span className="eyebrow">当前话题</span>
                <div className="row" style={{ gap: 6 }}>
                  <StageBadge stage={trend.stage} thin={trend.stats.posts < 3} />
                  <span className="mono small">{Math.round(trend.score)}</span>
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="eyebrow" style={{ marginBottom: 8 }}>
              三个角度 · 点一下即生成
            </div>
            <div className="grid g3">
              {trend.angles.map((a) => (
                <div key={a.kind} className="angle-card" onClick={() => generate(a.kind)}>
                  <div className="row" style={{ marginBottom: 4 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {lang === 'zh' ? a.labelZh : a.labelEn}
                    </span>
                    <span className="grow" />
                    {a.kind === recommended && <span className="badge outline-accent">推荐</span>}
                    <span className="tiny faint mono">＋</span>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.55 }}>
                    {a.rationale}
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" />
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              注入草稿的真实数据行
            </div>
            <div className="quote small mono" style={{ fontSize: 11.5 }}>
              {dataLine(trend, lang)}
            </div>
          </div>

          {!draft && (
            <div className="panel">
              <div className="row" style={{ marginBottom: 8 }}>
                <h2 style={{ fontSize: 13, margin: 0 }}>预览 · 尚未生成</h2>
                <span className="grow" />
                <span className="tiny muted">点上方任意角度，或直接生成这一条</span>
              </div>
              <div className="draft-body" style={{ opacity: 0.55 }}>
                {generateDraft(trend, 'hot-take', lang, variant, format).text}
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={() => generate('hot-take')}>
                  生成这条草稿
                </button>
                <span className="tiny muted">生成后可编辑、审批、发布</span>
              </div>
            </div>
          )}

          {draft && (
            <div className="panel">
              <div className="row" style={{ marginBottom: 10 }}>
                <h2 style={{ fontSize: 13, margin: 0 }}>草稿 · {draft.angleLabel}</h2>
                <span className="badge tiny">{draft.lang === 'en' ? 'EN' : '中文'}</span>
                <span className="badge tiny">{draft.format}</span>
                <span className="grow" />
                <span className="tiny muted mono">
                  改写率 {Math.round(draft.editRatio * 100)}%
                </span>
              </div>

              <StatusRail status={draft.status} edited={draft.edited} />

              {draft.duplicateOf && (
                <div className="note" style={{ marginTop: 10 }}>
                  与已发布草稿的相似度 {Math.round(draft.similarity * 100)}%，超过 45% 阈值。
                  这是护栏：同一话题反复发同样的句子，在 X 上只会被判重并降权。
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <textarea
                  className="editor"
                  value={draft.text}
                  onChange={(e) => actions.setDraftText(draft.id, e.target.value, editRatio(draft.original, e.target.value))}
                  spellCheck={false}
                />
              </div>

              <div className="row wrap" style={{ marginTop: 10, gap: 8 }}>
                <button className="btn btn-sm" onClick={() => generate(draft.angle)}>
                  重新生成
                </button>
                <span className="grow" />
                {draft.status === 'draft' && (
                  <button className="btn btn-sm" onClick={() => actions.setStatus(draft.id, 'review')}>
                    标记已改写
                  </button>
                )}
                {draft.status !== 'approved' && draft.status !== 'published' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      actions.setStatus(draft.id, 'approved')
                      actions.log('approve', `${draft.topicNameZh} · 草稿通过审批`)
                    }}
                  >
                    通过
                  </button>
                )}
                {draft.status === 'approved' && (
                  <button
                    className="btn btn-accent btn-sm"
                    disabled={publishedToday >= DAILY_CAP}
                    onClick={() => {
                      actions.publish(draft.id)
                    }}
                  >
                    {publishedToday >= DAILY_CAP ? `今日已达 ${DAILY_CAP} 条上限` : '发布到 @telyclaw'}
                  </button>
                )}
                {draft.status === 'published' && (
                  <button className="btn btn-sm" onClick={onGoReview}>
                    查看发布结果 →
                  </button>
                )}
              </div>

              {draft.outcome && (
                <>
                  <div className="divider" />
                  <div className="grid g4">
                    <Outcome label="Impressions" v={fmt(draft.outcome.impressions)} />
                    <Outcome label="Likes" v={String(draft.outcome.likes)} />
                    <Outcome label="Reposts" v={String(draft.outcome.reposts)} />
                    <Outcome
                      label="Qualified Eng."
                      v={String(draft.outcome.qualifiedEngagement)}
                      accent
                    />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 8 }}>
                    发布结果在 demo 中是模拟值（{draft.outcome.hit ? '超过' : '未达'}基线）。生产环境接 X API 的
                    tweet metrics 回填。
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 14, alignSelf: 'start' }}>
          <div className="panel">
            <div className="panel-head">
              <h2>证据链</h2>
              <span className="spacer" />
              <span className="tiny muted">草稿引用的事实来源</span>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {evidence.map((e) => (
                <div key={e.handle}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="small mono">@{e.handle}</span>
                    <span className="tiny muted">{e.category}</span>
                    <span className="grow" />
                    <span className="tiny mono muted">{fmt(e.engagement)}</span>
                  </div>
                  <div className="quote tiny clamp clamp-3" style={{ marginTop: 2 }}>
                    {e.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="tiny muted">
              生成器只允许引用当前窗口内、互动排名前 3 的帖子作为事实依据，避免"看起来像数据"的编造。
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>这个话题下的产出</h2>
              <span className="spacer" />
              <span className="tiny muted mono">
                {state.drafts.filter((d) => d.topicId === trend.topicId).length}
              </span>
            </div>
            <div className="col" style={{ gap: 7 }}>
              {state.drafts.filter((d) => d.topicId === trend.topicId).length === 0 && (
                <div className="tiny muted">还没有草稿。</div>
              )}
              {state.drafts
                .filter((d) => d.topicId === trend.topicId)
                .map((d) => (
                  <div
                    key={d.id}
                    className="row"
                    style={{ cursor: 'pointer', gap: 6 }}
                    onClick={() => setDraftId(d.id)}
                  >
                    <span className="tiny mono muted">{d.angleLabel}</span>
                    <span className="grow" />
                    <span className="tiny muted">{d.status}</span>
                    {d.outcome && (
                      <span className="tiny mono accent">+{d.outcome.qualifiedEngagement}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Outcome({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <span className="stat-value sm" style={accent ? { color: 'var(--accent)' } : undefined}>
        {v}
      </span>
    </div>
  )
}
