import gsap from 'gsap'

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

// Cortes entre secciones: la página de arriba se rompe y deja ver capas de
// sticker roto (lima + negro/blanco) antes de la siguiente sección, con
// chorreados que cuelgan del borde. main.ts los anima con el scroll.
const TW = 1000
const TH = 240

function jag(r: () => number, base: number, amp: number, minStep = 6, maxStep = 26) {
  const pts: [number, number][] = []
  let x = -30
  let y = base
  while (x < TW + 30) {
    // caminata aleatoria + picos: borde de papel rasgado, no ruido uniforme
    y += (r() - 0.5) * amp * 0.9
    y += (base - y) * 0.25
    const spike = r() < 0.12 ? (r() - 0.3) * amp * 1.6 : 0
    pts.push([x, y + spike])
    x += minStep + r() * (maxStep - minStep)
  }
  return pts
}
// top: las capas de atrás arrancan dentro del corte para que su borde
// superior (rugoso por el filtro) nunca asome sobre la sección anterior
const fillDown = (pts: [number, number][], top = -40) =>
  `M-30 ${top} L${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} L${TW + 30} ${top} Z`

export function buildTears() {
  document.querySelectorAll<HTMLElement>('.tear').forEach((el, idx) => {
    const from = el.dataset.from!
    const to = el.dataset.to!
    el.style.background = `var(--${to})`
    const r = rng(idx * 17 + 3)
    const deep = from === 'ink' ? '#f1efe8' : '#000'

    const front = jag(r, TH * 0.3, 34)
    const fiber = front.map(([x, y]) => [x, y + 3 + r() * 7] as [number, number])
    const lime = jag(r, TH * 0.5, 40, 10, 40)
    const back = jag(r, TH * 0.7, 30, 8, 30)

    // el borde se guarda para que drips.ts cuelgue las gotas de él
    ;(el as HTMLElement & { _edge?: [number, number][] })._edge = front.map(([x, y]) => [x / TW, y / TH])

    const svg = (cls: string, d: string, fill: string, filter = 'url(#rough)') =>
      `<svg class="tear__l tear__l--${cls}" viewBox="0 0 ${TW} ${TH}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="${fill}" filter="${filter}"/></svg>`

    el.innerHTML =
      svg('back', fillDown(back, 30), deep) +
      svg('lime', fillDown(lime, 30), 'var(--lime)') +
      svg('fiber', fillDown(fiber, 20), '#f4f2ec') +
      svg('front', fillDown(front), `var(--${from})`)
  })
}

const TECHS = [
  'Python', 'TypeScript', 'React', 'Node.js', 'Next.js', 'Supabase', 'Rust',
  'Tauri', 'Kotlin', 'HTML y CSS', 'GSAP', 'Linux', 'Git', 'IA y automatización',
]

function tornClip(r: () => number) {
  const pts: string[] = []
  const n = 5
  for (let i = 0; i <= n; i++) pts.push(`${(r() * 4).toFixed(1)}% ${((i / n) * 100).toFixed(0)}%`)
  for (let i = n; i >= 0; i--) pts.push(`${(100 - r() * 4).toFixed(1)}% ${((i / n) * 100).toFixed(0)}%`)
  // el lado derecho va de abajo hacia arriba; reordenar para un polígono válido
  const left = pts.slice(0, n + 1)
  const right = pts.slice(n + 1)
  return `polygon(${[...left, ...right].join(',')})`
}

// Tiras de cinta arrastrables.
export function buildTapes() {
  const wrap = document.getElementById('tapes')!
  const r = rng(42)
  let z = 10
  TECHS.forEach((t, i) => {
    const el = document.createElement('div')
    el.className = 'tape'
    const kind = i === 4 ? 'lime' : i % 4 === 2 ? 'ink' : ''
    const rot = (r() - 0.5) * 12
    let x = 0
    let y = (r() - 0.5) * 14
    el.innerHTML = `<span class="tape__paper ${kind}" style="clip-path:${tornClip(r)}">${t}</span>`
    const apply = () => (el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`)
    apply()

    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId)
      el.style.zIndex = String(++z)
      el.classList.add('is-drag')
      const sx = e.clientX - x
      const sy = e.clientY - y
      const mv = (ev: PointerEvent) => {
        x = ev.clientX - sx
        y = ev.clientY - sy
        apply()
      }
      const up = () => {
        el.removeEventListener('pointermove', mv)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
        el.classList.remove('is-drag')
      }
      el.addEventListener('pointermove', mv)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
    })
    wrap.appendChild(el)
  })
}

export function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return
  document.documentElement.classList.add('has-cursor')
  const c = document.querySelector<HTMLElement>('.cursor')!
  const label = c.querySelector<HTMLElement>('.cursor__label')!
  gsap.set(c, { xPercent: -50, yPercent: -50 })
  const xTo = gsap.quickTo(c, 'x', { duration: 0.22, ease: 'power3' })
  const yTo = gsap.quickTo(c, 'y', { duration: 0.22, ease: 'power3' })
  addEventListener('pointermove', (e) => {
    xTo(e.clientX)
    yTo(e.clientY)
  })
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('[data-cursor], a, button, .tape')
    if (t) {
      label.textContent = t.classList.contains('tape') ? 'arrastrar' : t.dataset.cursor || 'click'
      c.classList.add('is-label')
    } else {
      c.classList.remove('is-label')
    }
  })
}

export function initGrain() {
  const c = document.createElement('canvas')
  c.width = c.height = 180
  const o = c.getContext('2d')!
  const img = o.createImageData(180, 180)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = (Math.random() * 70) | 0
  }
  o.putImageData(img, 0, 0)
  document.querySelector<HTMLElement>('.grain')!.style.backgroundImage = `url(${c.toDataURL()})`
}

export function initClock() {
  const els = document.querySelectorAll<HTMLElement>('[data-clock]')
  const fmt = new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const tick = () => els.forEach((e) => (e.textContent = fmt.format(new Date())))
  tick()
  setInterval(tick, 1000)
}

// Ajusta el texto para que llene exactamente el ancho de su contenedor.
export function fitText() {
  document.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
    el.style.fontSize = '100px'
    el.style.width = 'max-content'
    const w = el.getBoundingClientRect().width
    el.style.width = ''
    const avail = el.parentElement!.clientWidth - parseFloat(getComputedStyle(el.parentElement!).paddingLeft) * 2
    el.style.fontSize = `${(avail / w) * 100}px`
  })
}

// Cursor de aerosol: el puntero va soltando pintura (lima sobre negro,
// tinta sobre papel). Si te quedas quieto un momento, la pintura chorrea.
export function initSpray() {
  if (!matchMedia('(pointer: fine)').matches) return
  const c = document.createElement('canvas')
  c.className = 'spray'
  c.setAttribute('aria-hidden', 'true')
  c.style.display = 'none'
  document.body.appendChild(c)
  const o = c.getContext('2d')!
  let dpr = 1
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5)
    c.width = innerWidth * dpr
    c.height = innerHeight * dpr
    o.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  size()
  addEventListener('resize', size)

  type P = { x: number; y: number; y0: number; vy: number; r: number; life: number; max: number; drip: boolean; col: string }
  const ps: P[] = []
  let lx = 0
  let ly = 0
  let first = true
  let col = '#c8f31d'
  let still = 0
  let moves = 0
  let blocked: boolean | null = null
  let dirty = false
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5

  addEventListener('pointermove', (e) => {
    if (first) {
      lx = e.clientX
      ly = e.clientY
      first = false
      return
    }
    const sp = Math.min(1, Math.hypot(e.clientX - lx, e.clientY - ly) / 50)
    lx = e.clientX
    ly = e.clientY
    still = 0
    // el hit-test cuesta: sólo cada 4 movimientos
    if (++moves % 4 === 0 || blocked === null) {
      const el = document.elementFromPoint(lx, ly)
      blocked = !!el?.closest('.case, .hud, a, button')
      col = el?.closest('.paper') ? '#0b0b0a' : '#c8f31d'
    }
    if (blocked) return
    const n = 4 + Math.round(sp * 14)
    const spread = 5 + sp * 22
    for (let i = 0; i < n; i++) {
      ps.push({
        x: lx + gauss() * spread,
        y: ly + gauss() * spread,
        y0: 0, vy: 0,
        r: 0.9 + Math.random() * (2 + sp * 1.6),
        life: 0,
        max: 40 + Math.random() * 50,
        drip: false,
        col,
      })
    }
    if (ps.length > 900) ps.splice(0, ps.length - 900)
  })

  gsap.ticker.add(() => {
    // quieto = la pintura se acumula y chorrea
    still++
    if (!first && still > 14 && still < 50 && still % 12 === 0) {
      ps.push({ x: lx + gauss() * 10, y: ly + 4, y0: ly + 4, vy: 0.5 + Math.random() * 0.8, r: 1 + Math.random() * 1.4, life: 0, max: 100 + Math.random() * 50, drip: true, col })
    }
    // sin partículas el canvas se saca del render: un canvas de pantalla
    // completa, aunque esté vacío, se compone en cada frame
    if (!ps.length) {
      if (dirty) {
        o.clearRect(0, 0, c.width, c.height)
        c.style.display = 'none'
        dirty = false
      }
      return
    }
    if (!dirty) c.style.display = ''
    dirty = true
    o.clearRect(0, 0, c.width, c.height)
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.life++
      if (p.life > p.max) {
        ps.splice(i, 1)
        continue
      }
      const a = 1 - (p.life / p.max) ** 2
      o.globalAlpha = a
      o.fillStyle = p.col
      if (p.drip) {
        p.y += p.vy
        p.vy *= 0.985
        o.fillRect(p.x - p.r * 0.5, p.y0, p.r, p.y - p.y0)
        o.beginPath()
        o.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2)
        o.fill()
      } else {
        o.fillRect(p.x, p.y, p.r, p.r)
      }
    }
    o.globalAlpha = 1
  })
}

// Cada titular .melt tiene su propio filtro: se derrite con la velocidad
// del scroll (global) y además al pasarle el cursor encima.
// Ruido de columnas precalculado UNA vez en un canvas. Antes cada filtro
// usaba feTurbulence, que el navegador recalcula (en CPU) cada vez que cambia
// la escala del derretido: eso era lo que trababa el scroll.
let meltNoise = ''
function columnNoise() {
  if (meltNoise) return meltNoise
  const W = 512
  const H = 16
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const o = c.getContext('2d')!
  const img = o.createImageData(W, H)
  const knots = Array.from({ length: 90 }, () => Math.random())
  const fine = Array.from({ length: 260 }, () => Math.random())
  const smooth = (arr: number[], t: number) => {
    const x = t * (arr.length - 1)
    const i = Math.floor(x)
    const f = x - i
    const s = f * f * (3 - 2 * f)
    return arr[i] * (1 - s) + arr[Math.min(i + 1, arr.length - 1)] * s
  }
  for (let x = 0; x < W; x++) {
    const v = smooth(knots, x / W) * 0.75 + smooth(fine, x / W) * 0.25
    // rango y forma como feTurbulence (centrado en 0.5, ±0.25) y constante
    // en vertical: sólo columnas que bajan, nada de cortes horizontales
    const g = Math.round((0.5 + (v - 0.5) * 0.5) * 255)
    for (let y = 0; y < H; y++) {
      const p = (y * W + x) * 4
      img.data[p] = 128
      img.data[p + 1] = g
      img.data[p + 2] = 128
      img.data[p + 3] = 255
    }
  }
  o.putImageData(img, 0, 0)
  return (meltNoise = c.toDataURL())
}

export function initMeltables() {
  const defs = document.querySelector('svg.defs')!
  const NS = 'http://www.w3.org/2000/svg'
  const noise = columnNoise()
  const items = [...document.querySelectorAll<HTMLElement>('.melt')].map((el, i) => {
    const f = document.createElementNS(NS, 'filter')
    f.id = `melt-${i}`
    f.setAttribute('x', '-2%')
    f.setAttribute('y', '-10%')
    f.setAttribute('width', '104%')
    f.setAttribute('height', '170%')
    f.setAttribute('color-interpolation-filters', 'sRGB')
    f.innerHTML =
      `<feImage href="${noise}" preserveAspectRatio="none" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 -0.6 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1" result="m"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="m" scale="10" xChannelSelector="R" yChannelSelector="G"/>`
    defs.appendChild(f)
    const image = f.querySelector('feImage')!
    // cada título usa un tramo distinto del ruido
    const shift = Math.random()
    const fit = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      image.setAttribute('x', String(-shift * w))
      image.setAttribute('y', String(-h * 0.1))
      image.setAttribute('width', String(w * 2))
      image.setAttribute('height', String(h * 1.8))
    }
    fit()
    addEventListener('resize', fit)
    document.fonts.ready.then(fit)
    el.style.filter = `url(#melt-${i})`
    const map = f.querySelector('feDisplacementMap')!
    // data-melt-scroll="off": sólo se derrite con el cursor (títulos muy pesados)
    const scroll = el.dataset.meltScroll !== 'off'
    const it = { el, map, hover: 0, target: 0, shown: -1, scroll }
    el.addEventListener('pointerenter', () => (it.target = 70))
    el.addEventListener('pointerleave', () => (it.target = 0))
    return it
  })
  // easter egg: derrite todos los titulares a la vez
  addEventListener('nyx-melt', () => {
    items.forEach((it) => (it.target = 150))
    setTimeout(() => items.forEach((it) => (it.target = 0)), 2600)
  })
  return (velocity: number) => {
    items.forEach((it) => {
      it.hover += (it.target - it.hover) * (it.target ? 0.05 : 0.08)
      // en pasos de 3px: menos re-filtrados, el ojo no nota la diferencia
      const s = Math.round((10 + (it.scroll ? velocity : 0) + it.hover) / 3) * 3
      if (s !== it.shown) {
        it.shown = s
        it.map.setAttribute('scale', String(s))
      }
    })
  }
}

// Texto que se "decodifica" con glifos de ruido antes de asentarse
const NOISE = '▓▒░#/\\_01<>*'
const scrambling = new WeakMap<HTMLElement, number>()
export function scramble(el: HTMLElement, text: string, ms = 420) {
  cancelAnimationFrame(scrambling.get(el) ?? 0)
  const t0 = performance.now()
  const tick = () => {
    const p = Math.min(1, (performance.now() - t0) / ms)
    const fixed = Math.floor(text.length * p)
    el.textContent =
      text.slice(0, fixed) +
      [...text.slice(fixed)].map((c) => (c === ' ' ? ' ' : NOISE[(Math.random() * NOISE.length) | 0])).join('')
    if (p < 1) scrambling.set(el, requestAnimationFrame(tick))
  }
  tick()
}

// Scramble que respeta el marcado (<br>, <span>…): anima cada nodo de texto
export function scrambleIn(el: HTMLElement, ms = 600) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: { n: Text; t: string }[] = []
  while (walker.nextNode()) {
    const n = walker.currentNode as Text
    if (n.nodeValue && n.nodeValue.trim()) nodes.push({ n, t: n.nodeValue })
  }
  if (!nodes.length) return
  const key = el as HTMLElement & { _scr?: number }
  cancelAnimationFrame(key._scr ?? 0)
  const t0 = performance.now()
  const tick = () => {
    const p = Math.min(1, (performance.now() - t0) / ms)
    nodes.forEach(({ n, t }) => {
      const fixed = Math.floor(t.length * p)
      n.nodeValue = t.slice(0, fixed) + [...t.slice(fixed)].map((c) => (/\s/.test(c) ? c : NOISE[(Math.random() * NOISE.length) | 0])).join('')
    })
    if (p < 1) key._scr = requestAnimationFrame(tick)
  }
  tick()
}

// Parte un párrafo en palabras enmascaradas para revelarlas una por una
export function splitWords(el: HTMLElement) {
  const walk = (node: Node) => {
    ;[...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment()
        ch.nodeValue!.split(/(\s+)/).forEach((w) => {
          if (!w) return
          if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w))
          else {
            const o = document.createElement('span')
            o.className = 'w'
            const i = document.createElement('span')
            i.className = 'w__i'
            i.textContent = w
            o.appendChild(i)
            frag.appendChild(o)
          }
        })
        ch.replaceWith(frag)
      } else if (ch.nodeType === 1 && (ch as Element).tagName !== 'BR') walk(ch)
    })
  }
  walk(el)
  return el.querySelectorAll<HTMLElement>('.w__i')
}

export function splitChars() {
  document.querySelectorAll<HTMLElement>('[data-chars]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent!.trim())
    el.innerHTML = [...el.textContent!.trim()]
      .map((ch) => `<span class="ch" aria-hidden="true">${ch}</span>`)
      .join('')
  })
}
