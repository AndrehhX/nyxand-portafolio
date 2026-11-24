import gsap from 'gsap'

// Carrusel de fotos: arrastre con inercia, rebote en bordes y
// tarjetas que se inclinan en 3D según la velocidad.
export function initPhotos(reduce: boolean) {
  const wrap = document.querySelector<HTMLElement>('.photos')
  if (!wrap) return
  const track = wrap.querySelector<HTMLElement>('.photos__track')!
  const prints = [...track.querySelectorAll<HTMLElement>('.print')]
  let x = 0
  let v = 0
  let dragging = false
  let lastX = 0
  let moved = 0
  let min = 0
  let dir = -1
  let idleSince = performance.now()
  const measure = () => (min = Math.min(0, wrap.clientWidth - track.scrollWidth))
  measure()
  addEventListener('resize', measure)

  wrap.addEventListener('pointerdown', (e) => {
    dragging = true
    moved = 0
    lastX = e.clientX
    v = 0
    wrap.setPointerCapture(e.pointerId)
    wrap.classList.add('is-drag')
  })
  wrap.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    lastX = e.clientX
    moved += Math.abs(dx)
    x += dx
    v = dx
  })
  const end = () => {
    dragging = false
    idleSince = performance.now()
    wrap.classList.remove('is-drag')
  }
  wrap.addEventListener('pointerup', end)
  wrap.addEventListener('pointercancel', end)

  let visible = false
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(wrap)

  gsap.ticker.add(() => {
    if (!visible) return
    if (!dragging) {
      // deriva lenta cuando nadie toca
      if (!reduce && performance.now() - idleSince > 1800 && Math.abs(v) < 0.6) {
        v += dir * 0.03
        v = Math.max(-0.8, Math.min(0.8, v))
        if (x <= min + 2) dir = 1
        if (x >= -2) dir = -1
      }
      x += v
      v *= 0.94
      if (x > 0) { x += -x * 0.15; v *= 0.5 }
      if (x < min) { x += (min - x) * 0.15; v *= 0.5 }
    }
    track.style.transform = `translate3d(${x}px,0,0)`
    const tilt = Math.max(-28, Math.min(28, -v * 1.6))
    prints.forEach((p) => (p.style.transform = `rotateY(${tilt}deg)`))
  })

  // evitar que un arrastre cuente como click
  wrap.addEventListener('click', (e) => { if (moved > 6) e.preventDefault() }, true)
}
