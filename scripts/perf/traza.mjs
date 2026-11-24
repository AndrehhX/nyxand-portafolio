// Traza de rendimiento de una sección: suma por tipo de evento y los eventos
// más largos (pintado, raster, GPU, etc.). Uso: node trace.mjs <url> <selector|->
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [URL, SEL] = process.argv.slice(2)
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9800
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const edge = spawn(EDGE, [
  '--window-position=-2600,0', '--no-first-run', '--no-default-browser-check', '--force_high_performance_gpu',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nyx-tr-'))}`,
  '--window-size=1920,1080', '--force-device-scale-factor=1', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', 'about:blank',
], { stdio: 'ignore' })
let t
for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === 'page') } catch {} }
const bws = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl
const page = new WebSocket(t.webSocketDebuggerUrl)
const browser = new WebSocket(bws)
await Promise.all([new Promise((r) => (page.onopen = r)), new Promise((r) => (browser.onopen = r))])
const mk = (ws) => { let id = 0; const pend = new Map(); const events = []; let done
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Tracing.dataCollected') events.push(...d.params.value); else if (d.method === 'Tracing.tracingComplete') done?.() }
  return { send: (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) }), events, complete: () => new Promise((r) => (done = r)) } }
const P = mk(page), B = mk(browser)
await P.send('Page.bringToFront')
await P.send('Page.navigate', { url: URL })
await sleep(5500)
if (SEL && SEL !== '-') await P.send('Runtime.evaluate', { expression: `window.scrollTo(0, document.querySelector(${JSON.stringify(SEL)}).getBoundingClientRect().top + scrollY - 60)` })
await sleep(1500)
await B.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc,gpu,viz,disabled-by-default-devtools.timeline.frame', transferMode: 'ReportEvents' })
let stop = false
const mover = (async () => { let a = 0; while (!stop) { a += 0.2; await P.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 900 + Math.cos(a) * 500, y: 520 + Math.sin(a) * 280 }); await sleep(16) } })()
await P.send('Runtime.evaluate', { awaitPromise: true, expression: `(async () => { const sc = setInterval(() => window.scrollBy(0, (Math.sin(performance.now() / 260) > 0 ? 1 : -1) * 18), 16); await new Promise(r => setTimeout(r, 3000)); clearInterval(sc) })()` })
stop = true; await mover
const fin = B.complete()
await B.send('Tracing.end')
await fin
const ev = B.events.filter((e) => e.ph === 'X' && e.dur)
const sum = {}
for (const e of ev) { sum[e.name] = (sum[e.name] || 0) + e.dur / 1000 }
console.log('--- total ms por tipo (top 18)')
Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log(k.padEnd(40), v.toFixed(0)))
console.log('--- eventos individuales > 30 ms')
ev.filter((e) => e.dur > 30000).sort((a, b) => b.dur - a.dur).slice(0, 14).forEach((e) => console.log((e.dur / 1000).toFixed(0).padStart(5), e.name, JSON.stringify(e.args?.data ?? {}).slice(0, 110)))
page.close(); browser.close(); edge.kill(); process.exit(0)
