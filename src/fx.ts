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
const fillDown = (pts: [number, number][]) =>
  `M-30 -40 L${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} L${TW + 30} -40 Z`

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

    // chorreados del color de arriba
    let drips = ''
    for (let i = 0; i < 16; i++) {
      const p = front[Math.floor(r() * front.length)]
      const w = 4 + r() * 12
      const len = 30 + r() * 150
      const x = p[0]
      const y0 = 4
      const y1 = p[1] + len
      drips += `M${x - w / 2} ${y0} L${x - w / 2} ${y1 - w} Q${x - w / 2} ${y1 + w * 0.4} ${x} ${y1 + w * 0.5} Q${x + w / 2} ${y1 + w * 0.4} ${x + w / 2} ${y1 - w} L${x + w / 2} ${y0} Z `
    }

    const svg = (cls: string, d: string, fill: string, filter = 'url(#rough)') =>
      `<svg class="tear__l tear__l--${cls}" viewBox="0 0 ${TW} ${TH}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="${fill}" filter="${filter}"/></svg>`

    el.innerHTML =
      svg('back', fillDown(back), deep) +
      svg('lime', fillDown(lime), 'var(--lime)') +
      svg('fiber', fillDown(fiber), '#f4f2ec') +
      svg('front', fillDown(front), `var(--${from})`) +
      svg('drips', drips, `var(--${from})`, 'none')
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

export function splitChars() {
  document.querySelectorAll<HTMLElement>('[data-chars]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent!.trim())
    el.innerHTML = [...el.textContent!.trim()]
      .map((ch) => `<span class="ch" aria-hidden="true">${ch}</span>`)
      .join('')
  })
}
