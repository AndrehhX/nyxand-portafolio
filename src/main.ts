import '@fontsource/grenze-gotisch/400.css'
import '@fontsource/grenze-gotisch/900.css'
import '@fontsource/jacquard-24/400.css'
import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { buildFilm, initCase } from './film'
import { mountSigils } from './sigil'
import { initPhotos } from './interact'
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
mountSigils()
initCursor()
splitChars()
initCase(lenis)
buildTapes()

initPhotos(reduce)
runIntro()

// Intro: contador mientras carga el 3D → cortina → las letras caen → stickers
async function runIntro() {
  const intro = document.querySelector<HTMLElement>('.intro')!
  const num = intro.querySelector<HTMLElement>('[data-count]')!
  const bar = intro.querySelector<HTMLElement>('.intro__bar i')!
  lenis?.stop()
  const counter = { v: 0 }
  const counting = reduce
    ? Promise.resolve()
    : new Promise<void>((res) =>
        gsap.to(counter, {
          v: 100,
          duration: 1.6,
          ease: 'power2.inOut',
          onUpdate: () => {
            num.textContent = String(Math.round(counter.v)).padStart(3, '0')
            bar.style.transform = `scaleX(${counter.v / 100})`
          },
          onComplete: res,
        }),
      )
  if (!reduce) gsap.from('.intro__log span', { opacity: 0, x: -10, stagger: 0.25, duration: 0.2 })

  // three.js + opentype van en un chunk aparte para que el resto cargue primero
  const heroP = import('./hero3d')
    .then(({ initHero3D }) => initHero3D(document.getElementById('hero-gl') as HTMLCanvasElement, reduce))
    .catch((err) => {
      console.error(err)
      return null
    })
  const [hero] = await Promise.all([heroP, counting])
  document.documentElement.classList.toggle('no-gl', !hero)

  await gsap.to(intro, {
    clipPath: 'inset(0 0 100% 0)',
    duration: reduce ? 0 : 0.7,
    ease: 'expo.inOut',
  })
  intro.remove()
  lenis?.start()

  if (hero) await hero.drop()
  gsap.from('.namebar', { scaleX: 0, duration: 0.5, ease: 'expo.out' })
  gsap.from('.namebar > span', { yPercent: 100, opacity: 0, stagger: 0.06, duration: 0.4, delay: 0.25 })
  gsap.from('.corner, .hero__status', { opacity: 0, y: 12, stagger: 0.06, duration: 0.5 })
}

document.fonts.ready.then(() => {
  fitText()
  buildFilm() // los pósters usan Anton: dibujarlos con la fuente ya cargada
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
  // (el transform de .print lo maneja el carrusel; aquí sólo translate/opacity)
  gsap.from('.print', {
    translate: '0px 180px',
    opacity: 0,
    stagger: 0.08,
    duration: 1.1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.photos', start: 'top 85%' },
  })

  // Titulares: cada línea cae como una placa en 3D
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el.querySelectorAll('.line'), {
      rotateX: -95,
      yPercent: 30,
      opacity: 0,
      transformOrigin: '50% 0%',
      stagger: 0.12,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 82%' },
    })
  })

  // Sigilos: entran girando en 3D y siguen rotando con el scroll
  gsap.utils.toArray<SVGElement>('.sigil').forEach((s) => {
    gsap.fromTo(
      s,
      { rotateY: -70, rotateZ: -12, scale: 0.6, opacity: 0 },
      {
        rotateY: 50,
        rotateZ: 8,
        scale: 1.05,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: s.parentElement!, start: 'top bottom', end: 'bottom top', scrub: 1 },
      },
    )
  })

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
    rotateY: 90,
    opacity: 0,
    transformOrigin: '0% 50%',
    stagger: 0.12,
    duration: 1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.facts', start: 'top 85%' },
  })

  // Carrete 3D: cilindro que gira con el scroll (desktop)
  const mm = gsap.matchMedia()
  mm.add('(min-width: 900px)', () => {
    const track = document.getElementById('film')!
    const frames = [...track.querySelectorAll<HTMLElement>('.frame')]
    const A = 30
    const fw = track.offsetWidth
    const R = fw / 2 / Math.tan(((A / 2) * Math.PI) / 180) + 8
    frames.forEach((f, i) => (f.style.transform = `rotateY(${i * A}deg) translateZ(${R}px)`))
    const state = { r: 0 }
    const paint = () => {
      track.style.transform = `translateZ(${-R}px) rotateX(-5deg) rotateY(${state.r}deg)`
      frames.forEach((f, i) => {
        const d = Math.abs(i * A + state.r)
        f.style.filter = `brightness(${Math.max(0.25, 1 - d / 110)})`
        f.classList.toggle('is-front', d < A / 2)
      })
    }
    paint()
    const total = (frames.length - 1) * A
    gsap.to(state, {
      r: -total,
      ease: 'none',
      onUpdate: paint,
      scrollTrigger: {
        trigger: '.trabajo',
        start: 'top top',
        end: () => '+=' + frames.length * 420,
        pin: true,
        scrub: 1,
        snap: { snapTo: 1 / (frames.length - 1), duration: 0.4, ease: 'power2.out' },
      },
    })
    gsap.to('.trabajo__bg', {
      xPercent: -35,
      ease: 'none',
      scrollTrigger: { trigger: '.trabajo', start: 'top top', end: () => '+=' + frames.length * 420, scrub: true },
    })
    return () => {
      track.style.transform = ''
      frames.forEach((f) => {
        f.style.transform = ''
        f.style.filter = ''
      })
    }
  })

  gsap.from('.tape', {
    y: -120,
    rotateX: 80,
    opacity: 0,
    stagger: 0.04,
    duration: 0.9,
    ease: 'back.out(1.6)',
    scrollTrigger: { trigger: '.tapes', start: 'top 80%' },
  })

  // HABLEMOS: letras que caen en 3D + extrusión que sigue al cursor
  gsap.from('.hablemos__big .ch', {
    rotateX: -110,
    yPercent: 40,
    opacity: 0,
    transformOrigin: '50% 0%',
    stagger: 0.05,
    duration: 1.3,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.hablemos', start: 'top 65%' },
  })
  gsap.from('.hablemos__crazy', {
    scale: 2.2,
    rotate: -30,
    opacity: 0,
    duration: 0.9,
    ease: 'back.out(2)',
    scrollTrigger: { trigger: '.hablemos', start: 'top 55%' },
  })
  extrude()
}

function extrude() {
  const el = document.querySelector<HTMLElement>('.hablemos__big')!
  const stage = document.querySelector<HTMLElement>('.hablemos__stage')!
  const m = { x: 0.3, y: 0.4, tx: 0.3, ty: 0.4 }
  addEventListener('pointermove', (e) => {
    m.tx = e.clientX / innerWidth - 0.5
    m.ty = e.clientY / innerHeight - 0.5
  })
  const draw = () => {
    m.x += (m.tx - m.x) * 0.08
    m.y += (m.ty - m.y) * 0.08
    const depth = 18
    const dx = -m.x * 2.4 + 0.25
    const dy = -m.y * 2.4 + 0.45
    const layers: string[] = []
    for (let i = 1; i <= depth; i++) {
      const c = i === depth ? 'var(--lime)' : i % 2 ? '#1d1d1b' : '#262624'
      layers.push(`${(dx * i).toFixed(1)}px ${(dy * i + i * 0.6).toFixed(1)}px 0 ${c}`)
    }
    el.style.textShadow = layers.join(',')
    stage.style.transform = `rotateY(${m.x * 18}deg) rotateX(${-m.y * 14}deg)`
  }
  gsap.ticker.add(draw)
}
