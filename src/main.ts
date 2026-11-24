import { signConsole } from './watermark'
import { lite } from './device'
import '@fontsource/jacquard-24/latin-400.css'
import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { buildFilm, initCase } from './film'
import { mountSigils } from './sigil'
import { initPhotos } from './interact'
import { initDrips } from './drips'
import { initDoodle } from './doodle'
import { initCaseFx, initEasterEgg, initProgress } from './extras'
import {
  buildTapes, buildTears, fitText, initClock, initCursor, initGrain, initMeltables, initSpray,
  scramble, scrambleIn, splitWords,
} from './fx'

gsap.registerPlugin(ScrollTrigger)
gsap.defaults({ ease: 'expo.out' })
ScrollTrigger.config({ ignoreMobileResize: true })
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = reduce ? null : new Lenis({ lerp: 0.08, wheelMultiplier: 0.9, touchMultiplier: 1.2 })
// las imágenes y fuentes cambian alturas: recalcular triggers al terminar de cargar
addEventListener('load', () => ScrollTrigger.refresh())
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

// Arranque por partes: la intro (y la carga del 3D) empiezan ya; el resto se
// monta en tareas cortas mientras corre el contador, sin congelar la página.
const yieldMain = () => new Promise<void>((r) => setTimeout(r, 0))
signConsole()
runIntro()
const booted = boot()

// Color del menú según la sección que tiene debajo (reemplaza al
// mix-blend-mode, que era caro sobre los canvas animados)
function initHudTheme() {
  const root = document.documentElement
  let dark = false
  let last = 0
  let trailing: number | undefined
  const check = (force = false) => {
    const now = performance.now()
    // revisa a lo mucho cada 120 ms mientras hay scroll y una vez más al parar
    clearTimeout(trailing)
    trailing = window.setTimeout(() => check(true), 140)
    if (!force && now - last < 120) return
    last = now
    const under = document.elementsFromPoint(innerWidth / 2, 30).find((e) => !e.closest('.hud, .cursor, .spray, .grain, .progress'))
    // en un corte cuenta su color de arriba o de abajo según dónde cae el menú
    const tear = under?.closest<HTMLElement>('.tear')
    let want: boolean
    if (tear) {
      const r = tear.getBoundingClientRect()
      want = (30 - r.top < r.height * 0.5 ? tear.dataset.from : tear.dataset.to) === 'paper'
    } else want = !!under?.closest('.paper')
    if (want !== dark) {
      dark = want
      root.classList.toggle('hud-dark', dark)
    }
  }
  addEventListener('scroll', () => check(), { passive: true })
  setTimeout(() => check(true), 500)
}
initHudTheme()

async function boot() {
  initGrain()
  initClock()
  initCursor()
  initCase(lenis)
  await yieldMain()
  buildTears()
  mountSigils()
  await yieldMain()
  buildTapes()
  if (!reduce) {
    initMelt()
    initSpray()
  }
  await yieldMain()
  initDrips(() => scrollFx.v, reduce)
  initDoodle(reduce)
  initCaseFx()
  if (!reduce) {
    initProgress(() => scrollFx.v)
    initEasterEgg()
  }
}

// ---------------------------------------------------------------
// Derretido global: los titulares chorrean más entre más rápido se
// hace scroll, y el reflejo del cromo corre con la página.
// La velocidad del scroll también inclina los titulares y acelera/voltea
// la marquesina.
const scrollFx = { v: 0, dir: 1 }
function initMelt() {
  const updateMelt = initMeltables()
  // títulos que se inclinan; sólo se tocan los que están en pantalla
  const skewed = [...document.querySelectorAll<HTMLElement>('.yo__title, .stack__title, .trabajo__head h2, .photos__head h3')]
  const io = new IntersectionObserver((ens) => ens.forEach((en) => {
    const el = en.target as HTMLElement
    if (en.isIntersecting) el.dataset.vis = '1'
    else {
      delete el.dataset.vis
      el.style.transform = ''
    }
  }))
  skewed.forEach((h) => io.observe(h))
  let cur = 0
  let target = 0
  let lastY = scrollY
  let skew = 0
  let lastSkew = ''
  addEventListener('scroll', () => {
    const v = scrollY - lastY
    lastY = scrollY
    target = Math.min(110, Math.abs(v) * 3.2)
    if (v) scrollFx.dir = v > 0 ? 1 : -1
    scrollFx.v = v
  }, { passive: true })
  let meltT = 0
  gsap.ticker.add((t) => {
    cur += (target - cur) * 0.12
    target *= 0.9
    scrollFx.v *= 0.9
    // Copias de columnas del texto cacheado a 24 Hz; sin re-filtrar SVG.
    if (t - meltT > 1 / 24) {
      meltT = t
      updateMelt(lite ? 0 : cur)
    }
    skew += (Math.max(-7, Math.min(7, scrollFx.v * 0.12)) - skew) * 0.15
    // La inclinación va DIRECTO en los títulos visibles. Antes era una variable
    // CSS en :root, y como las variables se heredan, cambiarla en cada frame
    // de scroll recalculaba estilos de TODA la página (la mitad del tiempo de
    // CPU se iba ahí). Con transform en 4 elementos lo resuelve la GPU.
    const s = Math.abs(skew) < 0.02 ? '0' : skew.toFixed(2)
    if (s !== lastSkew) {
      lastSkew = s
      for (const h of skewed) if (h.dataset.vis) h.style.transform = s === '0' ? '' : `skewY(${s}deg)`
    }
  })
}

// ---------------------------------------------------------------
// Intro: contador mientras carga el 3D → cortina → las letras caen → tag
async function runIntro() {
  const intro = document.querySelector<HTMLElement>('.intro')!
  const num = intro.querySelector<HTMLElement>('[data-count]')!
  const bar = intro.querySelector<HTMLElement>('.intro__bar i')!
  lenis?.stop()
  // si ya la viste en esta sesión, la intro es más corta
  let seen = false
  try {
    seen = sessionStorage.getItem('nyx-intro') === '1'
    sessionStorage.setItem('nyx-intro', '1')
  } catch {}
  const counter = { v: 0 }
  const counting = reduce
    ? Promise.resolve()
    : new Promise<void>((res) =>
        gsap.to(counter, {
          v: 100,
          duration: seen ? 0.5 : 1.6,
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
  if (!reduce) {
    document.querySelectorAll<HTMLElement>('.hero .corner, .hud__nav a, .hud__time').forEach((el, i) =>
      gsap.delayedCall(i * 0.08, () => scrambleIn(el, 700)),
    )
    gsap.from('.hero__status', { clipPath: 'inset(0 100% 0 0)', duration: 0.6, ease: 'steps(8)', delay: 0.4 })
  }
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
    .fromTo('.tag__meta', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'steps(12)' }, 0.7)
    .call(() => scrambleIn(document.querySelector('.tag__meta')!, 800), [], 0.7)
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
  wrap.dataset.photosReady = '1'
}

document.fonts.ready.then(async () => {
  await booted // los cortes y demás deben existir antes de animarlos
  fitText()
  await yieldMain()
  buildFilm() // los pósters usan Anton: dibujarlos con la fuente ya cargada
  await yieldMain()
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
  })

  // Titulares: cada línea se pinta con aerosol (barrido + niebla lima que
  // se asienta) y la línea marcada se "pega" como cinta
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 82%' } })
    el.querySelectorAll<HTMLElement>('.line').forEach((line, i) => {
      if (line.classList.contains('h-graf--ink')) {
        tl.fromTo(line, { scaleX: 0, transformOrigin: '0% 50%', rotate: -8 }, { scaleX: 1, rotate: -2, duration: 0.5, ease: 'back.out(2.2)' }, i * 0.28)
      } else {
        const glow = line.querySelector('.melt__glow')
        tl.fromTo(line,
          { clipPath: 'inset(-40% 100% -60% -5%)', ...(glow ? {} : { textShadow: '0 0 30px rgba(200,243,29,.95)' }) },
          { clipPath: 'inset(-40% -5% -60% -5%)', ...(glow ? {} : { textShadow: '0 0 0px rgba(200,243,29,0)' }), duration: 1.1, ease: 'power2.inOut' },
          i * 0.28)
        // La niebla también está cacheada: la entrada sólo cambia opacidad.
        if (glow) tl.fromTo(glow, { opacity: 1 }, { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, i * 0.28)
      }
    })
  })
  // Lima suelto (subtítulos graffiti fuera de data-reveal)
  gsap.utils.toArray<HTMLElement>('.h-graf--lime').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(-30% 100% -30% -5%)' }, {
      clipPath: 'inset(-30% -5% -30% -5%)', duration: 1.1, ease: 'power2.inOut',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    })
  })

  // Etiquetas técnicas: se decodifican al entrar
  gsap.utils.toArray<HTMLElement>('.label, .trabajo__hint, .photos__hint, .facts__l, .hablemos__quote').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => scrambleIn(el, 900) })
  })

  // Párrafos: palabra por palabra desde abajo, el resaltado lima se barre
  document.querySelectorAll<HTMLElement>('.yo__text p').forEach((p) => {
    const words = splitWords(p)
    gsap.from(words, {
      yPercent: 110, rotate: 6, duration: 0.7, ease: 'expo.out', stagger: 0.012,
      scrollTrigger: { trigger: p, start: 'top 85%' },
    })
  })
  gsap.from('.yo__text strong', {
    backgroundSize: '0% 100%', duration: 0.8, ease: 'power2.inOut', delay: 0.3,
    scrollTrigger: { trigger: '.yo__text', start: 'top 80%' },
  })

  // Números: cuentan con ruido hasta su valor
  document.querySelectorAll<HTMLElement>('.facts__n').forEach((n) => {
    const final = n.textContent!
    ScrollTrigger.create({
      trigger: n, start: 'top 88%', once: true,
      onEnter: () => {
        const o = { p: 0 }
        gsap.to(o, {
          p: 1, duration: 1.2, ease: 'power2.out',
          onUpdate: () => {
            n.textContent = o.p >= 1 ? final : [...final].map((c) => (/\d/.test(c) ? String((Math.random() * 10) | 0) : c)).join('')
          },
        })
      },
    })
  })

  // Links: se decodifican al pasar el cursor
  document.querySelectorAll<HTMLElement>('.hud__nav a, .hablemos__links a, .foot a, .case__close').forEach((a) =>
    a.addEventListener('pointerenter', () => scrambleIn(a, 350)),
  )

  // Correo: cada letra salta cuando pasas encima (onda)
  const mail = document.querySelector<HTMLElement>('.hablemos__mail')!
  const mailText = [...mail.childNodes].find((n) => n.nodeType === 3 && n.nodeValue!.trim()) as Text
  const chars = mailText.nodeValue!.trim()
  const wrap = document.createElement('span')
  wrap.className = 'mail__chars'
  wrap.innerHTML = [...chars].map((c) => `<span class="mc">${c}</span>`).join('')
  mailText.replaceWith(wrap)
  const mcs = wrap.querySelectorAll<HTMLElement>('.mc')
  mail.addEventListener('pointerenter', () => {
    gsap.fromTo(mcs, { y: 0 }, { y: -14, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1, stagger: 0.018 })
    gsap.fromTo(mcs, { color: '#c8f31d' }, { color: '#e7e4dc', duration: 0.6, stagger: 0.018 })
  })

  // Marquesina: sigue al scroll (dirección y velocidad)
  const mq = document.querySelector<HTMLElement>('.marquee__inner')!
  mq.style.animation = 'none'
  let mx = 0
  let mqOn = false
  let mqW = mq.scrollWidth / 2
  addEventListener('resize', () => (mqW = mq.scrollWidth / 2))
  new IntersectionObserver(([en]) => (mqOn = en.isIntersecting)).observe(mq)
  gsap.ticker.add(() => {
    if (!mqOn) return
    const w = mqW
    mx -= (1.1 + Math.abs(scrollFx.v) * 0.6) * scrollFx.dir
    if (mx <= -w) mx += w
    if (mx > 0) mx -= w
    mq.style.transform = `translate3d(${mx}px,0,0)`
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
        // opacity (compuesta en GPU) en vez de filter: brightness (repinta)
        f.style.opacity = String(Math.max(0.22, 1 - d / 100))
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
        f.style.opacity = ''
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
  // La extrusión (18 sombras sobre un texto gigante con filtro) se pinta UNA
  // vez. Antes se recalculaba en cada movimiento del mouse: repintaba el
  // título entero y le volvía a aplicar el derretido → los bajones de esta
  // sección. Ahora el efecto 3D lo da sólo la rotación del bloque, que la
  // hace la GPU sin repintar nada.
  const depth = 18
  const layers: string[] = []
  for (let i = 1; i <= depth; i++) {
    const c = i === depth ? 'var(--lime)' : i % 2 ? '#1d1d1b' : '#2a2a28'
    layers.push(`${(0.55 * i).toFixed(1)}px ${(1.15 * i).toFixed(1)}px 0 ${c}`)
  }
  el.style.setProperty('--ts', layers.join(','))

  let on = false
  new IntersectionObserver(([en]) => (on = en.isIntersecting)).observe(el)
  const draw = () => {
    if (!on || (Math.abs(m.tx - m.x) < 0.0005 && Math.abs(m.ty - m.y) < 0.0005)) return
    m.x += (m.tx - m.x) * 0.08
    m.y += (m.ty - m.y) * 0.08
    stage.style.transform = `rotateY(${(m.x * 22).toFixed(2)}deg) rotateX(${(-m.y * 16).toFixed(2)}deg)`
  }
  gsap.ticker.add(draw)
}
