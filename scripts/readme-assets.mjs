// Genera los SVG del README con la tipografía real del sitio (Sedgwick Ave
// Display) convertida a trazos: GitHub muestra los SVG como <img> y no carga
// fuentes externas, así que el texto tiene que ir como paths.
// Uso: node scripts/readme-assets.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import opentype from 'opentype.js'

const OUT = 'docs/readme'
mkdirSync(OUT, { recursive: true })

const buf = readFileSync('node_modules/@fontsource/sedgwick-ave-display/files/sedgwick-ave-display-latin-400-normal.woff')
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

const INK = '#0b0b0a'
const INK2 = '#1d1d1b'
const PAPER = '#e7e4dc'
const LIME = '#c8f31d'
const MONO = "ui-monospace, 'JetBrains Mono', 'Cascadia Mono', Consolas, monospace"

// pseudoaleatorio determinista: los SVG no cambian entre regeneraciones
let seed = 7
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)

// Letra por letra con charToGlyph: font.getPath aplica sustituciones GSUB que
// opentype.js no soporta en esta fuente y rompía letras como "u" o "é".
// Si la fuente no trae una letra acentuada, se usa la letra base.
const glyphFor = (ch) => {
  const g = font.charToGlyph(ch)
  return g.index ? g : font.charToGlyph(ch.normalize('NFD').replace(/[̀-ͯ]/g, ''))
}
function glyphs(text, x, y, size) {
  const scale = size / font.unitsPerEm
  let d = ''
  let cx = x
  const gs = [...text].map(glyphFor)
  gs.forEach((g, i) => {
    // opentype.js genera "NaN" al formatear posiciones con basura de punto
    // flotante (p. ej. 303.76000000000005): se redondea antes de dibujar.
    // Por seguridad, cualquier contorno que aún salga inválido se descarta.
    d += g.getPath(Math.round(cx * 100) / 100, y, size).toPathData(2)
      .split(/(?=M)/)
      .filter((c) => !c.includes('NaN'))
      .join('')
    // algunos pares (p. ej. "ie") devuelven un kerning inválido; un NaN aquí
    // rompía todo el trazo desde esa letra en adelante
    const k = gs[i + 1] ? Number(font.getKerningValue(g, gs[i + 1])) : 0
    cx += g.advanceWidth * scale + (Number.isFinite(k) ? k * scale : 0)
  })
  return d
}
const width = (text, size) => [...text].map(glyphFor).reduce((w, g) => w + g.advanceWidth * (size / font.unitsPerEm), 0)

// borde de papel rasgado (camina al azar) desde x0 a x1
function tornEdge(x0, x1, base, amp, step = 14) {
  const pts = []
  let y = base
  for (let x = x0; x <= x1 + step; x += step * (0.5 + rnd())) {
    y += (rnd() - 0.5) * amp
    y += (base - y) * 0.3
    pts.push([Math.min(x, x1), y + (rnd() < 0.12 ? (rnd() - 0.3) * amp * 1.4 : 0)])
  }
  return pts
}
const pathDown = (pts, top) => `M${pts[0][0]} ${top} ` + pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ` L${pts.at(-1)[0]} ${top} Z`

// chorreado con cuello y bulbo (como los del sitio)
function drip(x, y, len, w) {
  const r = w * 0.62
  const tip = y + len
  return `M${x - w * 0.9} ${y - 6} C${x - w * 0.5} ${y + 2} ${x - w * 0.24} ${y + len * 0.3} ${x - w * 0.24} ${tip - r * 1.6}` +
    ` C${x - w * 0.24} ${tip - r} ${x - r} ${tip - r * 1.1} ${x - r} ${tip - r * 0.3}` +
    ` A${r} ${r * 1.08} 0 1 0 ${x + r} ${tip - r * 0.3}` +
    ` C${x + r} ${tip - r * 1.1} ${x + w * 0.24} ${tip - r} ${x + w * 0.24} ${tip - r * 1.6}` +
    ` C${x + w * 0.24} ${y + len * 0.3} ${x + w * 0.5} ${y + 2} ${x + w * 0.9} ${y - 6} Z`
}

// trama 1-bit (como la foto del hero), densidad según una "luz" radial
function ditherField(x0, y0, w, h, cell, cx, cy, rad) {
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  let d = ''
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const dist = Math.hypot(x + x0 - cx, (y + y0 - cy) * 1.4) / rad
      const l = Math.max(0, 1 - dist) * 0.85 + rnd() * 0.12
      const t = (B[((y / cell) % 4) * 4 + ((x / cell) % 4)] + 0.5) / 16
      if (l > t) d += `M${x + x0} ${y + y0}h${cell - 1}v${cell - 1}h${-(cell - 1)}Z`
    }
  }
  return d
}

// ---------------------------------------------------------------- banner
{
  const W = 1280
  const H = 460
  const big = 210
  const name = 'NyxAnd'
  const nx = 70
  const ny = 292
  const nameD = glyphs(name, nx, ny, big)
  let extrude = ''
  for (let k = 16; k >= 1; k--) {
    const c = k === 16 ? LIME : k % 2 ? INK2 : '#2a2a28'
    extrude += `<path d="${nameD}" fill="${c}" transform="translate(${(k * 1.3).toFixed(1)} ${(k * 1.7).toFixed(1)})"/>`
  }
  const tagSize = 74
  const tagD = glyphs('Andreh Callejas', 0, 0, tagSize)
  // abajo: la hoja negra se rompe y deja ver sticker lima y luego papel;
  // los chorreados negros cuelgan del borde lima
  const limeEdge = tornEdge(-10, W + 10, H - 58, 16)
  const edge = tornEdge(-10, W + 10, H - 30, 12)
  let drips = ''
  for (let i = 0; i < 16; i++) {
    const p = limeEdge[Math.floor(rnd() * limeEdge.length)]
    const thick = rnd() < 0.3
    drips += `<path d="${drip(p[0], p[1], (thick ? 30 : 12) + rnd() * (thick ? 60 : 30), thick ? 9 + rnd() * 6 : 4.5 + rnd() * 3)}"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="NyxAnd — Andreh Callejas, desarrollador de software">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <path d="${ditherField(560, 0, 720, H - 40, 6, 1000, 170, 520)}" fill="#2c2c29"/>
  <g>${extrude}<path d="${nameD}" fill="${PAPER}"/></g>
  <g transform="translate(${nx + 8} ${ny + 96}) rotate(-5)">
    <path d="${tagD}" fill="#000" transform="translate(4 4)"/>
    <path d="${tagD}" fill="${LIME}"/>
  </g>
  <rect x="${W - 262}" y="34" width="222" height="32" fill="${LIME}"/>
  <text x="${W - 248}" y="56" font-family="${MONO}" font-size="15" font-weight="700" fill="${INK}" letter-spacing="1.5">● DISPONIBLE</text>
  <text x="70" y="62" font-family="${MONO}" font-size="14" fill="${PAPER}" letter-spacing="2.5" opacity="0.8">[ PORTAFOLIO OFICIAL — GUATEMALA · 2026 ]</text>
  <path d="M0 ${H} ${limeEdge.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L${W} ${H} Z" fill="${LIME}"/>
  <path d="M0 ${H} ${edge.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L${W} ${H} Z" fill="${PAPER}"/>
  <g fill="${INK}">${drips}</g>
</svg>`
  writeFileSync(`${OUT}/banner.svg`, svg)
}

// ------------------------------------------------------- títulos de sección
const TITLES = {
  'que-es': ['qué es', 'esto'],
  'lo-que-tiene': ['lo que', 'tiene'],
  stack: ['stack', 'sin miedo'],
  correr: ['correrlo', 'local'],
  estructura: ['cómo está', 'armado'],
  licencia: ['licencia', 'es mío'],
}
for (const [file, [main, mark]] of Object.entries(TITLES)) {
  const W = 1280
  const H = 120
  const s1 = 82
  const s2 = 40
  const d1 = glyphs(main, 26, 92, s1)
  const w1 = width(main, s1)
  const mx = 26 + w1 + 26
  const w2 = width(mark, s2)
  const d2 = glyphs(mark, mx + 14, 86, s2)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${main} ${mark}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <path d="${d1}" fill="${PAPER}"/>
  <g transform="rotate(-3 ${mx} 80)">
    <rect x="${mx}" y="46" width="${w2 + 28}" height="54" fill="${LIME}"/>
    <path d="${d2}" fill="${INK}"/>
  </g>
  <rect x="0" y="${H - 4}" width="${W}" height="4" fill="${LIME}"/>
</svg>`
  writeFileSync(`${OUT}/t-${file}.svg`, svg)
}

// ---------------------------------------------------------------- divisor
{
  const W = 1280
  const H = 90
  seed = 21
  const edge = tornEdge(-10, W + 10, 26, 14)
  const lime = tornEdge(-10, W + 10, 46, 16)
  let drips = ''
  for (let i = 0; i < 12; i++) {
    const p = edge[Math.floor(rnd() * edge.length)]
    const thick = rnd() < 0.3
    drips += `<path d="${drip(p[0], p[1], (thick ? 22 : 8) + rnd() * 26, thick ? 8 + rnd() * 5 : 4.5 + rnd() * 2.5)}"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
  <path d="${pathDown(lime, 0)}" fill="${LIME}"/>
  <path d="${pathDown(edge.map(([x, y]) => [x, y + 6]), 0)}" fill="${PAPER}"/>
  <path d="${pathDown(edge, 0)}" fill="${INK}"/>
  <g fill="${INK}">${drips}</g>
</svg>`
  writeFileSync(`${OUT}/divider.svg`, svg)
}

console.log('SVG generados en', OUT)
