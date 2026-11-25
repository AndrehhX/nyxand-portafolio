import type Lenis from 'lenis'
import { projects, type Project } from './projects'

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const INK = [11, 11, 10]
const PAPER = [231, 228, 220]

// El gótico en mayúsculas no se lee: "MONO MOTION" → "Mono Motion"
const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

// "Fotografía" 1-bit generada: gradiente + glifo + dithering. Sin imágenes externas.
export function drawPoster(c: HTMLCanvasElement, p: Project, w = 176, h = 121) {
  c.width = w
  c.height = h
  const o = c.getContext('2d', { willReadFrequently: true })!
  const r = rng(p.seed)
  const g = o.createRadialGradient(w * (0.2 + r() * 0.6), h * (0.2 + r() * 0.6), 2, w / 2, h / 2, w * 0.85)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.55, '#777')
  g.addColorStop(1, '#000')
  o.fillStyle = g
  o.fillRect(0, 0, w, h)

  // rayas diagonales suaves
  o.globalAlpha = 0.18
  o.fillStyle = '#000'
  for (let i = -h; i < w; i += 9 + r() * 6) {
    o.beginPath()
    o.moveTo(i, 0)
    o.lineTo(i + 4, 0)
    o.lineTo(i + 4 + h, h)
    o.lineTo(i + h, h)
    o.fill()
  }
  o.globalAlpha = 1

  o.globalCompositeOperation = 'difference'
  o.fillStyle = '#fff'
  const size = p.glyph.length > 1 ? h * 0.9 : h * 1.15
  o.font = `${size}px Anton, "Noto Sans JP", sans-serif`
  o.textBaseline = 'middle'
  o.textAlign = 'center'
  o.fillText(p.glyph, w * (0.55 + (r() - 0.5) * 0.2), h * 0.54)
  o.globalCompositeOperation = 'source-over'

  const img = o.getImageData(0, 0, w, h)
  const d = img.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const lum = d[i] / 255
      const t = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16
      const col = lum > t ? PAPER : INK
      d[i] = col[0]
      d[i + 1] = col[1]
      d[i + 2] = col[2]
      d[i + 3] = 255
    }
  }
  o.putImageData(img, 0, 0)
}

export function buildFilm() {
  const track = document.getElementById('film')!
  const frames = projects
    .map(
      (p, i) => `
    <article class="frame">
      <div class="frame__edge"><span>NYX 100 PROFESSIONAL</span><span>▸ ${p.id}A</span></div>
      <button class="frame__shot" data-open="${i}" data-cursor="abrir caso">
        <span class="sr-only">Abrir caso ${titleCase(p.name)}:</span>
        ${p.img ? `<img src="${p.img}" alt="Captura de ${p.name}" loading="lazy" draggable="false" />` : '<canvas></canvas>'}
        <span class="frame__num">${p.id}</span>
        <span class="frame__status">${p.status.toUpperCase()}</span>
      </button>
      <div class="frame__quicklinks">${p.links
        .filter((l) => /plataforma|demo|c[oó]digo|repositorio/i.test(l.label))
        .slice(0, 2)
        .map((l) => {
          const label = /c[oó]digo|repositorio/i.test(l.label) ? 'CÓDIGO' : 'DEMO'
          return `<a href="${l.href}" target="_blank" rel="noopener" data-cursor="${label === 'DEMO' ? 'abrir demo' : 'ver código'}">${label} ↗</a>`
        })
        .join('')}</div>
      <div class="frame__meta">
        <h3 class="chrome">${titleCase(p.name)}</h3>
        <p>${p.kind}. ${p.desc}</p>
        <span>${p.stack.join(' · ')}</span>
      </div>
    </article>`,
    )
    .join('')

  // el último cuadro siempre es el siguiente número libre
  const next = String(projects.length + 1).padStart(2, '0')
  track.innerHTML =
    frames +
    `<article class="frame frame--end">
      <div class="frame__edge"><span>NYX 100 PROFESSIONAL</span><span>▸ ${next}A</span></div>
      <a class="frame__shot frame__shot--end" href="#hablemos" data-cursor="hablemos">
        <span>¿fotograma ${next}?</span>
        <em>puede ser el tuyo →</em>
      </a>
      <div class="frame__meta"><h3>TU PROYECTO</h3><p>Todavía sin revelar.</p></div>
    </article>`

  track.querySelectorAll<HTMLButtonElement>('.frame__shot[data-open]').forEach((b) => {
    const c = b.querySelector('canvas')
    if (c) drawPoster(c, projects[Number(b.dataset.open)])
  })
}

export function initCase(lenis: Lenis | null) {
  const root = document.getElementById('case')!
  const q = <T extends Element>(s: string) => root.querySelector<T>(s)!
  let lastFocus: HTMLElement | null = null

  function open(i: number) {
    const p = projects[i]
    q<HTMLElement>('.case__count').textContent = `[ CASO ${p.id} / ${String(projects.length).padStart(2, '0')} ]`
    q<HTMLElement>('.case__num').textContent = p.id
    q<HTMLElement>('.case__title').textContent = titleCase(p.name)
    q<HTMLElement>('.case__lead').textContent = p.long
    q<HTMLElement>('.case__status').textContent = p.status
    q<HTMLElement>('.case__kind').textContent = p.kind
    q<HTMLElement>('.case__stack').innerHTML = p.stack.map((s) => `<li>${s}</li>`).join('')
    q<HTMLElement>('.case__hl').innerHTML = p.highlights.map((h) => `<li>${h}</li>`).join('')
    q<HTMLElement>('.case__links').innerHTML = p.links.length
      ? p.links
          .map((l) => `<a href="${l.href}" target="_blank" rel="noopener" data-cursor="abrir">${l.label} ↗</a>`)
          .join('')
      : '<span class="case__soon">Links cuando salga del horno.</span>'
    const shot = q<HTMLCanvasElement>('.case__shot')
    const photo = q<HTMLImageElement>('.case__img')
    shot.hidden = !!p.img
    photo.hidden = !p.img
    if (p.img) {
      photo.src = p.img
      photo.alt = `Captura de ${p.name}`
    } else drawPoster(shot, p, 220, 120)

    q<HTMLElement>('.case__panel').scrollTop = 0 // cada caso abre desde arriba
    lastFocus = document.activeElement as HTMLElement
    root.classList.add('is-open')
    root.setAttribute('aria-hidden', 'false')
    lenis?.stop()
    q<HTMLElement>('.case__close').focus({ preventScroll: true })
  }

  function close() {
    if (!root.classList.contains('is-open')) return
    root.classList.remove('is-open')
    root.setAttribute('aria-hidden', 'true')
    lenis?.start()
    lastFocus?.focus({ preventScroll: true })
  }

  document.addEventListener('click', (e) => {
    const t = e.target as Element
    const btn = t.closest<HTMLElement>('[data-open]')
    if (btn) return open(Number(btn.dataset.open))
    if (t.closest('.case__close')) close()
  })
  q<HTMLElement>('.case__backdrop').addEventListener('click', close)
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-open')) {
      e.preventDefault()
      close()
    }
  })
}
