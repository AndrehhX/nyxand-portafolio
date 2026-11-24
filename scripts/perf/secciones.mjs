// Perfil por sección: FPS + en qué se va el hilo principal (script, estilo,
// layout) mientras se hace scroll y se mueve el mouse. 1920×1080, GPU dedicada.
// Uso: node scripts/perf/secciones.mjs <url> [ventana] [escala] [JS de preparación]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

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
    '--window-position=-2600,0', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--force_high_performance_gpu',
    `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nyx-p2-'))}`,
    `--window-size=${WIN}`, `--force-device-scale-factor=${DSF}`, '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion', 'about:blank',
  ], { stdio: 'ignore', windowsHide: true })
  let t
  for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page') } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pend = new Map()
  let signalArmed
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } else if (d.method === 'Runtime.bindingCalled' && d.params.name === '__nyxPerfArmed') signalArmed?.() }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails))
    return r.result?.result?.value
  }
  const cleanup = async () => {
    // Browser.close cierra también el proceso real tras el relanzamiento.
    send('Browser.close').catch(() => {})
    await sleep(500)
    ws.close(); edge.kill()
  }
  const interrupt = () => { cleanup().finally(() => process.exit(130)) }
  process.once('SIGINT', interrupt)
  try {
  await send('Page.bringToFront')
  await send('Runtime.enable')
  await send('Performance.enable')
  await send('Page.navigate', { url: URL })
  // No mezclar la carga/compilación del 3D con el scroll que medimos.
  let ready = false
  for (let i = 0; i < 120; i++) {
    ready = await ev(process.env.READY_JS || `document.readyState === 'complete' && document.fonts.status === 'loaded' && !document.querySelector('.intro') && !!document.querySelector('[data-photos-ready="1"]')`)
    if (ready) break
    await sleep(500)
  }
  if (!ready) {
    throw new Error('Arranque incompleto tras 60 s; muestra descartada.')
  }
  await sleep(3000)
  const viewport = await ev('({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })')
  const gpu = await ev(`(() => { const g = document.createElement('canvas').getContext('webgl'); if (!g) return 'WebGL no disponible'; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?' })()`)
  if (sel) await ev(`window.scrollTo(0, document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().top + scrollY + (${JSON.stringify(sel)} === '.pin-spacer' ? 600 : -60))`)
  await sleep(2500)
  if (process.argv[5]) await ev(process.argv[5])
  await sleep(300)
  await send('Runtime.addBinding', { name: '__nyxPerfArmed' })
  const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map((m) => [m.name, m.value]))
  const initialY = await ev('scrollY')
  const sample = async () => {
  await ev(`window.scrollTo(0, ${initialY})`)
  const before = await metrics()
  let stop = false
  const armed = new Promise(r => { signalArmed = r })
  const measurement = ev(`(async () => {
    const loaf = []
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.duration < 45) return
      loaf.push({ d: Math.round(e.duration), block: Math.round(e.blockingDuration), sl: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
        scripts: e.scripts.slice(0, 3).map((s) => (s.sourceFunctionName || s.invoker || '?') + '@' + (s.sourceURL || '').split('/').pop().split('?')[0] + ' ' + Math.round(s.duration) + 'ms') })
    }))
    try { po.observe({ type: 'long-animation-frame', buffered: false }) } catch {}
    const d = []
    const t0 = await new Promise(requestAnimationFrame)
    let last = t0
    const baseY = scrollY
    const start = performance.now()
    // El puntero empieza sólo después de registrar observador y rAF base.
    window.__nyxPerfArmed('1')
    // Trayectoria relativa al inicio; idéntica entre A/B y sin deriva por jank.
    const sc = setInterval(() => window.scrollTo(0, baseY + Math.sin((performance.now() - start) / 260) * 160), 16)
    await new Promise((r) => { const f = (t) => { d.push(t - last); last = t; if (t - t0 < 2500) requestAnimationFrame(f); else r() }; requestAnimationFrame(f) })
    clearInterval(sc)
    d.sort((a, b) => a - b)
    po.disconnect()
    return { fps: Math.round(d.length * 1000 / (last - t0)), p50: +d[Math.floor(d.length * 0.5)].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), worst: +d[d.length - 1].toFixed(1), over33: d.filter(x => x >= 33).length, loaf }
  })()`)
  await Promise.race([armed, measurement.then(() => { throw new Error('No se recibió la señal de medición armada') })])
  signalArmed = undefined
  const mover = (async () => { let a = 0; while (!stop) { a += 0.2; await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 900 + Math.cos(a) * 500, y: 520 + Math.sin(a) * 280 }); await sleep(16) } })()
  const r = await measurement
  stop = true
  await mover
  const after = await metrics()
  const ms = (k) => Math.round((after[k] - before[k]) * 1000)
  return { ...r, script: ms('ScriptDuration'), style: ms('RecalcStyleDuration'), layout: ms('LayoutDuration'), task: ms('TaskDuration') }
  }
  const r = await sample()
  // Conservar la primera interacción y comparar con otra en la MISMA página.
  // No usar la muestra caliente para ocultar un tirón de la primera visita.
  const warm = process.env.COMPARE_WARM === '1' ? await sample() : undefined
  if (process.env.SCREENSHOT_OUT) {
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    const path = resolve(process.env.SCREENSHOT_OUT.replace('{port}', String(port)))
    writeFileSync(path, Buffer.from(shot.result.data, 'base64'))
    console.log('Captura (fuera de la muestra):', path)
  }
  return { gpu, viewport, ...r, ...(warm ? { warm } : {}) }
  } finally {
    process.off('SIGINT', interrupt)
    await cleanup()
  }
}

let port = 9700
let gpuShown = false
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null
const samples = Number(process.env.SAMPLES || 1)
if (!Number.isInteger(samples) || samples < 1 || samples > 20) throw new Error('SAMPLES debe ser un entero de 1 a 20')
let failed = false
for (let sample = 1; sample <= samples; sample++) {
for (const [name, sel] of SECTIONS.filter(([n]) => !ONLY || ONLY.some((o) => n.startsWith(o)))) {
  const { gpu, viewport, ...r } = await measure(sel, port++)
  if (!gpuShown) { console.log('GPU:', gpu, '| ventana', WIN, '@', DSF, '| viewport real', JSON.stringify(viewport)); gpuShown = true }
  console.log((samples > 1 ? `[${sample}/${samples}] ` : '') + name.padEnd(22), JSON.stringify(r))
  if (process.env.MAX_FRAME_MS && Math.max(r.worst, r.warm?.worst || 0) >= Number(process.env.MAX_FRAME_MS)) failed = true
}
}
process.exit(failed ? 1 : 0)
