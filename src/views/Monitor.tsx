import { useMemo, useState } from 'react'
import type { AccountCategory } from '../lib/types'
import { postEngagement } from '../data/corpus'
import { ICP_DEFINITION } from '../data/seed'
import type { Engine } from '../lib/store'
import { fmt, fmtMin, leadLabel } from '../lib/metrics'
import { AnimatedNumber, PanelHead, Sparkline, Stat } from '../components/ui'
import { SCAN_MINUTES } from '../lib/config'

const CATEGORIES: AccountCategory[] = [
  'AI Lab',
  'Dev Tool',
  'Indie Builder',
  'Growth Operator',
  'Analyst / VC',
  'Media',
]

export function Monitor({ engine }: { engine: Engine }) {
  const { state, actions, posts, trends, cluster } = engine
  const now = state.clock
  const winMs = state.windowHours * 3600 * 1000
  const [handle, setHandle] = useState('')
  const [category, setCategory] = useState<AccountCategory>('Indie Builder')
  const [followers, setFollowers] = useState('12000')

  const rows = useMemo(() => {
    return state.accounts
      .map((a) => {
        const own = posts.filter((p) => p.accountId === a.id)
        const inWin = own.filter((p) => p.createdAt >= now - winMs)
        const eng = inWin.reduce((s, p) => s + postEngagement(p, now), 0)
        const all = own.map((p) => postEngagement(p, now)).sort((x, y) => x - y)
        const baseline = all.length ? all[Math.floor(all.length / 2)] : 0
        const perPost = inWin.length ? eng / inWin.length : 0
        const ratio = baseline > 0 ? perPost / baseline : 0

        const spark = new Array(12).fill(0)
        const bMs = winMs / 12
        for (const p of inWin) {
          const i = Math.min(11, Math.max(0, Math.floor((p.createdAt - (now - winMs)) / bMs)))
          spark[i] += postEngagement(p, now)
        }

        return { account: a, posts: inWin.length, eng, ratio, spark }
      })
      .sort((x, y) => y.eng - x.eng)
  }, [state.accounts, posts, now, winMs])

  const totals = rows.reduce(
    (acc, r) => ({ posts: acc.posts + r.posts, eng: acc.eng + r.eng }),
    { posts: 0, eng: 0 },
  )
  const qualified = state.accounts.filter((a) => a.qualified)
  const qualifiedShare =
    totals.eng > 0
      ? rows.filter((r) => r.account.qualified).reduce((s, r) => s + r.eng, 0) / totals.eng
      : 0

  const top = trends[0]
  const leadTimes = trends
    .slice(0, 3)
    .map((t) => t.leadTimeMin)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b)

  return (
    <div className="page">
      <div className="head">
        <div className="head-titles">
          <div className="eyebrow">01 · 监控</div>
          <h1>账号监控</h1>
        </div>
        <p className="lede">
          盯住 {state.accounts.length} 个账号在最近 {state.windowHours} 小时里说了什么。
          窗口越短越能看见加速度，越长越能看清基本面。
        </p>
        <span className="spacer" />
      </div>

      <div className="band">
        <Stat
          label="监控账号"
          value={<AnimatedNumber value={state.accounts.length} />}
          foot={`${qualified.length} 个在 ICP 内`}
        />
        <Stat
          label={`${state.windowHours} 小时帖子`}
          value={<AnimatedNumber value={totals.posts} />}
          foot={`累计采集 ${posts.length} 条`}
        />
        <Stat
          label={`${state.windowHours} 小时互动`}
          value={<AnimatedNumber value={totals.eng} format={fmt} />}
          foot={
            <span className="tooltip-host">
              <span style={{ borderBottom: '1px dotted var(--faint)' }}>
                加权口径 · 有效占比 {Math.round(qualifiedShare * 100)}%
              </span>
              <span className="tooltip">
                赞 1 / 转 2 / 评 3 / 藏 1.5 / 引用 2。{ICP_DEFINITION}
              </span>
            </span>
          }
        />
      </div>

      <div className="grid g-side">
        <div className="panel flush">
          <PanelHead
            right={
              <span className="tiny faint mono" title="生产环境建议 15 分钟扫一次">
                每 {SCAN_MINUTES} 分钟扫描
              </span>
            }
            sub="按互动排序"
          >
            监控列表
          </PanelHead>

          <table className="tbl">
            <thead>
              <tr>
                <th>账号</th>
                <th className="right">粉丝</th>
                <th className="right">帖子</th>
                <th className="right">互动</th>
                <th className="right">相对基线</th>
                <th>节奏</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ account, posts: pc, eng, ratio, spark }) => (
                <tr key={account.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 500 }}>@{account.handle}</span>
                      {account.qualified && <span className="badge outline-accent">ICP</span>}
                      <span className="tiny faint nowrap">{account.category}</span>
                    </div>
                    <div className="tiny faint clamp clamp-3" style={{ WebkitLineClamp: 1 }}>
                      {account.bio}
                    </div>
                  </td>
                  <td className="right num small">{fmt(account.followers)}</td>
                  <td className="right num">{pc}</td>
                  <td className="right num">{fmt(eng)}</td>
                  <td
                    className="right num"
                    style={{ color: ratio >= 1.15 ? 'var(--accent)' : undefined }}
                  >
                    {ratio ? ratio.toFixed(2) + '×' : '—'}
                  </td>
                  <td>
                    <Sparkline
                      data={spark}
                      width={72}
                      height={18}
                      color={ratio >= 1.15 ? '#a6532b' : '#a29a8d'}
                    />
                  </td>
                  <td className="right">
                    <button
                      className="btn btn-sm"
                      onClick={() => actions.removeAccount(account.id)}
                      title="移出监控"
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--line-2)' }}>
            <div className="row wrap">
              <input
                className="input"
                placeholder="@handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                style={{ width: 148 }}
              />
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value as AccountCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="input"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                style={{ width: 90 }}
                placeholder="粉丝数"
              />
              <button
                className="btn btn-primary btn-sm"
                disabled={!handle.trim()}
                onClick={() => {
                  actions.addAccount(handle, category, Number(followers) || 5000)
                  setHandle('')
                }}
              >
                加入监控
              </button>
              <span className="tiny faint">加入后回填最近 7 天历史，下个扫描周期生效</span>
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <div className="panel hero-card">
            <PanelHead right={<span className="badge solid mono">{top ? Math.round(top.score) : '—'}</span>}>
              现在最值得做的
            </PanelHead>
            {top && (
              <div className="panel-pad">
                <div className="serif" style={{ fontSize: 16, marginBottom: 4 }}>
                  {top.nameZh}
                </div>
                <p className="small muted" style={{ margin: '0 0 12px', lineHeight: 1.55 }}>
                  {top.whyNow}
                </p>
                <div className="mini-stats">
                  <div className="mini-stat">
                    <span className="v">{Math.round(top.stats.velocityRatio * 100 - 100)}%</span>
                    <span className="k">速率</span>
                  </div>
                  <div className="mini-stat">
                    <span className="v">{top.stats.accounts}</span>
                    <span className="k">账号</span>
                  </div>
                  <div className="mini-stat">
                    <span className="v">{top.stats.posts}</span>
                    <span className="k">帖子</span>
                  </div>
                  <div className="mini-stat">
                    <span className="v">{leadLabel(top.leadTimeMin)}</span>
                    <span className="k">市场位置</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <PanelHead>采集与聚类</PanelHead>
            <div className="panel-pad">
              <div className="col" style={{ gap: 5 }}>
                <Row k="采集窗口" v={`${state.windowHours} 小时（滚动）`} />
                <Row k="扫描间隔" v={`${SCAN_MINUTES} 分钟`} />
                <Row k="聚类方式" v="关键词锚定" />
                <Row
                  k="聚类准确率"
                  v={`${Math.round((cluster.accuracy.correct / Math.max(1, cluster.accuracy.total)) * 100)}%`}
                />
                <Row k="未归类（7 日）" v={`${cluster.accuracy.unassigned} 条`} />
                <Row
                  k="Top3 市场位置"
                  v={leadTimes.length ? leadLabel(leadTimes[Math.floor(leadTimes.length / 2)]) : '—'}
                />
              </div>
              <div className="divider" />
              <div className="note">
                语料是合成的，账号全部虚构。用真人 handle 配假推文等于伪造言论，理由与生产方案见 README。
              </div>
            </div>
          </div>

          <div className="panel">
            <PanelHead right={<span className="tiny faint mono">{state.log.length}</span>}>
              Pipeline 日志
            </PanelHead>
            <div className="panel-pad">
              <div className="log">
                {state.log.length === 0 && <div className="tiny faint">等待操作……</div>}
                {state.log.map((l) => (
                  <div className="log-row" key={l.id}>
                    <span className="tiny faint mono">{new Date(l.at).toISOString().slice(11, 16)}</span>
                    <span className={`log-kind ${l.kind}`}>{l.kind}</span>
                    <span className="small">{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
