// Hero "NYXAND" en píxeles con dithering Bayer: se rompe con el cursor y glitchea solo.
type Px = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; heat: number }

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const PAPER = '#e7e4dc'
const LIME = '#c8f31d'

export function initPixelHero(canvas: HTMLCanvasElement, reduce: boolean) {
  const ctx = canvas.getContext('2d')!
  let W = 0
  let H = 0
  let cell = 10
  let px: Px[] = []
  let running = true
  let glitch: { y: number; h: number; dx: number; life: number } | null = null
  const mouse = { x: -9999, y: -9999, on: false }

  function build() {
    const r = canvas.getBoundingClientRect()
    W = r.width
    H = r.height
    // pestaña oculta o layout aún sin medir: reintentar en el siguiente frame
    if (W < 20 || H < 20) {
      requestAnimationFrame(build)
      return
    }
    const dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    cell = W < 600 ? 6 : W < 1100 ? 8 : 10
    const cols = Math.floor(W / cell)
    const rows = Math.floor(H / cell)

    // Render del texto a la resolución de la rejilla: cada píxel = una celda.
    const off = document.createElement('canvas')
    off.width = cols
    off.height = rows
    const o = off.getContext('2d', { willReadFrequently: true })!
    const lines = W < 700 ? ['NYX', 'AND'] : ['NYXAND']
    o.fillStyle = '#fff'
    o.font = '100px Anton, Impact, sans-serif'
    const m = o.measureText(lines[0])
    const asc = m.actualBoundingBoxAscent
    const th = asc + m.actualBoundingBoxDescent
    const gap = 0.06
    // dejar aire arriba (HUD + esquinas) y abajo (status)
    const padTop = Math.ceil((W < 700 ? 110 : 112) / cell)
    const padBot = Math.ceil((W < 700 ? 120 : 76) / cell)
    const blockH = rows - padTop - padBot
    const lineH = blockH / (lines.length + gap * (lines.length - 1))
    const targetW = cols * 0.94
    const sx = targetW / m.width
    const sy = lineH / th
    const top = padTop
    lines.forEach((t, i) => {
      o.save()
      o.translate((cols - targetW) / 2, top + i * lineH * (1 + gap))
      o.scale(sx, sy)
      o.fillText(t, 0, asc)
      o.restore()
    })

    const data = o.getImageData(0, 0, cols, rows).data
    const old = px
    px = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (data[(y * cols + x) * 4 + 3] < 128) continue
        // La parte baja de cada letra se disuelve con dithering: look de impresión rota.
        const ly = (y - top) / blockH
        const band = lines.length > 1 ? (ly * lines.length) % 1 : ly
        const density = 1 - Math.max(0, band - 0.62) * 2.1
        const t = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16
        if (density < t) continue
        const hx = x * cell
        const hy = y * cell
        const prev = old[px.length]
        const start = reduce
          ? { x: hx, y: hy }
          : prev
            ? { x: prev.x, y: prev.y }
            : { x: Math.random() * W, y: H + Math.random() * H * 0.6 }
        px.push({ hx, hy, x: start.x, y: start.y, vx: 0, vy: 0, heat: prev ? 0 : Math.random() })
      }
    }
    if (reduce) draw()
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    const s = cell > 7 ? cell - 2 : cell - 1
    const R = W < 600 ? 70 : 140
    const R2 = R * R
    const hot: Px[] = []

    if (!reduce) {
      if (!glitch && Math.random() < 0.025) {
        glitch = {
          y: Math.random() * H,
          h: cell * (2 + Math.random() * 7),
          dx: (Math.random() - 0.5) * cell * 14,
          life: 4 + Math.random() * 6,
        }
      }
      // chispas ambientales
      if (px.length && Math.random() < 0.3) px[(Math.random() * px.length) | 0].heat = 1
    }

    ctx.fillStyle = PAPER
    for (const p of px) {
      if (!reduce) {
        if (mouse.on) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const d2 = dx * dx + dy * dy
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const f = (1 - d / R) * 7
            p.vx += (dx / d) * f
            p.vy += (dy / d) * f
            p.heat = 1
          }
        }
        p.vx += (p.hx - p.x) * 0.055
        p.vy += (p.hy - p.y) * 0.055
        p.vx *= 0.8
        p.vy *= 0.8
        p.x += p.vx
        p.y += p.vy
        p.heat *= 0.955
      }
      let ox = 0
      if (glitch && p.hy >= glitch.y && p.hy < glitch.y + glitch.h) ox = glitch.dx
      if (p.heat > 0.2) hot.push(p)
      else ctx.fillRect(p.x + ox, p.y, s, s)
    }
    ctx.fillStyle = LIME
    for (const p of hot) ctx.fillRect(p.x, p.y, s, s)

    if (glitch && --glitch.life <= 0) glitch = null
  }

  function loop() {
    if (running) draw()
    requestAnimationFrame(loop)
  }

  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    mouse.x = e.clientX - r.left
    mouse.y = e.clientY - r.top
    mouse.on = mouse.y > 0 && mouse.y < r.height
  })
  document.addEventListener('pointerleave', () => (mouse.on = false))

  new IntersectionObserver(([en]) => (running = en.isIntersecting)).observe(canvas)

  let t: number | undefined
  let lastW = 0
  addEventListener('resize', () => {
    clearTimeout(t)
    t = window.setTimeout(() => {
      // en móvil la barra de URL cambia la altura: sólo reconstruir si cambia el ancho
      if (Math.abs(innerWidth - lastW) < 2) return
      lastW = innerWidth
      build()
    }, 150)
  })

  lastW = innerWidth
  build()
  if (!reduce) loop()
}
