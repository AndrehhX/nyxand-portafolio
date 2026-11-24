import gsap from 'gsap'

const NS = 'http://www.w3.org/2000/svg'

// Barra de progreso: un chorro de pintura lima que baja por el borde derecho
// conforme haces scroll. La punta se hincha cuando paras y tiembla al correr.
export function initProgress(getVelocity: () => number) {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('class', 'progress')
  svg.setAttribute('aria-hidden', 'true')
  // sin filtro goo: re-filtrar este SVG de pantalla completa en cada frame de
  // scroll costaba más que lo que aportaba (chorro + bulbo ya se leen bien)
  svg.innerHTML = `<rect x="5" y="-20" width="7" rx="3.5"/><circle cx="8.5" r="7"/>`
  document.body.appendChild(svg)
  const rect = svg.querySelector('rect')!
  const tip = svg.querySelector('circle')!
  let shown = 0
  let bulb = 7
  gsap.ticker.add(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    const p = max > 0 ? scrollY / max : 0
    const target = p * (innerHeight - 24)
    const v = Math.abs(getVelocity())
    if (Math.abs(target - shown) < 0.2 && v < 0.3 && Math.abs(bulb - 8) < 0.05) return
    shown += (target - shown) * 0.12
    bulb += ((v > 1 ? 5.2 : 8) - bulb) * 0.06
    rect.setAttribute('height', (shown + 20).toFixed(1))
    tip.setAttribute('cy', (shown + 2).toFixed(1))
    tip.setAttribute('r', bulb.toFixed(2))
    tip.setAttribute('cx', (8.5 + (v > 2 ? (Math.random() - 0.5) * 1.6 : 0)).toFixed(2))
  })
}

// Escribe "nyx" en cualquier parte: MELTDOWN de toda la página
export function initEasterEgg() {
  let buf = ''
  const toast = document.createElement('div')
  toast.className = 'meltdown'
  toast.setAttribute('role', 'status')
  toast.textContent = '[ MELTDOWN ]'
  document.body.appendChild(toast)
  addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return
    buf = (buf + e.key.toLowerCase()).slice(-3)
    if (buf !== 'nyx') return
    buf = ''
    dispatchEvent(new Event('nyx-melt'))
    gsap.timeline()
      .fromTo(toast, { autoAlpha: 0, scale: 2.4, rotate: -12 }, { autoAlpha: 1, scale: 1, rotate: -4, duration: 0.35, ease: 'back.out(2.5)' })
      // temblor en <main> (en <body> rompería todo lo position: fixed)
      .to('main', { x: () => (Math.random() - 0.5) * 12, duration: 0.05, repeat: 9, yoyo: true, ease: 'none' }, 0)
      .set('main', { clearProps: 'transform' })
      .to(toast, { autoAlpha: 0, y: 40, duration: 0.5, ease: 'power2.in' }, 2.2)
  })
}

// Panel de caso: borde izquierdo rasgado (distinto cada vez que abre) y la
// imagen se "revela" como foto en el cuarto oscuro
export function initCaseFx() {
  const panel = document.querySelector<HTMLElement>('.case__panel')!
  const root = document.getElementById('case')!
  const tear = () => {
    const pts: string[] = []
    const n = 34
    for (let i = 0; i <= n; i++) pts.push(`${(Math.random() * 18).toFixed(1)}px ${((i / n) * 100).toFixed(2)}%`)
    panel.style.clipPath = `polygon(100% 0, ${pts.join(', ')}, 100% 100%)`
  }
  tear()
  new MutationObserver(() => {
    if (!root.classList.contains('is-open')) return
    tear()
    const media = panel.querySelector<HTMLElement>('.case__img:not([hidden]), .case__shot:not([hidden])')
    if (media)
      gsap.fromTo(media,
        { filter: 'grayscale(1) contrast(4) brightness(2.4)', clipPath: 'inset(0 0 100% 0)' },
        { filter: 'grayscale(0) contrast(1) brightness(1)', clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.out', delay: 0.25, clearProps: 'filter' })
    gsap.from(panel.querySelectorAll('.case__num, .case__title, .case__lead, .case__grid > div, .case__links > *'), {
      y: 30, opacity: 0, duration: 0.7, stagger: 0.05, delay: 0.35, ease: 'expo.out',
    })
  }).observe(root, { attributes: true, attributeFilter: ['class'] })
}
