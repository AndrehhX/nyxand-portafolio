// Hero WebGL: "NyxAnd" en graffiti 3D de cromo con piercings, tramado a
// 1-bit sobre la foto de Andreh. El cursor abre una lente que revela el
// cromo real, mantener presionado derrite las letras, el scroll lo
// desintegra en píxeles y cada tanto hay ráfagas de glitch.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import gsap from 'gsap'
import opentype from 'opentype.js'
import fontUrl from '@fontsource/sedgwick-ave-display/files/sedgwick-ave-display-latin-400-normal.woff?url'

const PHOTO = '/media/tono-andreh.webp'

const HeroShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tPhoto: { value: null as THREE.Texture | null },
    uPhotoAspect: { value: 0.5625 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uLens: { value: 180 },
    uPixel: { value: 3 },
    uTime: { value: 0 },
    uGlitch: { value: 0.5 },
    uDis: { value: 0 },
    uFlash: { value: 0 },
    uPhotoOn: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tPhoto;
    uniform vec2 uRes, uMouse;
    uniform float uLens, uPixel, uTime, uGlitch, uDis, uFlash, uPhotoOn, uPhotoAspect;
    varying vec2 vUv;

    float hash(float n){ return fract(sin(n) * 43758.5453); }
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

    // "cover" de la foto, encuadrando la cara (≈40% desde arriba)
    vec2 coverUV(vec2 uv){
      float sa = uRes.x / uRes.y;
      vec2 p = uv;
      if (sa > uPhotoAspect) {
        float k = uPhotoAspect / sa;      // fracción vertical visible
        p.y = 0.60 - k * 0.5 + uv.y * k;  // centrado en la cara
        p.y = clamp(p.y, 0.0, 1.0);
      } else {
        float k = sa / uPhotoAspect;
        p.x = 0.5 - k * 0.5 + uv.x * k;
      }
      return p;
    }

    void main(){
      vec2 uv = vUv;
      float band = floor(uv.y * 46.0);
      float g = hash(band + floor(uTime * 9.0) * 13.1);
      if (g > 0.965 - uGlitch * 0.05) uv.x += (hash(band * 3.7 + uTime) - 0.5) * 0.09 * uGlitch;

      vec3 ink = vec3(0.035);
      vec3 paper = vec3(0.906, 0.894, 0.863);
      vec3 lime = vec3(0.784, 0.953, 0.114);

      vec2 cellP = floor(uv * uRes / uPixel);
      vec2 puv = (cellP * uPixel + uPixel * 0.5) / uRes;
      float t = bayer4(cellP);

      float dist = length((vUv - uMouse) * uRes);
      float lens = 1.0 - smoothstep(uLens - 2.0, uLens, dist);

      // foto tramada de fondo
      float pl = luma(texture2D(tPhoto, coverUV(puv)).rgb);
      pl = smoothstep(0.12, 0.85, pl);
      vec3 photoLo = mix(ink, vec3(0.19, 0.19, 0.18), uPhotoOn);
      vec3 bg = (pl > t ? photoLo : ink) * (1.0 - lens);

      // letras: 1-bit por defecto (con piso alto para que se lean),
      // la lente revela el cromo real
      vec4 sharp = texture2D(tDiffuse, uv);
      vec4 px = texture2D(tDiffuse, puv);
      float ll = 0.42 + 0.58 * smoothstep(0.0, 0.7, luma(px.rgb)) - uDis * 0.25;
      vec3 dl = ll > t ? (px.g > px.r * 1.25 ? lime : paper) : ink;
      vec3 letters = mix(dl, sharp.rgb, lens);
      float a = mix(px.a, sharp.a, lens);

      vec3 col = mix(bg, letters, step(0.5, a));

      float ring = smoothstep(uLens - 3.0, uLens, dist) - smoothstep(uLens, uLens + 3.0, dist);
      col = mix(col, lime, ring);
      vec2 r = abs((vUv - uMouse) * uRes);
      float cross = (step(r.x, 0.75) + step(r.y, 0.75)) * step(dist, 14.0);
      col = mix(col, lime, clamp(cross, 0.0, 1.0));

      col = mix(col, paper, uFlash);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

function studioEnv(pmrem: THREE.PMREMGenerator) {
  const s = new THREE.Scene()
  s.background = new THREE.Color(0x000000)
  const geo = new THREE.PlaneGeometry(1, 1)
  const strip = (hex: number, k: number, w: number, h: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }))
    m.scale.set(w, h, 1)
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    s.add(m)
  }
  strip(0xffffff, 6, 26, 1.4, [0, 7, 3])
  strip(0xffffff, 4, 1.3, 18, [-9, 0, 2])
  strip(0xffffff, 4, 1.3, 18, [9, 0, 4])
  strip(0xffffff, 2.5, 30, 0.7, [0, -6, 5])
  strip(0xffffff, 5, 34, 2.2, [0, 4, 11])
  strip(0xffffff, 2.2, 34, 0.7, [0, -1.5, 12])
  strip(0xffffff, 4, 1.1, 18, [-6, 0, 10])
  strip(0xffffff, 3, 0.8, 18, [4.5, 0, 11])
  strip(0xc8f31d, 4, 30, 1, [0, -4.5, 10])
  strip(0xc8f31d, 5, 14, 2.5, [0, 3, -9])
  strip(0xc8f31d, 3, 1, 12, [-6, 0, -6])
  return pmrem.fromScene(s, 0.015).texture
}

type Glyph = { path: { commands: any[] }; advanceWidth: number }

function glyphShapes(glyph: Glyph, scale: number, ox: number, oy: number) {
  const sp = new THREE.ShapePath()
  for (const c of glyph.path.commands) {
    switch (c.type) {
      case 'M': sp.moveTo(ox + c.x * scale, oy + c.y * scale); break
      case 'L': sp.lineTo(ox + c.x * scale, oy + c.y * scale); break
      case 'Q': sp.quadraticCurveTo(ox + c.x1 * scale, oy + c.y1 * scale, ox + c.x * scale, oy + c.y * scale); break
      case 'C':
        sp.bezierCurveTo(ox + c.x1 * scale, oy + c.y1 * scale, ox + c.x2 * scale, oy + c.y2 * scale, ox + c.x * scale, oy + c.y * scale)
        break
    }
  }
  return sp.toShapes()
}

export type Hero = { drop: (onImpact?: (i: number) => void) => Promise<void> }

export async function initHero3D(canvas: HTMLCanvasElement, reduce: boolean): Promise<Hero | null> {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  const [buf, photo] = await Promise.all([
    fetch(fontUrl).then((r) => r.arrayBuffer()),
    new THREE.TextureLoader().loadAsync(PHOTO),
  ])
  const font = opentype.parse(buf)

  // el shader trama a 1-bit: más de 1.5× de resolución no se nota y cuesta
  const dpr = Math.min(devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = studioEnv(pmrem)

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200)
  camera.position.set(0, 0, 20)

  const limeLight = new THREE.PointLight(0xc8f31d, 60, 30, 1.6)
  limeLight.position.set(-6, 3, 6)
  scene.add(limeLight)

  const uniforms = { uTime: { value: 0 }, uTwist: { value: 0.4 }, uMelt: { value: 0 } }
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6,
  })
  chrome.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms)
    sh.vertexShader =
      'uniform float uTime; uniform float uTwist; uniform float uMelt;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        float a = sin(position.x * 0.32 + uTime * 0.8) * 0.22 * uTwist;
        float cs = cos(a), sn = sin(a);
        transformed.yz = mat2(cs, -sn, sn, cs) * transformed.yz;
        float below = max(0.0, 1.2 - transformed.y);
        float wob = 0.55 + 0.45 * sin(position.x * 4.7 + uTime * 1.3) * sin(position.x * 1.9);
        transformed.y -= below * below * uMelt * wob * 1.35;
        transformed.x += sin(transformed.y * 2.0 + uTime) * 0.05 * uMelt;`,
      )
  }

  const group = new THREE.Group()
  scene.add(group)
  let letters: THREE.Mesh[] = []
  let dropped = reduce

  function buildText(lines: string[]) {
    group.clear()
    letters = []
    const size = 4
    const scale = size / font.unitsPerEm
    const lineH = size * 0.92
    lines.forEach((line, li) => {
      let x = 0
      const glyphs = [...line].map((ch) => font.charToGlyph(ch)) as Glyph[]
      glyphs.forEach((g, i) => {
        const shapes = glyphShapes(g, scale, x, -li * lineH)
        if (shapes.length) {
          const geo = new THREE.ExtrudeGeometry(shapes, {
            depth: 0.7, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.035, bevelSegments: 3,
          })
          const mesh = new THREE.Mesh(geo, chrome)
          mesh.userData.line = li
          letters.push(mesh)
          group.add(mesh)
        }
        const next = glyphs[i + 1]
        x += g.advanceWidth * scale + (next ? font.getKerningValue(g, next) * scale : 0) - size * 0.015
      })
    })
    const lineBoxes = lines.map(() => new THREE.Box3())
    letters.forEach((m) => { m.geometry.computeBoundingBox(); lineBoxes[m.userData.line].union(m.geometry.boundingBox!) })
    letters.forEach((m) => { const b = lineBoxes[m.userData.line]; m.geometry.translate(-(b.min.x + b.max.x) / 2, 0, -0.35) })
    const all = new THREE.Box3()
    letters.forEach((m) => { m.geometry.computeBoundingBox(); all.union(m.geometry.boundingBox!) })
    const cy = (all.min.y + all.max.y) / 2
    letters.forEach((m) => { m.geometry.translate(0, -cy, 0); m.geometry.computeBoundingBox() })

    // piercings: hijos de su letra para que caigan con ella
    const ringGeo = new THREE.TorusGeometry(0.26, 0.055, 14, 40)
    const ballGeo = new THREE.SphereGeometry(0.1, 20, 20)
    const pick = lines.length > 1 ? [0, 2, 4] : [0, 2, 5]
    pick.forEach((idx, k) => {
      const m = letters[idx]
      if (!m) return
      const b = m.geometry.boundingBox!
      const px = b.min.x + (b.max.x - b.min.x) * (0.3 + 0.4 * ((k * 0.37) % 1))
      const ring = new THREE.Mesh(ringGeo, chrome)
      ring.position.set(px, b.max.y + 0.12, 0)
      ring.rotation.set(0.2, 0.9 + k, 0.25)
      ring.userData.spin = 0.3 + k * 0.15
      m.add(ring)
      const ball = new THREE.Mesh(ballGeo, chrome)
      ball.position.set(px, b.max.y + 0.42, 0)
      m.add(ball)
    })
    if (!dropped) letters.forEach((m) => (m.visible = false))

    all.setFromObject(group)
    group.userData.w = all.max.x - all.min.x
    group.userData.h = all.max.y - all.min.y
  }

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const fx = new ShaderPass(HeroShader)
  fx.uniforms.tPhoto.value = photo
  const img = photo.image as { width: number; height: number }
  fx.uniforms.uPhotoAspect.value = img.width / img.height
  composer.addPass(fx)

  let W = 0
  let H = 0
  let baseZ = 20
  let lines: string[] = []
  function resize() {
    const r = canvas.getBoundingClientRect()
    if (r.width < 20 || r.height < 20) return
    W = r.width
    H = r.height
    renderer.setSize(W, H, false)
    composer.setSize(W, H)
    camera.aspect = W / H
    camera.updateProjectionMatrix()
    fx.uniforms.uRes.value.set(W * dpr, H * dpr)
    fx.uniforms.uLens.value = (W < 700 ? 95 : 170) * dpr
    const want = W / H < 0.85 ? ['Nyx', 'And'] : ['NyxAnd']
    if (want.join() !== lines.join()) {
      lines = want
      buildText(lines)
    }
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const fitW = group.userData.w / 0.88 / (2 * Math.tan(vFov / 2) * camera.aspect)
    const fitH = group.userData.h / 0.62 / (2 * Math.tan(vFov / 2))
    baseZ = Math.max(fitW, fitH)
  }

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, last: 0, on: false }
  let melt = 0
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    mouse.tx = (e.clientX - r.left) / r.width
    mouse.ty = 1 - (e.clientY - r.top) / r.height
    mouse.last = performance.now()
    mouse.on = true
  })
  canvas.addEventListener('pointerdown', () => (melt = 1))
  addEventListener('nyx-melt', () => {
    melt = 1
    setTimeout(() => (melt = 0), 2600)
  })
  addEventListener('pointerup', () => (melt = 0))
  addEventListener('pointercancel', () => (melt = 0))

  let scrollP = 0
  addEventListener('scroll', () => {
    const r = canvas.getBoundingClientRect()
    scrollP = Math.min(1, Math.max(0, -r.top / r.height))
  }, { passive: true })

  let visible = true
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(canvas)
  addEventListener('resize', resize)
  resize()

  const fxs = { shake: 0, flash: 0, burst: 0, lens: 0, photo: reduce ? 1 : 0 }
  let nextBurst = 4

  const clock = new THREE.Clock()
  let meltV = 0
  function render() {
    const t = clock.getElapsedTime()
    const now = performance.now()
    if (now - mouse.last > 2500) {
      mouse.tx = 0.5 + Math.sin(t * 0.45) * 0.32
      mouse.ty = 0.5 + Math.sin(t * 0.7) * 0.22
    }
    mouse.x += (mouse.tx - mouse.x) * 0.12
    mouse.y += (mouse.ty - mouse.y) * 0.12

    // ráfagas de glitch periódicas
    if (dropped && t > nextBurst) {
      fxs.burst = 1
      nextBurst = t + 3 + Math.random() * 4
    }
    fxs.burst *= 0.82
    fxs.shake *= 0.86
    fxs.flash *= 0.8

    meltV += (melt - meltV) * (melt ? 0.04 : 0.08)
    uniforms.uTime.value = t
    uniforms.uMelt.value = meltV
    uniforms.uTwist.value = 0.35 + Math.abs(mouse.tx - mouse.x) * 6

    group.rotation.y += ((mouse.x - 0.5) * 0.6 - group.rotation.y) * 0.06
    group.rotation.x += (-(mouse.y - 0.5) * 0.3 + scrollP * 1.1 - group.rotation.x) * 0.06
    group.position.y = Math.sin(t * 0.8) * 0.08
    letters.forEach((m) => m.children.forEach((c) => { if (c.userData.spin) c.rotation.y += c.userData.spin * 0.02 }))
    limeLight.position.x = -6 + Math.sin(t * 0.6) * 5

    camera.position.z = baseZ * (1 + scrollP * 0.6)
    camera.position.x = (Math.random() - 0.5) * fxs.shake
    camera.position.y = (Math.random() - 0.5) * fxs.shake

    fx.uniforms.uMouse.value.set(mouse.x, mouse.y)
    fx.uniforms.uTime.value = t
    fx.uniforms.uPixel.value = Math.round((3 + scrollP * scrollP * 34) * dpr)
    fx.uniforms.uGlitch.value = 0.4 + scrollP * 3 + meltV * 2 + fxs.burst * 3 + fxs.shake * 2
    fx.uniforms.uDis.value = Math.min(1, scrollP * 2.2 + fxs.burst * 1.2 + meltV * 0.35)
    fx.uniforms.uFlash.value = fxs.flash
    fx.uniforms.uPhotoOn.value = fxs.photo
    fx.uniforms.uLens.value = (W < 700 ? 95 : 170) * dpr * fxs.lens

    composer.render()
  }
  function frame() {
    requestAnimationFrame(frame)
    if (visible && lines.length) render()
  }

  // Entrada: las letras caen una por una con impacto
  function drop(onImpact?: (i: number) => void) {
    return new Promise<void>((resolve) => {
      if (reduce) {
        letters.forEach((m) => (m.visible = true))
        fxs.photo = 1
        render()
        return resolve()
      }
      dropped = true
      const tl = gsap.timeline({ onComplete: resolve })
      letters.forEach((m, i) => {
        m.visible = true
        m.position.y = 14 + i * 1.5
        m.rotation.z = (Math.random() - 0.5) * 0.9
        tl.to(m.position, {
          y: 0,
          duration: 0.42,
          ease: 'power4.in',
          onComplete: () => {
            fxs.shake = 0.55
            fxs.burst = 0.9
            fxs.flash = i === letters.length - 1 ? 0.85 : 0.18
            onImpact?.(i)
          },
        }, i * 0.11)
        tl.to(m.rotation, { z: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' }, i * 0.11 + 0.42)
      })
      tl.to(fxs, { photo: 1, duration: 1.4, ease: 'power2.out' }, '-=0.1')
      tl.to(fxs, { lens: 1, duration: 0.8, ease: 'expo.out' }, '-=1')
      nextBurst = 99
      tl.call(() => (nextBurst = clock.getElapsedTime() + 3))
    })
  }

  if (reduce) {
    fxs.lens = 0
    render()
  } else frame()
  return { drop }
}
