import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { initPixelHero } from './pixelHero'
import { buildFilm, initCase } from './film'
import { buildTapes, buildTears, fitText, initClock, initCursor, initGrain, splitChars } from './fx'

gsap.registerPlugin(ScrollTrigger)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = reduce ? null : new Lenis({ lerp: 0.09 })
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const target = document.querySelector<HTMLElement>(a.getAttribute('href')!)
    if (!target) return
    e.preventDefault()
    if (lenis) lenis.scrollTo(target, { duration: 1.6 })
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }),
)

initGrain()
initClock()
buildTears()
initCursor()
splitChars()
buildFilm()
initCase(lenis)
buildTapes()

document.fonts.ready.then(() => {
  initPixelHero(document.getElementById('pixels') as HTMLCanvasElement, reduce)
  fitText()
  // Los pósters usan Anton: redibujar ahora que la fuente cargó.
  buildFilm()
  if (!reduce) animate()
  ScrollTrigger.refresh()
})

let rt: number | undefined
addEventListener('resize', () => {
  clearTimeout(rt)
  rt = window.setTimeout(() => {
    fitText()
    ScrollTrigger.refresh()
  }, 200)
})

function animate() {
  // Hero
  gsap.from('.hero__tag', { scale: 0.3, rotate: -40, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.6 })
  gsap.from('.corner, .hero__status', { opacity: 0, y: 12, stagger: 0.08, delay: 1, duration: 0.6 })
  gsap.to('.hero__tag', {
    yPercent: -80,
    rotate: -16,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })

  // Titulares por línea
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el.querySelectorAll('.line'), {
      yPercent: 70,
      skewY: 5,
      opacity: 0,
      stagger: 0.12,
      duration: 1.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 82%' },
    })
  })

  // Trazos de marcador que se dibujan
  gsap.utils.toArray<SVGPathElement | SVGCircleElement>('[data-draw]').forEach((p) => {
    const len = p.getTotalLength()
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len })
    gsap.to(p, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: p.closest('svg')!, start: 'top 75%' },
    })
  })

  gsap.from('.facts li', {
    y: 30,
    opacity: 0,
    stagger: 0.1,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.facts', start: 'top 85%' },
  })

  // Carrete horizontal (sólo desktop)
  const mm = gsap.matchMedia()
  mm.add('(min-width: 900px)', () => {
    const track = document.getElementById('film')!
    const dist = () => track.scrollWidth - innerWidth
    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.trabajo',
        start: 'top top',
        end: () => '+=' + dist(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    })
    gsap.to('.trabajo__bg', {
      xPercent: -35,
      ease: 'none',
      scrollTrigger: { trigger: '.trabajo', start: 'top top', end: () => '+=' + dist(), scrub: true },
    })
  })

  gsap.from('.tape', {
    y: -80,
    opacity: 0,
    stagger: 0.04,
    duration: 0.7,
    ease: 'back.out(2)',
    scrollTrigger: { trigger: '.tapes', start: 'top 80%' },
  })

  // Hablemos
  gsap.from('.hablemos__big .ch', {
    yPercent: 105,
    stagger: 0.04,
    duration: 1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.hablemos', start: 'top 65%' },
  })
  gsap.from('.hablemos__crazy', {
    scale: 1.8,
    rotate: -24,
    opacity: 0,
    duration: 0.8,
    ease: 'back.out(2)',
    scrollTrigger: { trigger: '.hablemos', start: 'top 55%' },
  })
}
