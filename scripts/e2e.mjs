/**
 * Headless smoke test over the Chrome DevTools Protocol.
 * Verifies the loop actually runs: generate -> edit -> approve -> publish -> measured outcome,
 * plus route rendering, window switching, account monitoring and the live clock.
 *
 * Usage: npm run preview  (in another shell)  then  node scripts/e2e.mjs
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333
const BASE = 'http://127.0.0.1:4173'

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.resolve('.tmp/chrome-profile')}`,
  `${BASE}/#/monitor`,
])

let target = null
for (let i = 0; i < 60; i++) {
  await sleep(250)
  try {
    const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
    target = list.find((t) => t.type === 'page' && t.url.includes('127.0.0.1:4173'))
    if (target) break
  } catch {}
}
if (!target) {
  console.error('FAIL: could not attach to Chrome')
  chrome.kill()
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res) => ws.addEventListener('open', res))

let msgId = 0
const pending = new Map()
const errors = []

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails?.exception?.description ?? 'exception')
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
})

function send(method, params = {}) {
  return new Promise((res) => {
    const mid = ++msgId
    pending.set(mid, res)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}

async function js(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.result?.exceptionDetails) {
    const d = r.result.exceptionDetails
    throw new Error(d.exception?.description ?? d.text)
  }
  return r.result?.result?.value
}

await send('Runtime.enable')
await send('Page.enable')
for (let i = 0; i < 40; i++) {
  if ((await js('document.readyState')) === 'complete') break
  await sleep(250)
}

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const CLICK = (label) => `(() => {
  const want = ${JSON.stringify(label.replace(/\s+/g, ''))};
  const els = [...document.querySelectorAll('button, .tab, .trend')];
  const el = els.find(e => (e.textContent || '').replace(/\\s+/g, '').includes(want));
  if (!el) return { ok: false, why: 'not found' };
  if (el.disabled) return { ok: false, why: 'disabled' };
  el.click();
  return { ok: true };
})()`

const TYPE = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return { ok: false, why: 'no input' };
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return { ok: true };
})()`

const body = () => js('document.body.innerText')

const CLICK_EXACT = (label) => `(() => {
  const el = [...document.querySelectorAll('button')].find(e => (e.textContent || '').trim() === ${JSON.stringify(label)});
  if (!el) return { ok: false, why: 'not found' };
  el.click();
  return { ok: true };
})()`

const editorValue = () => js(`document.querySelector('textarea.editor')?.value ?? null`)


// 1 - routes
for (const route of ['monitor', 'trends', 'opportunity', 'studio', 'review', 'analytics']) {
  await js(`location.hash = '#/${route}'`)
  await sleep(600)
  const len = await js('document.body.innerText.length')
  check(`route ${route}`, len > 500, `${len} chars`)
}

// 2 - studio: preview + generate
await js(`location.hash = '#/studio'`)
await sleep(500)
check('studio preview before generating', (await body()).includes('尚未生成'))

const gen = await js(CLICK('生成这条草稿'))
await sleep(800)
const hasEditor = await js(`!!document.querySelector('textarea.editor')`)
check('generate produces an editable draft', gen.ok && hasEditor, JSON.stringify(gen))

// 3 - human edit
const typed = await js(TYPE('textarea.editor', 'HUMAN EDIT: context window is not memory.'))
await sleep(400)
check('human edit tracked', typed.ok && (await body()).includes('改写率'), JSON.stringify(typed))

// 3b - format switch must restyle the live draft, not discard it
const beforeFmt = await editorValue()
const fmtSwitch = await js(CLICK_EXACT('Summary'))
await sleep(500)
const afterFmt = await editorValue()
check(
  'format switch keeps the draft',
  fmtSwitch.ok && !!afterFmt && afterFmt !== beforeFmt,
  `${beforeFmt?.length ?? 0} -> ${afterFmt?.length ?? 0} chars`,
)

// 3c - variant must change the text
const varClick = await js(CLICK_EXACT('+'))
await sleep(500)
const afterVar = await editorValue()
check('variant changes the text', varClick.ok && afterVar !== afterFmt, `${afterFmt?.length} -> ${afterVar?.length}`)

// 4 - approve
const ap = await js(CLICK('通过'))
await sleep(500)
check('approve', ap.ok, JSON.stringify(ap))

// 5 - publish + measured outcome
const pub = await js(CLICK('发布'))
await sleep(2800)
const txt = await body()
check('publish yields measured outcome', pub.ok && /QUALIFIED ENG/i.test(txt), JSON.stringify(pub))

// 6 - queue + north star
await js(`location.hash = '#/review'`)
await sleep(500)
const drafts = await js(`document.querySelectorAll('.draft').length`)
check('review queue lists drafts', drafts >= 6, `${drafts} drafts`)

await js(`location.hash = '#/analytics'`)
await sleep(500)
const ns = await js(`document.body.innerText.match(/每条内容的有效互动[\\s\\S]{0,40}/)?.[0] ?? ''`)
check('north star has a value', /\d/.test(ns), ns.replace(/\n/g, ' ').slice(0, 60))

// 7 - window switch changes scores
await js(`location.hash = '#/opportunity'`)
await sleep(400)
const s24 = await js(`document.querySelector('.score-big')?.textContent`)
const w = await js(CLICK('1H'))
await sleep(700)
const s1 = await js(`document.querySelector('.score-big')?.textContent`)
check('window switch recomputes', w.ok && s24 !== s1, `24h=${s24} 1h=${s1}`)

// 8 - add account
await js(`location.hash = '#/monitor'`)
await sleep(600)
const rowsBefore = await js(`document.querySelectorAll('.tbl tbody tr').length`)
const t = await js(TYPE('input[placeholder="@handle"]', '@newbuilder'))
await sleep(300)
const add = await js(CLICK('加入监控'))
await sleep(800)
const rowsAfter = await js(`document.querySelectorAll('.tbl tbody tr').length`)
check('add account', rowsBefore + 1 === rowsAfter, `${rowsBefore}->${rowsAfter} ${JSON.stringify(add)}${JSON.stringify(t)}`)

// 9 - live clock
const live = await js(CLICK('已暂停'))
await sleep(2400)
check('live mode runs', live.ok && (await body()).includes('实时'), JSON.stringify(live))

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '))

ws.close()
chrome.kill()

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
