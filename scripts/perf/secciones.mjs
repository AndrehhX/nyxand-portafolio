// Perfil por sección: FPS + en qué se va el hilo principal (script, estilo,
// layout) mientras se hace scroll y se mueve el mouse. 1920×1080, GPU dedicada.
// Uso: node perf2.mjs <url> [ventana] [escala]
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = process.argv[2] || 'http://localhost:5173/'
const WIN = process.argv[3] || '1920,1080'
const DSF = process.argv[4] || '1'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SECTIONS = [
  ['hero', null],
  ['corte 1 + sobre mí', '#yo'],
  ['fotos (WebGL)', '.photos__stage'],
  ['trabajo (carrete)', '.pin-spacer'],
  ['stack', '#stack'],
  ['hablemos', '#hablemos'],
]

async function measure(sel, port) {
  const edge = spawn(EDGE, [
    '--window-position=-2600,0', '--no-first-run', '--no-default-browser-check', '--force_high_performance_gpu',
    `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nyx-p2-'))}`,
    `--window-size=${WIN}`, `--force-device-scale-factor=${DSF}`, '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion', 'about:blank',
  ], { stdio: 'ignore' })
  let t
  for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page') } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pend = new Map()
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
  await send('Page.bringToFront')
  await send('Performance.enable')
  await send('Page.navigate', { url: URL })
  await sleep(5500)
  const gpu = await ev(`(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?' })()`)
  if (sel) await ev(`window.scrollTo(0, document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().top + scrollY + (${JSON.stringify(sel)} === '.pin-spacer' ? 600 : -60))`)
  await sleep(1500)
  if (process.argv[5]) await ev(process.argv[5])
  await sleep(300)
  const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map((m) => [m.name, m.value]))
  const before = await metrics()
  let stop = false
  const mover = (async () => { let a = 0; while (!stop) { a += 0.2; await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 900 + Math.cos(a) * 500, y: 520 + Math.sin(a) * 280 }); await sleep(16) } })()
  const r = await ev(`(async () => {
    const loaf = []
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.duration < 45) return
      loaf.push({ d: Math.round(e.duration), block: Math.round(e.blockingDuration), sl: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
        scripts: e.scripts.slice(0, 3).map((s) => (s.sourceFunctionName || s.invoker || '?') + '@' + (s.sourceURL || '').split('/').pop().split('?')[0] + ' ' + Math.round(s.duration) + 'ms') })
    }))
    try { po.observe({ type: 'long-animation-frame', buffered: false }) } catch {}
    const d = []; let last = performance.now(); const t0 = last
    const sc = setInterval(() => window.scrollBy(0, (Math.sin(performance.now() / 260) > 0 ? 1 : -1) * 18), 16)
    await new Promise((r) => { const f = (t) => { d.push(t - last); last = t; if (t - t0 < 2500) requestAnimationFrame(f); else r() }; requestAnimationFrame(f) })
    clearInterval(sc)
    d.sort((a, b) => a - b)
    po.disconnect()
    return { fps: Math.round(d.length / 2.5), p50: +d[Math.floor(d.length * 0.5)].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), worst: +d[d.length - 1].toFixed(0), loaf }
  })()`)
  stop = true
  await mover
  const after = await metrics()
  const ms = (k) => Math.round((after[k] - before[k]) * 1000)
  ws.close(); edge.kill()
  await sleep(700)
  return { gpu, ...r, script: ms('ScriptDuration'), style: ms('RecalcStyleDuration'), layout: ms('LayoutDuration'), task: ms('TaskDuration') }
}

let port = 9700
let gpuShown = false
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null
for (const [name, sel] of SECTIONS.filter(([n]) => !ONLY || ONLY.some((o) => n.startsWith(o)))) {
  const { gpu, ...r } = await measure(sel, port++)
  if (!gpuShown) { console.log('GPU:', gpu, '| ventana', WIN, '@', DSF); gpuShown = true }
  console.log(name.padEnd(22), JSON.stringify(r))
}
process.exit(0)
