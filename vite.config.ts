import { defineConfig, type Plugin } from 'vite'

// Firma de autoría al inicio de cada archivo JS del build. Se agrega al final
// (después de minificar) para que ningún paso la elimine.
const BANNER = `/*! NyxAnd — portafolio oficial de Dereck Andreh Callejas Ajin. (c) 2026 Todos los derechos reservados. Código propietario: prohibido copiar, reutilizar o redistribuir sin permiso escrito. https://nyxand.site */`

const signature = (): Plugin => ({
  name: 'nyxand-signature',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === 'chunk') file.code = `${BANNER}\n${file.code}`
      else if (file.fileName.endsWith('.css')) file.source = `${BANNER}\n${file.source}`
    }
  },
})

export default defineConfig({
  plugins: [signature()],
})
