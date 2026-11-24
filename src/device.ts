// Modo liviano: equipos con pocos núcleos/memoria, ahorro de datos,
// teléfonos o WebGL por software (sin GPU real). Mantiene el estilo pero
// baja resolución, cuadros por segundo y efectos caros.
type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }

const nav = navigator as Nav
const cores = nav.hardwareConcurrency || 8
const mem = nav.deviceMemory || 8
const phone = matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 820

// WebGL por software (SwiftShader, llvmpipe…): cada frame lo paga la CPU
export const softGL = (() => {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl') as WebGLRenderingContext | null
    if (!gl) return true
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /swiftshader|llvmpipe|software|basic render/i.test(name)
  } catch {
    return true
  }
})()

export const lite = !!nav.connection?.saveData || cores <= 4 || mem <= 4 || phone || softGL

/** intervalo mínimo entre frames de WebGL (ms): 60fps normal, ~20fps sin GPU */
export const glFrameMs = softGL ? 50 : 0

if (lite) document.documentElement.classList.add('lite')
