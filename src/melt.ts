// El texto y la niebla se rasterizan al cargar la fuente o cambiar su tamaño.
// El derretido sólo copia columnas de esa imagen: no invalida filtros SVG.
export function cacheMelt(el: HTMLElement, seed: number): ((scale: number) => void) | null {
  const source = document.createElement('canvas')
  const canvas = document.createElement('canvas')
  const glow = document.createElement('canvas')
  const ink = source.getContext('2d')
  const out = canvas.getContext('2d')
  const fog = glow.getContext('2d')
  if (!ink || !out || !fog) return null

  canvas.className = 'melt__canvas'
  glow.className = 'melt__canvas melt__glow'
  canvas.setAttribute('aria-hidden', 'true')
  glow.setAttribute('aria-hidden', 'true')
  const text = document.createElement('span')
  text.className = 'melt__text'
  text.append(...el.childNodes)
  el.appendChild(text)

  // Misma familia de ruido por columnas que el feImage anterior, estable
  // entre frames. El desplazamiento vertical conserva su rango (~0.2–0.4s).
  let state = seed * 9301 + 49297
  const random = () => ((state = (state * 9301 + 49297) % 233280) / 233280)
  const knots = Array.from({ length: 90 }, random)
  const fine = Array.from({ length: 260 }, random)
  const shift = random()
  const smooth = (a: number[], t: number) => {
    const p = Math.max(0, Math.min(1, t)) * (a.length - 1)
    const i = Math.floor(p), f = p - i, s = f * f * (3 - 2 * f)
    return a[i] * (1 - s) + a[Math.min(i + 1, a.length - 1)] * s
  }
  let columns: { x: number; w: number; drop: number }[] = []
  let amount = 9
  let ready = false
  let queued = 0
  let dpr = 1
  let width = 0
  let height = 0

  const draw = () => {
    if (!ready) return
    out.clearRect(0, 0, canvas.width, canvas.height)
    for (const c of columns) {
      out.drawImage(source, c.x, 0, c.w, source.height,
        c.x, amount * c.drop * dpr, c.w, source.height)
    }
  }

  const rebuild = () => {
    queued = 0
    const w = el.clientWidth, h = el.clientHeight
    if (!w || !h) return
    const cs = getComputedStyle(el)
    dpr = Math.min(devicePixelRatio || 1, 2)
    const pad = Math.ceil(parseFloat(cs.fontSize) * 0.4)
    const extra = 100 // espacio para el scroll + hover + easter egg
    width = w; height = h

    // Un marcador de altura cero da la línea base real de CSS, sin adivinar
    // las métricas de Sedgwick ni medir un rectángulo inclinado en pantalla.
    const baseline = document.createElement('i')
    baseline.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
    text.prepend(baseline)
    const y = baseline.offsetTop
    baseline.remove()

    source.width = Math.ceil((w + pad * 2) * dpr)
    source.height = Math.ceil((h + pad * 2) * dpr)
    for (const c of [canvas, glow]) {
      c.width = source.width
      c.height = Math.ceil((h + pad * 2 + extra) * dpr)
      c.style.width = `${c.width / dpr}px`
      c.style.height = `${c.height / dpr}px`
      c.style.left = `${-pad}px`
      c.style.top = `${-pad}px`
    }
    const paint = (ctx: CanvasRenderingContext2D, mist: boolean) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = cs.textAlign === 'right' ? 'right' : 'left'
      ctx.fillStyle = mist ? '#c8f31d' : cs.color
      if (mist) { ctx.shadowColor = 'rgba(200,243,29,.95)'; ctx.shadowBlur = 30 * dpr }
      ctx.fillText(text.textContent!.trim(), pad + (ctx.textAlign === 'right' ? w : 0), pad + y)
    }
    paint(ink, false)
    paint(fog, true)
    columns = []
    const stripe = Math.max(1, Math.round(2 * dpr))
    for (let x = 0; x < source.width; x += stripe) {
      const u = ((x / dpr - pad) / w + shift) * 0.5
      const n = smooth(knots, u) * 0.75 + smooth(fine, u) * 0.25
      columns.push({ x, w: Math.min(stripe, source.width - x), drop: (0.5 + (n - 0.5) * 0.5) * 0.6 })
    }
    ready = true
    draw()
  }
  document.fonts.ready.then(() => {
    el.classList.add('melt--cached')
    el.append(glow, canvas)
    rebuild()
    new ResizeObserver(() => {
      if (el.clientWidth === width && el.clientHeight === height) return
      if (!queued) queued = requestAnimationFrame(rebuild)
    }).observe(el)
    addEventListener('resize', () => {
      if (!queued) queued = requestAnimationFrame(rebuild)
    })
  })
  return (scale) => { amount = scale; draw() }
}
