// Generador procedural de sigilos (estilo cyber-sigilism / neo-tribal):
// trazos de bezier con perfil afilado, espinas barridas hacia la punta
// y simetría espejo. Cada semilla produce un emblema distinto.
type V = { x: number; y: number }

function rng(seed: number) {
  let s = (seed * 2654435761) % 4294967296
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function bez(p: V[], t: number): V {
  const u = 1 - t
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  }
}
function bezD(p: V[], t: number): V {
  const u = 1 - t
  return {
    x: 3 * u * u * (p[1].x - p[0].x) + 6 * u * t * (p[2].x - p[1].x) + 3 * t * t * (p[3].x - p[2].x),
    y: 3 * u * u * (p[1].y - p[0].y) + 6 * u * t * (p[2].y - p[1].y) + 3 * t * t * (p[3].y - p[2].y),
  }
}

function thorn(p: V[], maxT: number, r: () => number, spikiness: number): V[] {
  const N = 56
  const left: V[] = []
  const right: V[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const pt = bez(p, t)
    const d = bezD(p, t)
    const len = Math.hypot(d.x, d.y) || 1
    const tx = d.x / len
    const ty = d.y / len
    const nx = -ty
    const ny = tx
    const th = maxT * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9)
    left.push({ x: pt.x + nx * th, y: pt.y + ny * th })
    right.push({ x: pt.x - nx * th, y: pt.y - ny * th })
    if (i > 4 && i < N - 6 && i % 5 === 0 && r() < spikiness) {
      const s = r() < 0.5 ? 1 : -1
      const sl = th * (2.2 + r() * 4.5)
      let dx = nx * s + tx * (0.7 + r() * 0.6)
      let dy = ny * s + ty * (0.7 + r() * 0.6)
      const dl = Math.hypot(dx, dy)
      dx /= dl
      dy /= dl
      const base = { x: pt.x + nx * th * s, y: pt.y + ny * th * s }
      const tip = { x: base.x + dx * sl, y: base.y + dy * sl }
      ;(s > 0 ? left : right).push(tip, { x: pt.x + tx * th * 0.8 + nx * th * s, y: pt.y + ty * th * 0.8 + ny * th * s })
    }
  }
  return [...left, ...right.reverse()]
}

const toD = (pts: V[]) =>
  'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L') + 'Z'

export function sigil(seed: number, W = 400, H = 200, strokes = 4, spikiness = 0.55): string[] {
  const r = rng(seed)
  const cx = W / 2
  const cy = H / 2
  const paths: string[] = []
  const mirror = (pts: V[]) => pts.map((p) => ({ x: W - p.x, y: p.y }))

  // espina central vertical
  const spine: V[] = [
    { x: cx, y: H * 0.02 },
    { x: cx + (r() - 0.5) * W * 0.06, y: H * 0.35 },
    { x: cx + (r() - 0.5) * W * 0.06, y: H * 0.65 },
    { x: cx, y: H * 0.98 },
  ]
  paths.push(toD(thorn(spine, W * 0.018, r, 0)))

  for (let k = 0; k < strokes; k++) {
    const sy = cy + (r() - 0.5) * H * 0.5
    const ex = W * (0.02 + r() * 0.2)
    const ey = H * (0.05 + r() * 0.9)
    const p: V[] = [
      { x: cx - W * 0.01, y: sy },
      { x: cx - W * (0.12 + r() * 0.2), y: sy + (r() - 0.5) * H * 1.1 },
      { x: ex + W * (0.05 + r() * 0.2), y: ey + (r() - 0.5) * H * 0.9 },
      { x: ex, y: ey },
    ]
    const pts = thorn(p, H * (0.022 + r() * 0.03), r, spikiness)
    paths.push(toD(pts), toD(mirror(pts)))
  }
  return paths
}

// Rellena todos los <svg data-sigil="semilla"> del documento.
export function mountSigils() {
  document.querySelectorAll<SVGSVGElement>('svg[data-sigil]').forEach((svg) => {
    const seed = Number(svg.dataset.sigil) || 1
    const strokes = Number(svg.dataset.strokes) || 4
    svg.setAttribute('viewBox', '0 0 400 200')
    svg.setAttribute('aria-hidden', 'true')
    svg.innerHTML = sigil(seed, 400, 200, strokes).map((d) => `<path d="${d}"/>`).join('')
  })
}
