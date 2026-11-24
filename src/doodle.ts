// El monito se dibuja trazo por trazo como con plumón (velocidad irregular,
// sobretrazos) y después queda "vivo": línea que hierve a 12 fps como
// animación a mano, cabeza que cabecea de sueño, brazos tecleando, código
// que parpadea en la laptop y una gota de sudor de las 3am.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initDoodle(reduce: boolean) {
  const fig = document.querySelector<HTMLElement>('.doodle')
  if (!fig) return
  const svg = fig.querySelector<SVGSVGElement>('.doodle__svg')!
  const pens = [...svg.querySelectorAll<SVGPathElement>('[data-pen]')]
  const caption = fig.querySelector<HTMLElement>('figcaption')!

  // línea hirviendo
  const noise = document.getElementById('boil-noise')
  svg.querySelector('.doodle__ink')!.setAttribute('filter', 'url(#boil)')
  if (noise && !reduce) {
    let seed = 1
    setInterval(() => noise.setAttribute('seed', String((seed = (seed % 6) + 1))), 1000 / 12)
  }
  if (reduce) return

  pens.forEach((p) => {
    const len = p.getTotalLength()
    p.style.strokeDasharray = `${len}`
    p.style.strokeDashoffset = `${len}`
  })
  gsap.set(caption, { clipPath: 'inset(0 100% 0 0)' })
  gsap.set('.d-sweat', { opacity: 0 })

  const draw = gsap.timeline({ paused: true })
  let t = 0
  pens.forEach((p) => {
    const len = p.getTotalLength()
    // trazo humano: más largo = más tiempo, con pausas de "levantar el plumón"
    const d = 0.12 + len / 420
    draw.to(p, { strokeDashoffset: 0, duration: d, ease: 'power1.inOut' }, t)
    t += d * 0.85 + 0.04 + Math.random() * 0.08
  })
  draw.to(caption, { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'steps(14)' }, t - 0.4)
  draw.call(alive)

  ScrollTrigger.create({ trigger: fig, start: 'top 80%', once: true, onEnter: () => draw.play() })

  function alive() {
    // cabeceo de sueño (se le cae la cabeza y la levanta de golpe)
    gsap.timeline({ repeat: -1, repeatDelay: 1.4 })
      .to('.d-head', { rotate: 9, y: 3, transformOrigin: '50% 100%', duration: 1.6, ease: 'sine.in' })
      .to('.d-head', { rotate: -2, y: -2, duration: 0.12, ease: 'power3.out' })
      .to('.d-head', { rotate: 0, y: 0, duration: 0.3, ease: 'back.out(3)' })
    // tecleo
    gsap.to('.d-arm--a', { rotate: -5, transformOrigin: '0% 0%', duration: 0.09, repeat: -1, yoyo: true, ease: 'steps(1)' })
    gsap.to('.d-arm--b', { rotate: 4, transformOrigin: '0% 0%', duration: 0.11, repeat: -1, yoyo: true, ease: 'steps(1)', delay: 0.05 })
    // código que aparece y se borra en la pantalla
    gsap.timeline({ repeat: -1 })
      .to('.d-code', { opacity: 0, duration: 0.01, stagger: 0.25 })
      .to('.d-code', { opacity: 1, duration: 0.01, stagger: 0.25 }, '+=0.3')
    // gota de sudor: aparece, resbala, desaparece
    gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 1 })
      .fromTo('.d-sweat', { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.2 })
      .to('.d-sweat', { y: 22, duration: 1.1, ease: 'power2.in' })
      .to('.d-sweat', { opacity: 0, duration: 0.15 })
    // parpadeo
    gsap.timeline({ repeat: -1, repeatDelay: 2.6 })
      .to('.d-eye', { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.06 })
      .to('.d-eye', { scaleY: 1, duration: 0.08 })
  }
}
