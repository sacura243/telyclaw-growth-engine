import { useEffect, useState } from 'react'
import { useEngine, clockLabel } from './lib/store'
import { Monitor } from './views/Monitor'
import { Trends } from './views/Trends'
import { Opportunity } from './views/Opportunity'
import { Studio } from './views/Studio'
import { Review } from './views/Review'
import { Analytics } from './views/Analytics'

type View = 'monitor' | 'trends' | 'opportunity' | 'studio' | 'review' | 'analytics'

const TABS: { key: View; label: string; step: string; hint: string }[] = [
  { key: 'monitor', label: '账号监控', step: '01', hint: '盯着谁在说什么' },
  { key: 'trends', label: '趋势检测', step: '02', hint: '哪些话题在加速' },
  { key: 'opportunity', label: '机会排序', step: '03', hint: '哪个值得我们出手' },
  { key: 'studio', label: '内容生成', step: '04', hint: '三个角度，九种产出' },
  { key: 'review', label: '审核队列', step: '05', hint: '人过一遍再发' },
  { key: 'analytics', label: '指标闭环', step: '06', hint: '有效互动回写排序' },
]

const WINDOWS = [1, 4, 24, 168]
const windowLabel = (h: number) => (h === 168 ? '7 天' : `${h} 小时`)

function viewFromHash(): View {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (TABS.find((t) => t.key === h)?.key ?? 'monitor') as View
}

export default function App() {
  const engine = useEngine()
  const [view, setView] = useState<View>(viewFromHash)
  const [selectedTrend, setSelectedTrend] = useState<string | null>(null)
  const [studioTopic, setStudioTopic] = useState<string | null>(null)
  const [showBanner, setShowBanner] = useState(true)

  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (v: View) => {
    setView(v)
    window.location.hash = `#/${v}`
  }

  const { state, actions, trends } = engine
  const pending = state.drafts.filter((d) => d.status === 'draft' || d.status === 'review').length
  const current = TABS.find((t) => t.key === view) ?? TABS[0]

  const goStudio = (topicId: string) => {
    setStudioTopic(topicId)
    go('studio')
  }

  return (
    <div className="shell">
      <div className="app-strip" />
      <aside className="rail">
        <div className="rail-brand">
          <div className="row" style={{ gap: 8 }}>
            <span className="logo-mark">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 12 L6 7.4 L9.2 9.6 L14 3"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="mark">
              Tely<b>Claw</b>
            </span>
          </div>
          <span className="tag" style={{ display: 'block', marginTop: 4 }}>
            Growth Engine
          </span>
        </div>

        <nav className="rail-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`nav-item ${view === t.key ? 'active' : ''}`}
              onClick={() => go(t.key)}
              title={t.hint}
            >
              <span className="step">{t.step}</span>
              {t.label}
              {t.key === 'review' && pending > 0 && <span className="pip" />}
            </button>
          ))}
        </nav>

        <div className="rail-foot">
          <div className="rail-block">
            <div className="k">待审批</div>
            <div className="v">
              {pending} 条 · 已发 {state.drafts.filter((d) => d.status === 'published').length}
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => {
              if (confirm('清空所有草稿与发布记录，恢复到初始状态？')) actions.reset()
            }}
          >
            重置演示数据
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <span className="crumb">
            工作台 / <b>{current.label}</b>
          </span>
          <span className="spacer" />
          <span className="tiny faint" style={{ marginRight: 4 }}>
            检测窗口
          </span>
          <div className="seg">
            {WINDOWS.map((h) => (
              <button
                key={h}
                className={state.windowHours === h ? 'active' : ''}
                onClick={() => actions.setWindow(h)}
                title={`按最近 ${windowLabel(h)} 的数据计算`}
              >
                {h === 168 ? '7D' : h === 24 ? '24H' : `${h}H`}
              </button>
            ))}
          </div>
          <button
            className={`live-btn ${state.live ? 'on' : ''}`}
            onClick={() => actions.setLive(!state.live)}
            title="模拟时钟 30× 加速，用来演示实时检测"
          >
            <span className="pulse" />
            {state.live ? '实时 ×30' : '已暂停'}
          </button>
          <span className="clock">{clockLabel(state.clock)}</span>
        </div>

        {showBanner && (
          <div className="banner">
            <b>演示数据</b>
            <span className="grow">
              418 条合成帖子 / 14 个虚构账号，内容生成与发布结果为本地模拟，不调用真实 X API 或 LLM。取舍与生产方案见 README。
            </span>
            <button className="btn btn-sm" onClick={() => setShowBanner(false)}>
              知道了
            </button>
          </div>
        )}

        <div key={view} className="view-enter">
        {view === 'monitor' && <Monitor engine={engine} />}
        {view === 'trends' && (
          <Trends
            engine={engine}
            selectedId={selectedTrend ?? trends[0]?.topicId ?? null}
            onSelect={setSelectedTrend}
            onGoStudio={goStudio}
          />
        )}
        {view === 'opportunity' && <Opportunity engine={engine} onGoStudio={goStudio} />}
        {view === 'studio' && (
          <Studio
            key={studioTopic ?? 'default'}
            engine={engine}
            initialTopicId={studioTopic}
            onGoReview={() => go('review')}
          />
        )}
        {view === 'review' && <Review engine={engine} onGoStudio={() => goStudio(trends[0].topicId)} />}
        {view === 'analytics' && <Analytics engine={engine} onGoStudio={() => goStudio(trends[0].topicId)} />}
        </div>

        <div className="footer">
          <span>TelyClaw Growth Engine · Vibe Coding Challenge</span>
          <span className="faint">Monitor → Detect → Rank → Ideate → Draft → Review → Publish → Measure</span>
          <span className="grow" />
          <span className="mono">{windowLabel(state.windowHours)}窗口</span>
        </div>
      </div>
    </div>
  )
}
