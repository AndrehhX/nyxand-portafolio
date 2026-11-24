// Chorreados realistas en los cortes: cada gota tiene cuello delgado y
// bulbo en la punta, crece por su peso, se estira, suelta una gota que cae
// acelerando y el chorro se recoge para volver a cargar. Brillo húmedo en
// la tinta. Con scroll rápido todo gotea más.
import gsap from 'gsap'

const NS = 'http://www.w3.org/2000/svg'

type Drip = {
  xN: number // posición horizontal normalizada
  w: number // ancho en la raíz (px)
  len: number
  max: number
  speed: number
  bulb: number
  body: SVGPathElement
  shine: SVGPathElement | null
}
type Drop = { el: SVGEllipseElement; x: number; y: number; vy: number; r: number; life: number }

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

export function initDrips(getVelocity: () => number, reduce: boolean) {
  document.querySelectorAll<HTMLElement & { _edge?: [number, number][] }>('.tear').forEach((tear, ti) => {
    const edge = tear._edge
    if (!edge) return
    const front = tear.querySelector<SVGSVGElement>('.tear__l--front')!
    const color = `var(--${tear.dataset.from})`
    const glossy = tear.dataset.from === 'ink'
    const r = rng(ti * 31 + 7)

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('class', 'tear__drips')
    svg.setAttribute('aria-hidden', 'true')
    tear.appendChild(svg)

    const count = Math.round(14 + r() * 8)
    const drips: Drip[] = []
    for (let i = 0; i < count; i++) {
      const body = document.createElementNS(NS, 'path')
      body.style.fill = color
      svg.appendChild(body)
      let shine: SVGPathElement | null = null
      if (glossy) {
        shine = document.createElementNS(NS, 'path')
        shine.setAttribute('class', 'tear__shine')
        svg.appendChild(shine)
      }
      const max = 26 + r() ** 1.8 * 150
      drips.push({
        xN: r(),
        w: 4 + r() * 12,
        len: max * (0.2 + r() * 0.6),
        max,
        speed: 0.08 + r() * 0.22,
        bulb: 1,
        body,
        shine,
      })
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
      // interpolación lineal sobre el borde rasgado
      let i = 0
      while (i < edge.length - 1 && edge[i + 1][0] < xN) i++
      const a = edge[i]
      const b = edge[Math.min(i + 1, edge.length - 1)]
      const t = b[0] === a[0] ? 0 : (xN - a[0]) / (b[0] - a[0])
      return a[1] + (b[1] - a[1]) * t
    }

    let visible = false
    new IntersectionObserver(([en]) => (visible = en.isIntersecting), { rootMargin: '200px' }).observe(tear)

    const draw = (d: Drip, sy: number) => {
      const x = d.xN * W
      const root = edgeY(d.xN) * H * sy
      const w = d.w
      const rB = Math.max(w * 0.42, 2.2) * d.bulb // bulbo
      const tip = root + d.len
      const neck = Math.max(w * 0.2, 1.1)
      const y0 = root - 10
      // raíz ancha que se funde con el borde → cuello → bulbo redondo
      d.body.setAttribute(
        'd',
        `M${x - w * 0.9} ${y0}` +
          ` C${x - w * 0.5} ${root + 2} ${x - neck} ${root + d.len * 0.25} ${x - neck} ${tip - rB * 1.6}` +
          ` C${x - neck} ${tip - rB * 1.1} ${x - rB} ${tip - rB * 1.2} ${x - rB} ${tip - rB * 0.35}` +
          ` A${rB} ${rB * 1.08} 0 1 0 ${x + rB} ${tip - rB * 0.35}` +
          ` C${x + rB} ${tip - rB * 1.2} ${x + neck} ${tip - rB * 1.1} ${x + neck} ${tip - rB * 1.6}` +
          ` C${x + neck} ${root + d.len * 0.25} ${x + w * 0.5} ${root + 2} ${x + w * 0.9} ${y0} Z`,
      )
      if (d.shine && d.len > 18) {
        const sx = x - neck * 0.35
        d.shine.setAttribute(
          'd',
          `M${sx} ${root + 6} L${sx} ${tip - rB * 1.8} M${x - rB * 0.45} ${tip - rB * 0.55} a${rB * 0.22} ${rB * 0.3} 0 1 0 0.1 0`,
        )
      }
    }

    gsap.ticker.add(() => {
      if (!visible || !W) return
      const sy = Number(gsap.getProperty(front, 'scaleY')) || 1
      const boost = 1 + Math.min(4, Math.abs(getVelocity()) * 0.08)
      drips.forEach((d) => {
        if (!reduce) {
          // más larga = más pesada = baja más rápido
          d.len += d.speed * boost * (0.4 + (d.len / d.max) * 1.4)
          d.bulb += (1 + (d.len / d.max) * 0.45 - d.bulb) * 0.05
          if (d.len >= d.max) {
            const x = d.xN * W
            const tip = edgeY(d.xN) * H * sy + d.len
            const rr = Math.max(d.w * 0.42, 2.2) * d.bulb
            const el = document.createElementNS(NS, 'ellipse')
            el.style.fill = color
            svg.appendChild(el)
            drops.push({ el, x, y: tip, vy: 0.6, r: rr, life: 0 })
            d.len = d.max * (0.45 + Math.random() * 0.2)
            d.bulb = 0.7
          }
        }
        draw(d, sy)
      })
      for (let i = drops.length - 1; i >= 0; i--) {
        const p = drops[i]
        p.vy += 0.35
        p.y += p.vy
        p.life++
        const stretch = 1 + Math.min(1.6, p.vy * 0.08)
        p.el.setAttribute('cx', p.x.toFixed(1))
        p.el.setAttribute('cy', p.y.toFixed(1))
        p.el.setAttribute('rx', (p.r / Math.sqrt(stretch)).toFixed(2))
        p.el.setAttribute('ry', (p.r * stretch).toFixed(2))
        if (p.y > H + 260 || p.life > 120) {
          p.el.remove()
          drops.splice(i, 1)
        }
      }
    })
  })
}
