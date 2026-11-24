// Traza de rendimiento de una sección: suma por tipo de evento y los eventos
// más largos. Uso: node scripts/perf/traza.mjs <url> <selector|-> [JS previo]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [URL = 'http://localhost:5173/', SEL, SETUP] = process.argv.slice(2)
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9800
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const edge = spawn(EDGE, [
  '--window-position=-2600,0', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--force_high_performance_gpu',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nyx-tr-'))}`,
  '--window-size=1920,1080', '--force-device-scale-factor=1', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', 'about:blank',
], { stdio: 'ignore', windowsHide: true })
let t
for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === 'page') } catch {} }
const bws = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl
const page = new WebSocket(t.webSocketDebuggerUrl)
const browser = new WebSocket(bws)
await Promise.all([new Promise((r) => (page.onopen = r)), new Promise((r) => (browser.onopen = r))])
const mk = (ws) => { let id = 0; const pend = new Map(); const events = []; let done
  const listeners = new Map()
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Tracing.dataCollected') events.push(...d.params.value); else if (d.method === 'Tracing.tracingComplete') done?.(); else listeners.get(d.method)?.(d.params) }
  return { send: (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) }), events, on: (name, fn) => listeners.set(name, fn), complete: () => new Promise((r) => (done = r)) } }
const P = mk(page), B = mk(browser)
const cleanup = async () => {
  B.send('Browser.close').catch(() => {})
  await sleep(500)
  page.close(); browser.close(); edge.kill()
}
const interrupt = () => { cleanup().finally(() => process.exit(130)) }
process.once('SIGINT', interrupt)
try {
await P.send('Page.bringToFront')
await P.send('Page.navigate', { url: URL })
let ready = false
for (let i = 0; i < 120; i++) {
  const r = await P.send('Runtime.evaluate', { expression: process.env.READY_JS || `document.readyState === 'complete' && document.fonts.status === 'loaded' && !document.querySelector('.intro') && !!document.querySelector('[data-photos-ready="1"]')`, returnByValue: true })
  if (r.result?.result?.value) { ready = true; break }
  await sleep(500)
}
if (!ready) throw new Error('Arranque incompleto tras 60 s; traza descartada.')
await sleep(3000)
if (SEL && SEL !== '-') await P.send('Runtime.evaluate', { expression: `window.scrollTo(0, document.querySelector(${JSON.stringify(SEL)}).getBoundingClientRect().top + scrollY - 60)` })
await sleep(2500)
if (SETUP) {
  const setup = await P.send('Runtime.evaluate', { expression: SETUP, awaitPromise: true })
  if (setup.result?.exceptionDetails) throw new Error(JSON.stringify(setup.result.exceptionDetails))
  await sleep(500)
}
// LayerTree permite vincular Paint con un nodo DOM. No todos los RasterTask
// tienen backendNodeId: conservar la traza completa para seguir tile/layer_id.
let layers = new Map()
const paints = new Map()
P.on('LayerTree.layerTreeDidChange', ({ layers: next }) => {
  if (next) for (const layer of next) layers.set(layer.layerId, layer)
})
P.on('LayerTree.layerPainted', ({ layerId, clip }) => {
  const p = paints.get(layerId) || { count: 0, area: 0 }
  p.count++; p.area += clip.width * clip.height
  paints.set(layerId, p)
})
await P.send('DOM.enable')
await P.send('DOM.getDocument', { depth: 0 })
const layerStatus = await P.send('LayerTree.enable')
if (layerStatus.error) console.log('LayerTree no disponible:', layerStatus.error.message)
const categories = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink', 'cc', 'gpu', 'viz', 'disabled-by-default-devtools.timeline.frame']
// Instrumentación pesada sólo para atribución, nunca para comparar FPS.
if (process.env.DETAIL === '1') categories.push('disabled-by-default-devtools.timeline.invalidationTracking', 'disabled-by-default-devtools.timeline.layers', 'disabled-by-default-devtools.timeline.picture', 'disabled-by-default-cc.debug', 'disabled-by-default-gpu.service')
await B.send('Tracing.start', { categories: categories.join(','), transferMode: 'ReportEvents' })
let stop = false
const mover = (async () => { let a = 0; while (!stop) { a += 0.2; await P.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 900 + Math.cos(a) * 500, y: 520 + Math.sin(a) * 280 }); await sleep(16) } })()
await P.send('Runtime.evaluate', { awaitPromise: true, expression: `(async () => { const base = scrollY, start = performance.now(); const sc = setInterval(() => window.scrollTo(0, base + Math.sin((performance.now() - start) / 260) * 160), 16); await new Promise(r => setTimeout(r, 3000)); clearInterval(sc) })()` })
stop = true; await mover
const fin = B.complete()
await B.send('Tracing.end')
await fin
if (process.env.TRACE_OUT) {
  writeFileSync(process.env.TRACE_OUT, JSON.stringify({ traceEvents: B.events }))
  console.log('Traza:', process.env.TRACE_OUT)
}
const ev = B.events.filter((e) => e.ph === 'X' && e.dur)
const sum = {}
for (const e of ev) { sum[e.name] = (sum[e.name] || 0) + e.dur / 1000 }
console.log('--- total ms por tipo (top 18)')
Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log(k.padEnd(40), v.toFixed(0)))
console.log('--- eventos individuales > 30 ms')
ev.filter((e) => e.dur > 30000).sort((a, b) => b.dur - a.dur).slice(0, 14).forEach((e) => console.log((e.dur / 1000).toFixed(0).padStart(5), e.name, JSON.stringify(e.args?.data ?? {}).slice(0, 110)))
console.log('--- Paint por nodo (no equivale a área rasterizada)')
const nodes = new Map()
for (const e of ev.filter(e => e.name === 'Paint')) {
  const data = e.args?.data || {}
  const key = data.nodeId
  const n = nodes.get(key) || { node: data.nodeName, count: 0, ms: 0 }
  n.count++; n.ms += e.dur / 1000
  nodes.set(key, n)
}
for (const n of [...nodes.values()].sort((a, b) => b.ms - a.ms).slice(0, 15)) console.log(n.count, n.ms.toFixed(2), n.node)
console.log('--- RasterTask por layerId (CPU/envío; Flush puede esperar a GPU)')
const raster = new Map()
for (const e of ev.filter(e => e.name === 'RasterTask')) {
  const layer = e.args?.tileData?.layerId
  const r = raster.get(layer) || { count: 0, ms: 0, worst: 0 }
  r.count++; r.ms += e.dur / 1000; r.worst = Math.max(r.worst, e.dur / 1000)
  raster.set(layer, r)
}
for (const [id, r] of [...raster].sort((a, b) => b[1].ms - a[1].ms).slice(0, 15)) console.log(id, r.count, r.ms.toFixed(2), r.worst.toFixed(2))
console.log('--- capas repintadas (conteo, megapíxeles acumulados, nodo)')
if (!paints.size) console.log('Sin eventos layerPainted en este navegador; usar Paint por nodo y RasterTask de la traza.')
for (const [layerId, p] of [...paints].sort((a, b) => b[1].area - a[1].area).slice(0, 18)) {
  const layer = layers.get(layerId)
  let node = '?'
  if (layer?.backendNodeId) {
    const r = await P.send('DOM.describeNode', { backendNodeId: layer.backendNodeId })
    const n = r.result?.node
    if (n) node = `${n.nodeName} ${JSON.stringify(n.attributes || [])}`
  }
  console.log(layerId, p.count, (p.area / 1e6).toFixed(2), `${layer?.width}×${layer?.height}`, node)
}
} finally {
  process.off('SIGINT', interrupt)
  await cleanup()
}
process.exit(0)
