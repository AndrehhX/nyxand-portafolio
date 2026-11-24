import gsap from 'gsap'

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

// Bordes de tinta rasgada entre secciones, con chorreados.
export function buildTears() {
  document.querySelectorAll<HTMLElement>('.tear').forEach((el, idx) => {
    const from = el.dataset.from!
    const to = el.dataset.to!
    el.style.background = `var(--${from})`
    const W = 1000
    const H = 120
    const r = rng(idx * 13 + 5)
    let d = `M-20 ${H + 10} L-20 60`
    let x = -20
    while (x < W + 20) {
      x += 5 + r() * 20
      const y = 34 + r() * 46
      if (r() < 0.09) {
        // chorreado: la tinta de arriba cae dentro del color de abajo
        const w = 2 + r() * 5
        const depth = H - 4 - r() * 30
        d += ` L${x} ${y} L${x + w * 0.3} ${depth} Q${x + w / 2} ${depth + 6} ${x + w * 0.7} ${depth} L${x + w} ${y}`
        x += w
      } else {
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
      }
    }
    d += ` L${W + 20} ${H + 10} Z`
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="var(--${to})" filter="url(#rough)"/></svg>`
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

export function splitChars() {
  document.querySelectorAll<HTMLElement>('[data-chars]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent!.trim())
    el.innerHTML = [...el.textContent!.trim()]
      .map((ch) => `<span class="ch" aria-hidden="true">${ch}</span>`)
      .join('')
  })
}
