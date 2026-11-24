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
import { buildTapes, buildTears, fitText, initClock, initCursor, initGrain, scramble } from './fx'

gsap.registerPlugin(ScrollTrigger)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = reduce ? null : new Lenis({ lerp: 0.085 })
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
initCase(lenis)
buildTapes()
if (!reduce) initMelt()
runIntro()

// ---------------------------------------------------------------
// Derretido global: los titulares chorrean más entre más rápido se
// hace scroll, y el reflejo del cromo corre con la página.
function initMelt() {
  const map = document.getElementById('melt-map')!
  const root = document.documentElement
  let cur = 0
  let target = 0
  let lastY = scrollY
  addEventListener('scroll', () => {
    const v = scrollY - lastY
    lastY = scrollY
    target = Math.min(110, Math.abs(v) * 3.2)
  }, { passive: true })
  let shown = -1
  gsap.ticker.add(() => {
    cur += (target - cur) * 0.12
    target *= 0.9
    const s = Math.round(10 + cur)
    if (s !== shown) {
      shown = s
      map.setAttribute('scale', String(s))
    }
    root.style.setProperty('--shine', `${((scrollY * 0.04) % 100).toFixed(1)}%`)
  })
}

// ---------------------------------------------------------------
// Intro: contador mientras carga el 3D → cortina → las letras caen → tag
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

  await gsap.to(intro, { clipPath: 'inset(0 0 100% 0)', duration: reduce ? 0 : 0.7, ease: 'expo.inOut' })
  intro.remove()
  lenis?.start()

  if (hero) await hero.drop()
  sprayTag()
  gsap.from('.corner, .hero__status', { opacity: 0, y: 12, stagger: 0.06, duration: 0.5 })
  initPhotoReel()
}

// El nombre se "pinta" como un tag de aerosol y luego chorrea
function sprayTag() {
  const name = document.querySelector<HTMLElement>('.tag__name')!
  const map = document.getElementById('melt-static-map')!
  const drip = { s: 0 }
  gsap.timeline()
    .fromTo(name, { clipPath: 'inset(-20% 100% -60% 0)' }, { clipPath: 'inset(-20% 0% -60% 0)', duration: 0.9, ease: 'power2.inOut' })
    .to(drip, { s: 34, duration: 2.4, ease: 'power2.out', onUpdate: () => map.setAttribute('scale', drip.s.toFixed(1)) }, 0.5)
    .from('.tag__meta', { opacity: 0, x: -20, duration: 0.4 }, 0.7)
}

// Carrusel de fotos WebGL (fallback: tira DOM con inercia)
async function initPhotoReel() {
  const wrap = document.querySelector<HTMLElement>('.photos')!
  const canvas = wrap.querySelector<HTMLCanvasElement>('.photos__gl')!
  const n = wrap.querySelector<HTMLElement>('[data-cap-n]')!
  const t = wrap.querySelector<HTMLElement>('[data-cap-t]')!
  const m = wrap.querySelector<HTMLElement>('[data-cap-m]')!
  try {
    const { initPhotos3D, PHOTOS } = await import('./photos3d')
    const ok = await initPhotos3D(canvas, (i) => {
      n.textContent = String(i + 1).padStart(2, '0')
      scramble(t, PHOTOS[i].t)
      scramble(m, PHOTOS[i].m)
      gsap.fromTo(n, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'expo.out' })
    }, reduce)
    if (!ok) throw new Error('sin WebGL')
  } catch (err) {
    console.error(err)
    wrap.classList.add('photos--fallback')
    initPhotos(reduce)
  }
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
  // Cortes: la hoja de arriba se encoge (se rompe hacia arriba), el sticker
  // lima se despega y los chorreados se estiran mientras pasa por pantalla
  gsap.utils.toArray<HTMLElement>('.tear').forEach((el) => {
    const st = { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
    gsap.fromTo(el.querySelectorAll('.tear__l--front, .tear__l--fiber'), { scaleY: 1.15 }, { scaleY: 0.55, ease: 'none', scrollTrigger: st })
    gsap.fromTo(el.querySelector('.tear__l--lime'), { scaleY: 1.2 }, { scaleY: 0.8, ease: 'none', scrollTrigger: st })
    gsap.fromTo(el.querySelector('.tear__l--drips'), { scaleY: 0.35 }, { scaleY: 1.25, ease: 'none', scrollTrigger: st })
  })

  // Titulares: cada línea cae como una placa en 3D
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el.querySelectorAll('.line'), {
      rotateX: -95,
      yPercent: 30,
      opacity: 0,
      transformOrigin: '50% 0%',
      stagger: 0.12,
      duration: 1.3,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 82%' },
    })
  })
  // El graffiti se "pinta" de izquierda a derecha
  gsap.utils.toArray<HTMLElement>('.h-graf').forEach((el) => {
    if (el.closest('.tag')) return
    gsap.fromTo(el, { clipPath: 'inset(-30% 100% -30% -5%)' }, {
      clipPath: 'inset(-30% -5% -30% -5%)',
      duration: 1.1,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    })
  })

  gsap.utils.toArray<SVGElement>('.sigil').forEach((s) => {
    gsap.fromTo(s, { rotateY: -70, rotateZ: -12, scale: 0.6, opacity: 0 }, {
      rotateY: 50, rotateZ: 8, scale: 1.05, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: s.parentElement!, start: 'top bottom', end: 'bottom top', scrub: 1 },
    })
  })

  gsap.utils.toArray<SVGPathElement | SVGCircleElement>('[data-draw]').forEach((p) => {
    const len = p.getTotalLength()
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len })
    gsap.to(p, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', scrollTrigger: { trigger: p.closest('svg')!, start: 'top 75%' } })
  })

  gsap.from('.facts li', {
    rotateY: 90, opacity: 0, transformOrigin: '0% 50%', stagger: 0.12, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: '.facts', start: 'top 85%' },
  })

  // La banda de fotos entra cortada en diagonal
  gsap.fromTo('.photos__stage', { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }, {
    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
    duration: 1.2,
    ease: 'expo.inOut',
    scrollTrigger: { trigger: '.photos__stage', start: 'top 80%' },
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
    return () => {
      track.style.transform = ''
      frames.forEach((f) => {
        f.style.transform = ''
        f.style.filter = ''
      })
    }
  })

  gsap.from('.tape', {
    y: -120, rotateX: 80, opacity: 0, stagger: 0.04, duration: 0.9, ease: 'back.out(1.6)',
    scrollTrigger: { trigger: '.tapes', start: 'top 80%' },
  })

  // HABLEMOS: placa que cae + extrusión que sigue al cursor
  gsap.from('.hablemos__big', {
    rotateX: -100, yPercent: 30, opacity: 0, transformOrigin: '50% 0%', duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.hablemos', start: 'top 65%' },
  })
  gsap.from('.hablemos__crazy', {
    scale: 2.2, rotate: -30, opacity: 0, duration: 0.9, ease: 'back.out(2)',
    scrollTrigger: { trigger: '.hablemos', start: 'top 55%' },
  })
  extrude()
}

// La extrusión vive en un ::before (detrás del cromo) vía --ts
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
    const depth = 16
    const dx = -m.x * 2.4 + 0.25
    const dy = -m.y * 2.4 + 0.5
    const layers: string[] = []
    for (let i = 1; i <= depth; i++) {
      const c = i === depth ? 'var(--lime)' : i % 2 ? '#1d1d1b' : '#2a2a28'
      layers.push(`${(dx * i).toFixed(1)}px ${(dy * i + i * 0.6).toFixed(1)}px 0 ${c}`)
    }
    el.style.setProperty('--ts', layers.join(','))
    stage.style.transform = `rotateY(${m.x * 16}deg) rotateX(${-m.y * 12}deg)`
  }
  gsap.ticker.add(draw)
}
