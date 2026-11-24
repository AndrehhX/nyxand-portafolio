// Hero WebGL: "NyxAnd" en blackletter extruido de cromo, con piercings,
// pasado por un shader de dithering 1-bit. El cursor abre una lente que
// revela el cromo real; mantener presionado derrite las letras; el scroll
// lo desintegra en píxeles.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import opentype from 'opentype.js'
import fontUrl from '@fontsource/grenze-gotisch/files/grenze-gotisch-latin-900-normal.woff?url'

const DitherShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uLens: { value: 180 },
    uPixel: { value: 3 },
    uTime: { value: 0 },
    uGlitch: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes, uMouse;
    uniform float uLens, uPixel, uTime, uGlitch;
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

    void main(){
      vec2 uv = vUv;
      // glitch por bandas horizontales
      float band = floor(uv.y * 46.0);
      float g = hash(band + floor(uTime * 9.0) * 13.1);
      if (g > 0.965) uv.x += (hash(band * 3.7 + uTime) - 0.5) * 0.08 * uGlitch;

      vec2 frag = uv * uRes;
      vec2 cellP = floor(frag / uPixel);
      vec2 puv = (cellP * uPixel + uPixel * 0.5) / uRes;
      vec4 src = texture2D(tDiffuse, puv);
      vec3 c = src.rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      // dentro de la silueta nunca baja de un mínimo: las letras siempre se leen
      l = mix(l, 0.22 + 0.78 * smoothstep(0.0, 0.8, l), step(0.5, src.a));

      vec3 ink = vec3(0.043, 0.043, 0.039);
      vec3 paper = vec3(0.906, 0.894, 0.863);
      vec3 lime = vec3(0.784, 0.953, 0.114);

      float t = bayer4(cellP);
      vec3 d = l > t ? paper : ink;
      bool greenish = c.g > c.r * 1.25 && c.g > 0.25;
      if (greenish && l > t * 0.8) d = lime;

      // lente de cromo real
      float dist = length((vUv - uMouse) * uRes);
      float m = 1.0 - smoothstep(uLens - 2.0, uLens, dist);
      vec4 cs = texture2D(tDiffuse, uv);
      vec3 chrome = mix(vec3(0.02), cs.rgb, cs.a);
      vec3 col = mix(d, chrome, m);
      float ring = smoothstep(uLens - 3.0, uLens, dist) - smoothstep(uLens, uLens + 3.0, dist);
      col = mix(col, lime, ring);
      // retícula en cruz dentro de la lente
      vec2 r = abs((vUv - uMouse) * uRes);
      float cross = (step(r.x, 0.75) + step(r.y, 0.75)) * step(dist, 14.0);
      col = mix(col, lime, clamp(cross, 0.0, 1.0));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

// Estudio de fotografía de alto contraste: negro total con tiras de luz.
// Es lo que hace que el cromo se vea cromo (reflejos duros, no gris).
function studioEnv(pmrem: THREE.PMREMGenerator) {
  const s = new THREE.Scene()
  s.background = new THREE.Color(0x000000)
  const geo = new THREE.PlaneGeometry(1, 1)
  const strip = (hex: number, k: number, w: number, h: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }),
    )
    m.scale.set(w, h, 1)
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    s.add(m)
  }
  strip(0xffffff, 6, 26, 1.4, [0, 7, 3])
  strip(0xffffff, 4, 1.3, 18, [-9, 0, 2])
  strip(0xffffff, 4, 1.3, 18, [9, 0, 4])
  strip(0xffffff, 2.5, 30, 0.7, [0, -6, 5])
  // tiras frontales: lo que refleja la cara de las letras
  strip(0xffffff, 5, 34, 2.2, [0, 4, 11])
  strip(0xffffff, 2.2, 34, 0.7, [0, -1.5, 12])
  strip(0xffffff, 4, 1.1, 18, [-6, 0, 10])
  strip(0xffffff, 3, 0.8, 18, [4.5, 0, 11])
  strip(0xc8f31d, 4, 30, 1, [0, -4.5, 10])
  strip(0xc8f31d, 5, 14, 2.5, [0, 3, -9])
  strip(0xc8f31d, 3, 1, 12, [-6, 0, -6])
  const tex = pmrem.fromScene(s as unknown as THREE.Scene, 0.015).texture
  return tex
}

type Glyph ={ path: { commands: any[] }; advanceWidth: number }

function glyphShapes(glyph: Glyph, scale: number, ox: number, oy: number) {
  const sp = new THREE.ShapePath()
  for (const c of glyph.path.commands) {
    switch (c.type) {
      case 'M': sp.moveTo(ox + c.x * scale, oy + c.y * scale); break
      case 'L': sp.lineTo(ox + c.x * scale, oy + c.y * scale); break
      case 'Q': sp.quadraticCurveTo(ox + c.x1 * scale, oy + c.y1 * scale, ox + c.x * scale, oy + c.y * scale); break
      case 'C':
        sp.bezierCurveTo(
          ox + c.x1 * scale, oy + c.y1 * scale,
          ox + c.x2 * scale, oy + c.y2 * scale,
          ox + c.x * scale, oy + c.y * scale,
        )
        break
    }
  }
  return sp.toShapes()
}

export async function initHero3D(canvas: HTMLCanvasElement, reduce: boolean): Promise<boolean> {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  } catch {
    return false
  }
  const font = opentype.parse(await fetch(fontUrl).then((r) => r.arrayBuffer()))

  const dpr = Math.min(devicePixelRatio || 1, 1.75)
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  const scene = new THREE.Scene()
  scene.background = null
  renderer.setClearColor(0x000000, 0)
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = studioEnv(pmrem)

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200)
  camera.position.set(0, 0, 20)

  // luz lima rasante: se cuela en los reflejos y el shader la conserva como acento
  const limeLight = new THREE.PointLight(0xc8f31d, 60, 30, 1.6)
  limeLight.position.set(-6, 3, 6)
  scene.add(limeLight)
  const rim = new THREE.DirectionalLight(0xffffff, 1.4)
  rim.position.set(4, 6, -4)
  scene.add(rim)

  const uniforms = { uTime: { value: 0 }, uTwist: { value: 0.4 }, uMelt: { value: 0 } }
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.6,
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

  function buildText(lines: string[]) {
    group.clear()
    const size = 4
    const scale = size / font.unitsPerEm
    const lineH = size * 0.92
    const meshes: THREE.Mesh[] = []
    lines.forEach((line, li) => {
      let x = 0
      const y = -li * lineH
      const glyphs = [...line].map((ch) => font.charToGlyph(ch)) as Glyph[]
      glyphs.forEach((g, i) => {
        const shapes = glyphShapes(g, scale, x, y)
        if (shapes.length) {
          const geo = new THREE.ExtrudeGeometry(shapes, {
            depth: 0.7,
            curveSegments: 10,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSize: 0.035,
            bevelSegments: 3,
          })
          const mesh = new THREE.Mesh(geo, chrome)
          mesh.userData.line = li
          meshes.push(mesh)
          group.add(mesh)
        }
        const next = glyphs[i + 1]
        x += g.advanceWidth * scale + (next ? font.getKerningValue(g, next) * scale : 0) - size * 0.015
      })
    })

    // centrar cada línea y luego el bloque
    const lineBoxes = lines.map(() => new THREE.Box3())
    meshes.forEach((m) => {
      m.geometry.computeBoundingBox()
      lineBoxes[m.userData.line].union(m.geometry.boundingBox!)
    })
    meshes.forEach((m) => {
      const b = lineBoxes[m.userData.line]
      m.geometry.translate(-(b.min.x + b.max.x) / 2, 0, -0.35)
    })
    const all = new THREE.Box3()
    meshes.forEach((m) => {
      m.geometry.computeBoundingBox()
      all.union(m.geometry.boundingBox!)
    })
    const cy = (all.min.y + all.max.y) / 2
    meshes.forEach((m) => {
      m.geometry.translate(0, -cy, 0)
      m.geometry.computeBoundingBox()
    })

    // piercings de cromo colgando de algunas letras
    const ringGeo = new THREE.TorusGeometry(0.26, 0.055, 14, 40)
    const ballGeo = new THREE.SphereGeometry(0.1, 20, 20)
    const pick = lines.length > 1 ? [0, 2, 4] : [0, 2, 5]
    pick.forEach((idx, k) => {
      const m = meshes[idx]
      if (!m) return
      const b = m.geometry.boundingBox!
      const ring = new THREE.Mesh(ringGeo, chrome)
      const px = b.min.x + (b.max.x - b.min.x) * (0.3 + 0.4 * ((k * 0.37) % 1))
      ring.position.set(px, b.max.y + 0.12, 0)
      ring.rotation.set(0.2, 0.9 + k, 0.25)
      ring.userData.spin = 0.3 + k * 0.15
      group.add(ring)
      const ball = new THREE.Mesh(ballGeo, chrome)
      ball.position.set(px, b.max.y + 0.42, 0)
      group.add(ball)
    })

    all.setFromObject(group)
    group.userData.w = all.max.x - all.min.x
    group.userData.h = all.max.y - all.min.y
  }

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const dither = new ShaderPass(DitherShader)
  composer.addPass(dither)

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
    dither.uniforms.uRes.value.set(W * dpr, H * dpr)
    dither.uniforms.uLens.value = (W < 700 ? 95 : 170) * dpr

    const want = W / H < 0.85 ? ['Nyx', 'And'] : ['NyxAnd']
    if (want.join() !== lines.join()) {
      lines = want
      buildText(lines)
    }
    // encajar: el texto ocupa ~86% del ancho visible o ~62% del alto
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const fitW = group.userData.w / 0.86 / (2 * Math.tan(vFov / 2) * camera.aspect)
    const fitH = group.userData.h / 0.6 / (2 * Math.tan(vFov / 2))
    baseZ = Math.max(fitW, fitH)
  }

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, last: 0 }
  let melt = 0
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    mouse.tx = (e.clientX - r.left) / r.width
    mouse.ty = 1 - (e.clientY - r.top) / r.height
    mouse.last = performance.now()
  })
  canvas.addEventListener('pointerdown', () => (melt = 1))
  addEventListener('pointerup', () => (melt = 0))
  addEventListener('pointercancel', () => (melt = 0))

  let scrollP = 0
  addEventListener(
    'scroll',
    () => {
      const r = canvas.getBoundingClientRect()
      scrollP = Math.min(1, Math.max(0, -r.top / r.height))
    },
    { passive: true },
  )

  let visible = true
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(canvas)
  addEventListener('resize', resize)
  resize()
  if (!lines.length) requestAnimationFrame(resize)

  const clock = new THREE.Clock()
  let meltV = 0
  function frame() {
    requestAnimationFrame(frame)
    if (!visible || !lines.length) return
    const t = clock.getElapsedTime()
    const now = performance.now()

    // si nadie mueve el cursor (móvil), la lente pasea sola
    if (now - mouse.last > 2500) {
      mouse.tx = 0.5 + Math.sin(t * 0.45) * 0.32
      mouse.ty = 0.5 + Math.sin(t * 0.7) * 0.22
    }
    mouse.x += (mouse.tx - mouse.x) * 0.12
    mouse.y += (mouse.ty - mouse.y) * 0.12

    meltV += (melt - meltV) * (melt ? 0.04 : 0.08)
    uniforms.uTime.value = t
    uniforms.uMelt.value = meltV
    uniforms.uTwist.value = 0.35 + Math.abs(mouse.tx - mouse.x) * 6

    group.rotation.y += ((mouse.x - 0.5) * 0.7 - group.rotation.y) * 0.06
    group.rotation.x += (-(mouse.y - 0.5) * 0.35 + scrollP * 1.1 - group.rotation.x) * 0.06
    group.position.y = Math.sin(t * 0.8) * 0.08
    group.children.forEach((c) => {
      if (c.userData.spin) c.rotation.y += c.userData.spin * 0.02
    })
    limeLight.position.x = -6 + Math.sin(t * 0.6) * 5

    camera.position.z = baseZ * (1 + scrollP * 0.6)
    dither.uniforms.uMouse.value.set(mouse.x, mouse.y)
    dither.uniforms.uTime.value = t
    dither.uniforms.uPixel.value = Math.round((3 + scrollP * scrollP * 34) * dpr)
    dither.uniforms.uGlitch.value = 0.6 + scrollP * 3 + meltV * 2

    composer.render()
  }

  if (reduce) {
    dither.uniforms.uLens.value = 0
    composer.render()
  } else frame()
  return true
}
