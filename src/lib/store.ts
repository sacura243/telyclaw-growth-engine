import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { Account, AppState, Draft, EventLogEntry, PublishOutcome, TopicPerformance } from './types'
import { ACCOUNTS, CORPUS_END } from '../data/seed'
import { makeBackfill, postEngagement, postsUntil } from '../data/corpus'
import { clusterPosts, buildTrends } from './detect'
import { evidenceFor, generateDraft, simulateOutcome } from './generate'
import { TELYCLAW_FOLLOWERS } from './config'

const STORAGE_KEY = 'telyclaw-ge-v1'

export interface EngineState extends AppState {
  extraPosts: ReturnType<typeof makeBackfill>
  log: EventLogEntry[]
  /** True once the demo seed has been written, so a reset re-seeds instead of showing empty screens. */
  seeded: boolean
}

type Action =
  | { type: 'tick'; dt: number }
  | { type: 'setWindow'; hours: number }
  | { type: 'setLive'; live: boolean }
  | { type: 'addAccount'; account: Account; backfill: EngineState['extraPosts'] }
  | { type: 'removeAccount'; id: string }
  | { type: 'addDraft'; draft: Draft }
  | { type: 'setDraftText'; id: string; text: string; editRatio: number }
  | { type: 'restyleDraft'; id: string; format: Draft['format']; text: string }
  | { type: 'setStatus'; id: string; status: Draft['status'] }
  | { type: 'measure'; id: string; outcome: PublishOutcome }
  | { type: 'seed'; drafts: Draft[]; performance: Record<string, TopicPerformance> }
  | { type: 'log'; kind: EventLogEntry['kind']; text: string; at: number }
  | { type: 'reset' }

function initialState(): EngineState {
  return {
    accounts: ACCOUNTS,
    extraPosts: [],
    drafts: [],
    performance: {},
    clock: CORPUS_END,
    live: false,
    windowHours: 24,
    log: [],
    seeded: false,
  }
}

/**
 * Demo seed: five published posts + one pending draft so the Review queue and the
 * metrics page are not empty on first load. Outcomes are simulated (see generate.ts).
 * Order matters — earlier posts sit on a lower-relevance topic, later ones on the
 * topics the ranking actually converges to, which is why the curve trends up.
 */
function buildSeedDrafts(trends: ReturnType<typeof buildTrends>, clock: number): Draft[] {
  const plan: {
    idx: number
    angle: Draft['angle']
    format: Draft['format']
    status: Draft['status']
    hoursAgo: number
    editRatio: number
  }[] = [
    { idx: 7, angle: 'hot-take', format: 'copy', status: 'published', hoursAgo: 46, editRatio: 0.24 },
    { idx: 6, angle: 'teardown', format: 'summary', status: 'published', hoursAgo: 39, editRatio: 0.31 },
    { idx: 4, angle: 'hot-take', format: 'copy', status: 'published', hoursAgo: 31, editRatio: 0.18 },
    { idx: 2, angle: 'teardown', format: 'summary', status: 'published', hoursAgo: 21, editRatio: 0.12 },
    { idx: 0, angle: 'hot-take', format: 'rewrite', status: 'published', hoursAgo: 9, editRatio: 0.09 },
    { idx: 1, angle: 'product-angle', format: 'summary', status: 'approved', hoursAgo: 3, editRatio: 0.15 },
    { idx: 3, angle: 'hot-take', format: 'copy', status: 'draft', hoursAgo: 1, editRatio: 0 },
  ]

  let seed = 99173
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  return plan
    .map((p, i) => {
      const trend = trends[Math.min(p.idx, trends.length - 1)]
      if (!trend) return null
      // variant offset keeps seeded drafts different from the Studio preview
      const { text, angleLabel } = generateDraft(trend, p.angle, 'en', (i % 2) + 1, p.format)
      const createdAt = clock - p.hoursAgo * 3600 * 1000
      // Deliberately uneven: a real review takes 12-50 min depending on the draft.
      const reviewMinutes = [19, 41, 27, 34, 13, 22, 16][i] ?? 25
      const base: Draft = {
        id: `seed-${i}`,
        topicId: trend.topicId,
        topicNameZh: trend.nameZh,
        angle: p.angle,
        angleLabel,
        format: p.format,
        lang: 'en',
        text,
        original: text,
        status: p.status,
        score: trend.score,
        createdAt,
        updatedAt: createdAt + 20 * 60 * 1000,
        approvedAt: p.status === 'draft' ? null : createdAt + reviewMinutes * 60 * 1000,
        publishedAt: p.status === 'published' ? createdAt + (reviewMinutes + 9) * 60 * 1000 : null,
        edited: p.editRatio > 0,
        editRatio: p.editRatio,
        duplicateOf: null,
        similarity: 0,
        evidence: evidenceFor(trend, clock),
        outcome: null,
      }
      if (p.status === 'published') {
        const o = simulateOutcome(trend, base, TELYCLAW_FOLLOWERS, rand)
        base.outcome = { ...o, measuredAt: createdAt + 24 * 3600 * 1000 }
      }
      return base
    })
    .filter((d): d is Draft => d !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
}

function buildSeedPerformance(drafts: Draft[]): Record<string, TopicPerformance> {
  const perf: Record<string, TopicPerformance> = {}
  for (const d of drafts) {
    if (!d.outcome) continue
    const cur = perf[d.topicId] ?? { posts: 0, qualified: 0, hits: 0 }
    perf[d.topicId] = {
      posts: cur.posts + 1,
      qualified: cur.qualified + d.outcome.qualifiedEngagement,
      hits: cur.hits + (d.outcome.hit ? 1 : 0),
    }
  }
  return perf
}

function load(): EngineState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const saved = JSON.parse(raw) as Partial<EngineState>
    return {
      ...initialState(),
      // An empty array is a valid state (user removed everyone) — only undefined falls back.
      accounts: saved.accounts ?? ACCOUNTS,
      extraPosts: saved.extraPosts ?? [],
      drafts: saved.drafts ?? [],
      performance: saved.performance ?? {},
      windowHours: saved.windowHours ?? 24,
      seeded: saved.seeded ?? false,
      clock: Math.max(saved.clock ?? CORPUS_END, CORPUS_END),
    }
  } catch {
    return initialState()
  }
}

function pushLog(state: EngineState, kind: EventLogEntry['kind'], text: string): EventLogEntry[] {
  const entry: EventLogEntry = { id: `l${state.log.length + 1}-${state.clock}`, at: state.clock, kind, text }
  return [entry, ...state.log].slice(0, 60)
}

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'tick':
      return { ...state, clock: state.clock + action.dt }
    case 'setWindow':
      return { ...state, windowHours: action.hours }
    case 'setLive':
      return { ...state, live: action.live }
    case 'addAccount':
      return {
        ...state,
        accounts: [...state.accounts, action.account],
        extraPosts: [...state.extraPosts, ...action.backfill],
        log: pushLog(state, 'detect', `已加入监控 @${action.account.handle}，回填 ${action.backfill.length} 条历史帖子`),
      }
    case 'removeAccount':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.id),
        log: pushLog(state, 'detect', `已移出监控 ${action.id}`),
      }
    case 'addDraft':
      return { ...state, drafts: [action.draft, ...state.drafts] }
    case 'setDraftText':
      return {
        ...state,
        drafts: state.drafts.map((d) =>
          d.id === action.id
            ? { ...d, text: action.text, edited: action.text !== d.original, editRatio: action.editRatio, updatedAt: state.clock }
            : d,
        ),
      }
    case 'restyleDraft':
      return {
        ...state,
        drafts: state.drafts.map((d) =>
          d.id === action.id
            ? { ...d, format: action.format, text: action.text, original: action.text, edited: false, editRatio: 0 }
            : d,
        ),
      }
    case 'setStatus':
      return {
        ...state,
        drafts: state.drafts.map((d) =>
          d.id === action.id
            ? {
                ...d,
                status: action.status,
                updatedAt: state.clock,
                approvedAt: action.status === 'approved' ? state.clock : d.approvedAt,
                publishedAt: action.status === 'published' ? state.clock : d.publishedAt,
              }
            : d,
        ),
      }
    case 'measure': {
      const draft = state.drafts.find((d) => d.id === action.id)
      if (!draft) return state
      const perf: TopicPerformance = state.performance[draft.topicId] ?? { posts: 0, qualified: 0, hits: 0 }
      const nextPerf: TopicPerformance = {
        posts: perf.posts + 1,
        qualified: perf.qualified + action.outcome.qualifiedEngagement,
        hits: perf.hits + (action.outcome.hit ? 1 : 0),
      }
      return {
        ...state,
        drafts: state.drafts.map((d) => (d.id === action.id ? { ...d, outcome: action.outcome } : d)),
        performance: { ...state.performance, [draft.topicId]: nextPerf },
        log: pushLog(
          state,
          'measure',
          `${draft.topicNameZh} · Qualified Engagement ${action.outcome.qualifiedEngagement}，${action.outcome.hit ? '超过基线' : '未达基线'}，已回写话题命中率`,
        ),
      }
    }
    case 'seed':
      return {
        ...state,
        drafts: action.drafts,
        performance: action.performance,
        seeded: true,
        log: pushLog(state, 'detect', '已载入演示数据：5 条已发布 + 1 条待审批'),
      }
    case 'log':
      return { ...state, log: pushLog(state, action.kind, action.text) }
    case 'reset':
      return initialState()
    default:
      return state
  }
}

export function useEngine() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const seq = useRef(0)

  useEffect(() => {
    const persist: Partial<EngineState> = {
      accounts: state.accounts,
      extraPosts: state.extraPosts,
      drafts: state.drafts,
      performance: state.performance,
      windowHours: state.windowHours,
      seeded: state.seeded,
      clock: state.clock,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist))
    } catch {
      /* storage full or blocked — the demo still works in memory */
    }
  }, [state.accounts, state.extraPosts, state.drafts, state.performance, state.windowHours, state.clock, state.seeded])

  useEffect(() => {
    if (!state.live) return
    const t = window.setInterval(() => dispatch({ type: 'tick', dt: 30_000 }), 1000)
    return () => window.clearInterval(t)
  }, [state.live])

  const posts = useMemo(() => postsUntil(state.clock, state.extraPosts), [state.clock, state.extraPosts])

  const watchedPosts = useMemo(() => {
    const ids = new Set(state.accounts.map((a) => a.id))
    return posts.filter((p) => ids.has(p.accountId))
  }, [posts, state.accounts])

  const cluster = useMemo(() => clusterPosts(watchedPosts), [watchedPosts])

  const trends = useMemo(
    () =>
      buildTrends({
        posts: watchedPosts,
        assignments: cluster.assignments,
        now: state.clock,
        windowHours: state.windowHours,
        performance: state.performance,
      }),
    [watchedPosts, cluster, state.clock, state.windowHours, state.performance],
  )

  // First load: populate the queue and the metrics page with demo history.
  useEffect(() => {
    if (state.seeded || state.drafts.length > 0 || !trends.length) return
    const drafts = buildSeedDrafts(trends, state.clock)
    dispatch({ type: 'seed', drafts, performance: buildSeedPerformance(drafts) })
  }, [state.seeded, state.drafts.length, state.clock, trends])

  const addAccount = useCallback(
    (handle: string, category: Account['category'], followers: number) => {
      const clean = handle.replace(/^@/, '').trim()
      if (!clean) return
      if (state.accounts.some((a) => a.handle.toLowerCase() === clean.toLowerCase())) return
      const account: Account = {
        id: `u-${clean}`,
        handle: clean,
        name: clean,
        category,
        followers,
        qualified: category !== 'Media' && category !== 'Analyst / VC',
        bio: '用户手动加入的监控账号',
        affinities: ['growth-automation', 'build-in-public'],
        activity: 1,
        addedAt: state.clock,
      }
      dispatch({ type: 'addAccount', account, backfill: makeBackfill(account, state.clock) })
    },
    [state.clock, state.accounts],
  )

  const createDraft = useCallback(
    (draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>) => {
      seq.current += 1
      const id = `d${seq.current}-${Math.random().toString(36).slice(2, 7)}`
      dispatch({
        type: 'addDraft',
        draft: { ...draft, id, createdAt: state.clock, updatedAt: state.clock },
      })
      return id
    },
    [state.clock],
  )

  const publish = useCallback(
    (id: string) => {
      dispatch({ type: 'setStatus', id, status: 'published' })
      dispatch({ type: 'log', kind: 'publish', text: `已发布到 @telyclaw（模拟）`, at: state.clock })
      const draft = state.drafts.find((d) => d.id === id)
      if (!draft) return
      const trend = trends.find((t) => t.topicId === draft.topicId)
      window.setTimeout(() => {
        if (!trend) return
        const rand = Math.random
        const o = simulateOutcome(trend, draft, TELYCLAW_FOLLOWERS, rand)
        dispatch({
          type: 'measure',
          id,
          outcome: { ...o, measuredAt: state.clock + 15 * 60 * 1000 },
        })
      }, 1400)
    },
    [state.clock, state.drafts, trends],
  )

  const actions = useMemo(
    () => ({
      tick: (dt: number) => dispatch({ type: 'tick', dt }),
      setWindow: (hours: number) => dispatch({ type: 'setWindow', hours }),
      setLive: (live: boolean) => dispatch({ type: 'setLive', live }),
      removeAccount: (id: string) => dispatch({ type: 'removeAccount', id }),
      addAccount,
      createDraft,
      setDraftText: (id: string, text: string, editRatio: number) =>
        dispatch({ type: 'setDraftText', id, text, editRatio }),
      restyleDraft: (id: string, format: Draft['format'], text: string) =>
        dispatch({ type: 'restyleDraft', id, format, text }),
      setStatus: (id: string, status: Draft['status']) => dispatch({ type: 'setStatus', id, status }),
      publish,
      log: (kind: EventLogEntry['kind'], text: string) =>
        dispatch({ type: 'log', kind, text, at: state.clock }),
      reset: () => {
        localStorage.removeItem(STORAGE_KEY)
        dispatch({ type: 'reset' })
      },
    }),
    [addAccount, createDraft, publish, state.clock],
  )

  return { state, actions, posts: watchedPosts, trends, cluster }
}

export function engagementOf(postId: string, posts: ReturnType<typeof postsUntil>, now: number): number {
  const p = posts.find((x) => x.id === postId)
  return p ? postEngagement(p, now) : 0
}

export type Engine = ReturnType<typeof useEngine>

export function timeAgo(ms: number): string {
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export function clockLabel(clock: number): string {
  const d = new Date(clock)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}
