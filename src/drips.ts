// Chorreados en los cortes, con física simple y filtro "goo" (metaballs):
// el borde, los chorros y las gotas se dibujan como formas simples y el
// filtro las funde en pintura líquida. Así la raíz se une orgánicamente al
// borde, la punta se hincha sola y cuando una gota se separa se ve el
// cuello estirarse y romperse, como pintura de verdad.
import gsap from 'gsap'
import { lite } from './device'

const NS = 'http://www.w3.org/2000/svg'

type Drip = {
  xN: number
  w: number // grosor del chorro (px)
  len: number
  max: number
  vel: number
  load: number // pintura acumulada en la punta (0..1)
  stem: SVGPathElement
  tip: SVGCircleElement
}
type Drop = { el: SVGEllipseElement; x: number; y: number; vy: number; r: number }

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

let gooReady = false
function ensureGoo() {
  if (gooReady) return
  gooReady = true
  const defs = document.querySelector('svg.defs')!
  defs.insertAdjacentHTML(
    'beforeend',
    `<filter id="goo" x="-20%" y="-20%" width="140%" height="160%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b"/>
      <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
    </filter>`,
  )
}

export function initDrips(getVelocity: () => number, reduce: boolean) {
  ensureGoo()
  document.querySelectorAll<HTMLElement & { _edge?: [number, number][] }>('.tear').forEach((tear, ti) => {
    const edge = tear._edge
    if (!edge) return
    const front = tear.querySelector<SVGSVGElement>('.tear__l--front')!
    const color = `var(--${tear.dataset.from})`
    const r = rng(ti * 31 + 7)

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('class', 'tear__drips')
    svg.setAttribute('aria-hidden', 'true')
    const g = document.createElementNS(NS, 'g')
    g.setAttribute('filter', 'url(#goo)')
    g.style.fill = color
    svg.appendChild(g)
    tear.appendChild(svg)

    // franja del borde dentro del goo: las raíces se funden con ella
    const band = document.createElementNS(NS, 'path')
    g.appendChild(band)

    const count = Math.round((lite ? 7 : 12) + r() * 6)
    const drips: Drip[] = []
    for (let i = 0; i < count; i++) {
      const thick = r() < 0.3
      // mínimo ~4.5px: con el blur del goo, más delgado desaparece
      const w = thick ? 9 + r() * 8 : 4.5 + r() * 3
      const max = (thick ? 70 : 25) + r() * (thick ? 120 : 70)
      const stem = document.createElementNS(NS, 'path')
      const tip = document.createElementNS(NS, 'circle')
      g.append(stem, tip)
      drips.push({ xN: 0.02 + r() * 0.96, w, len: max * r() * 0.8, max, vel: 0, load: r(), stem, tip })
    }
    const drops: Drop[] = []

    let W = 0
    let H = 0
    const size = () => {
      W = tear.clientWidth
      H = tear.clientHeight
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    }
    size()
    addEventListener('resize', size)

    const edgeY = (xN: number) => {
      let i = 0
      while (i < edge.length - 1 && edge[i + 1][0] < xN) i++
      const a = edge[i]
      const b = edge[Math.min(i + 1, edge.length - 1)]
      const t = b[0] === a[0] ? 0 : (xN - a[0]) / (b[0] - a[0])
      return a[1] + (b[1] - a[1]) * t
    }

    let visible = false
    new IntersectionObserver(([en]) => (visible = en.isIntersecting), { rootMargin: '150px' }).observe(tear)

    let lastSy = -1
    const drawBand = (sy: number) => {
      if (Math.abs(sy - lastSy) < 0.002 && lastSy > 0) return
      lastSy = sy
      const pts = edge.map(([x, y]) => `${(x * W).toFixed(1)} ${(y * H * sy - 3).toFixed(1)}`)
      band.setAttribute('d', `M${-20} ${-10} L${pts.join(' L')} L${W + 20} -10 Z`)
    }

    const tick = () => {
      if (!visible || !W) return
      const sy = Number(gsap.getProperty(front, 'scaleY')) || 1
      drawBand(sy)
      const boost = 1 + Math.min(5, Math.abs(getVelocity()) * 0.1)
      for (const d of drips) {
        if (!reduce) {
          // la pintura se acumula en la punta; más carga = más peso = baja más
          d.load = Math.min(1.2, d.load + 0.004 * boost)
          const accel = 0.022 * d.load * d.load * boost
          d.vel = d.vel * 0.94 + accel
          d.len += d.vel
          if (d.len > d.max) {
            // se desprende una gota: nace encima de la punta (el goo dibuja el cuello)
            const x = d.xN * W
            const root = edgeY(d.xN) * H * sy
            const rr = d.w * (0.55 + d.load * 0.25)
            const el = document.createElementNS(NS, 'ellipse')
            g.appendChild(el)
            drops.push({ el, x, y: root + d.len, vy: d.vel + 0.4, r: rr })
            d.len *= 0.55 + Math.random() * 0.15
            d.load = 0.15
            d.vel = 0
          }
        }
        const x = d.xN * W
        const root = edgeY(d.xN) * H * sy - 2
        const tipY = root + d.len
        const w = d.w
        // chorro que se adelgaza hacia abajo; la punta se infla con la carga
        d.stem.setAttribute(
          'd',
          `M${x - w * 0.75} ${root - 4} L${x + w * 0.75} ${root - 4} L${x + w * 0.38} ${tipY} L${x - w * 0.38} ${tipY} Z`,
        )
        d.tip.setAttribute('cx', x.toFixed(1))
        d.tip.setAttribute('cy', (tipY + w * 0.1).toFixed(1))
        d.tip.setAttribute('r', (w * (0.42 + d.load * 0.32)).toFixed(2))
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const p = drops[i]
        p.vy += 0.32
        p.y += p.vy
        const st = 1 + Math.min(1.2, p.vy * 0.06)
        p.el.setAttribute('cx', p.x.toFixed(1))
        p.el.setAttribute('cy', p.y.toFixed(1))
        p.el.setAttribute('rx', (p.r / Math.sqrt(st)).toFixed(2))
        p.el.setAttribute('ry', (p.r * st).toFixed(2))
        if (p.y > H + 320) {
          p.el.remove()
          drops.splice(i, 1)
        }
      }
    }
    if (lite || reduce) {
      // liviano: se dibujan una vez (con el goo) y se quedan quietas;
      // re-filtrar SVG en cada frame es caro en móviles y GPUs débiles
      const once = () => {
        if (!W) return requestAnimationFrame(once)
        visible = true
        drips.forEach((d) => (d.len = d.max * (0.5 + Math.random() * 0.45)))
        tick()
      }
      requestAnimationFrame(once)
      return
    }
    gsap.ticker.add(tick)
  })
}
