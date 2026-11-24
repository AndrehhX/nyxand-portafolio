// Carrusel WebGL "Fuera del código": tira infinita de fotos en 1-bit que
// se arquea y se derrite según la velocidad del arrastre. Al pasar el
// cursor la foto se revela en escala de grises; la del centro gotea sola.
import * as THREE from 'three'

export const PHOTOS = [
  { src: '/media/tono-andreh.webp', t: 'ANDREH', m: 'IMG_0001 · GT' },
  { src: '/media/tono-cafe.webp', t: 'CAFÉ', m: 'IMG_0002 · V60' },
  { src: '/media/tono-circuitos.webp', t: 'PROTOBOARD', m: 'IMG_0003 · 74LS08' },
  { src: '/media/tono-codigo.webp', t: 'C A MANO', m: 'IMG_0004 · PAPEL → GCC' },
  { src: '/media/tono-laboratorio.webp', t: 'LAB', m: 'IMG_0005 · UNIVERSIDAD' },
]

const IMG_FRAC = 0.78 // parte del plano ocupada por la foto; el resto es espacio para los chorreados

const vert = /* glsl */ `
  uniform float uVel, uViewW;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    float nx = w.x / (uViewW * 0.5);
    w.y -= nx * nx * 70.0;                       // arco de la tira
    w.y += sin(uv.x * 3.14159) * uVel * 2.2;     // panza con la velocidad
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const frag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uImg, uPlane;
  uniform float uVel, uTime, uHover, uActive, uPx;
  varying vec2 vUv;

  float hash(float n){ return fract(sin(n) * 43758.5453); }
  float noise(float x){ float i = floor(x); float f = fract(x); f = f*f*(3.0-2.0*f); return mix(hash(i), hash(i+1.0), f); }
  float bayer4(vec2 p){
    p = mod(p, 4.0);
    int i = int(p.x) + int(p.y) * 4;
    float m[16];
    m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
    m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
    for(int k=0;k<16;k++){ if(k==i) return (m[k]+0.5)/16.0; }
    return 0.5;
  }
  float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

  vec2 cover(vec2 uv){
    vec2 box = vec2(uPlane.x, uPlane.y * ${IMG_FRAC.toFixed(2)});
    float rb = box.x / box.y, ri = uImg.x / uImg.y;
    vec2 s = rb > ri ? vec2(1.0, ri / rb) : vec2(rb / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  void main(){
    // coordenadas de la foto dentro del plano (arriba), con hueco abajo
    vec2 iuv = vec2(vUv.x, (vUv.y - (1.0 - ${IMG_FRAC.toFixed(2)})) / ${IMG_FRAC.toFixed(2)});

    // derretido por columnas: el contenido baja (se muestrea más arriba)
    float col = noise(vUv.x * 26.0 + floor(uTime * 0.0)) * 0.7 + noise(vUv.x * 61.0) * 0.3;
    float amt = min(abs(uVel) * 0.004, 0.14) + uActive * (0.05 + 0.03 * sin(uTime * 1.3 + vUv.x * 9.0)) + uHover * 0.04;
    float m = pow(col, 2.2) * amt * 2.2;
    iuv.y += m;

    if (iuv.y < 0.0 || iuv.y > 1.0) discard;

    float sh = clamp(uVel * 0.0016, -0.04, 0.04);
    float l = luma(texture2D(uTex, cover(iuv)).rgb);
    float l2 = luma(texture2D(uTex, cover(iuv + vec2(sh, 0.0))).rgb);
    l = smoothstep(0.08, 0.92, l);
    l2 = smoothstep(0.08, 0.92, l2);

    vec2 cell = floor(gl_FragCoord.xy / uPx);
    float t = bayer4(cell);
    vec3 ink = vec3(0.035);
    vec3 paper = vec3(0.906, 0.894, 0.863);
    vec3 lime = vec3(0.784, 0.953, 0.114);
    vec3 d = l > t ? paper : ink;
    if (l2 > t && l <= t) d = lime;            // fantasma lima al moverse
    vec3 photo = vec3(smoothstep(0.02, 0.98, l));
    vec3 c = mix(d, photo, uHover);

    // borde lima en la activa
    float edge = step(iuv.x, 0.006) + step(0.994, iuv.x) + step(0.996, iuv.y);
    c = mix(c, lime, clamp(edge, 0.0, 1.0) * uActive);

    gl_FragColor = vec4(c, 1.0);
  }
`

export async function initPhotos3D(
  canvas: HTMLCanvasElement,
  onActive: (i: number) => void,
  reduce: boolean,
): Promise<boolean> {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return false
  }
  const dpr = Math.min(devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(0x000000, 0)

  const loader = new THREE.TextureLoader()
  const textures = await Promise.all(PHOTOS.map((p) => loader.loadAsync(p.src)))

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100)
  const geo = new THREE.PlaneGeometry(1, 1, 48, 24)

  const items = textures.map((tex) => {
    const img = tex.image as { width: number; height: number }
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      uniforms: {
        uTex: { value: tex },
        uImg: { value: new THREE.Vector2(img.width, img.height) },
        uPlane: { value: new THREE.Vector2(1, 1) },
        uVel: { value: 0 },
        uViewW: { value: 1 },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uActive: { value: 0 },
        uPx: { value: 3 * dpr },
      },
    })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
    return { mesh, mat, hover: 0, active: 0 }
  })

  let W = 0
  let H = 0
  let itemW = 300
  let itemH = 400
  let step = 340
  let total = 1700
  function resize() {
    const r = canvas.getBoundingClientRect()
    if (r.width < 10) return
    W = r.width
    H = r.height
    renderer.setSize(W, H, false)
    camera.left = -W / 2
    camera.right = W / 2
    camera.top = H / 2
    camera.bottom = -H / 2
    camera.updateProjectionMatrix()
    itemW = W < 700 ? W * 0.64 : Math.min(W * 0.25, 400)
    itemH = Math.min(itemW * 1.33, H * 0.72) / IMG_FRAC
    step = itemW * 1.1
    total = step * items.length
    items.forEach(({ mesh, mat }) => {
      mesh.scale.set(itemW, itemH, 1)
      mat.uniforms.uPlane.value.set(itemW, itemH)
      mat.uniforms.uViewW.value = W
    })
  }
  resize()
  addEventListener('resize', resize)

  // ---- interacción ----
  let pos = 0
  let vel = 0
  let dragging = false
  let lastX = 0
  let idle = performance.now()
  let pointerX = -1e4
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true
    lastX = e.clientX
    vel = 0
    canvas.setPointerCapture(e.pointerId)
    canvas.classList.add('is-drag')
  })
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    pointerX = e.clientX - r.left - W / 2
    if (!dragging) return
    const dx = e.clientX - lastX
    lastX = e.clientX
    pos += dx
    vel = vel * 0.5 + dx * 0.5
  })
  const end = () => {
    dragging = false
    idle = performance.now()
    canvas.classList.remove('is-drag')
  }
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointercancel', end)
  canvas.addEventListener('pointerleave', () => (pointerX = -1e4))

  let visible = false
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(canvas)

  const clock = new THREE.Clock()
  let lastActive = -1
  const wrap = (x: number) => ((((x + total / 2) % total) + total) % total) - total / 2

  function frame() {
    requestAnimationFrame(frame)
    if (!visible) return
    const t = clock.getElapsedTime()
    if (!dragging) {
      if (!reduce && performance.now() - idle > 1500) vel += (-0.7 - vel) * 0.02
      pos += vel
      vel *= 0.95
    }
    let best = 1e9
    let activeIdx = 0
    items.forEach((it, i) => {
      const x = wrap(i * step + pos)
      // centra la foto (no el plano, que incluye espacio para chorrear)
      it.mesh.position.set(x, 30 - itemH * (1 - IMG_FRAC) * 0.5, 0)
      it.mesh.rotation.z = -(x / W) * 0.12
      const d = Math.abs(x)
      if (d < best) {
        best = d
        activeIdx = i
      }
      const over = Math.abs(pointerX - x) < itemW / 2 && !dragging ? 1 : 0
      it.hover += (over - it.hover) * 0.12
      it.mat.uniforms.uHover.value = it.hover
      it.mat.uniforms.uVel.value = Math.max(-40, Math.min(40, vel))
      it.mat.uniforms.uTime.value = t
    })
    items.forEach((it, i) => {
      it.active += ((i === activeIdx ? 1 : 0) - it.active) * 0.1
      it.mat.uniforms.uActive.value = it.active
    })
    if (activeIdx !== lastActive) {
      lastActive = activeIdx
      onActive(activeIdx)
    }
    renderer.render(scene, camera)
  }
  frame()
  return true
}
