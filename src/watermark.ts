/*!
 * NYXAND — portafolio oficial de Dereck Andreh Callejas Ajin (NyxAnd)
 * © 2026 Todos los derechos reservados. Código y diseño propietarios.
 * Prohibido copiar, reutilizar, modificar o redistribuir sin permiso escrito.
 * Contacto: andrehcallex@gmail.com · https://github.com/AndrehhX
 */

// Firma en la consola: la ve quien abra las DevTools (F12).
const ASCII = String.raw`
███╗   ██╗██╗   ██╗██╗  ██╗ █████╗ ███╗   ██╗██████╗
████╗  ██║╚██╗ ██╔╝╚██╗██╔╝██╔══██╗████╗  ██║██╔══██╗
██╔██╗ ██║ ╚████╔╝  ╚███╔╝ ███████║██╔██╗ ██║██║  ██║
██║╚██╗██║  ╚██╔╝   ██╔██╗ ██╔══██║██║╚██╗██║██║  ██║
██║ ╚████║   ██║   ██╔╝ ██╗██║  ██║██║ ╚████║██████╔╝
╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝`

export function signConsole() {
  const lime = '#c8f31d'
  const ink = '#0b0b0a'
  const paper = '#e7e4dc'
  const mono = 'font-family: "JetBrains Mono", ui-monospace, monospace;'
  console.log(`%c${ASCII}`, `${mono} color:${lime}; background:${ink}; font-size:10px; line-height:1.1; padding:12px 16px;`)
  console.log(
    '%c HECHO A MANO POR %c DERECK ANDREH CALLEJAS AJIN — NYXAND %c GUATEMALA · 2026 ',
    `${mono} background:${lime}; color:${ink}; font-weight:800; padding:4px 6px;`,
    `${mono} background:${ink}; color:${paper}; font-weight:800; padding:4px 6px;`,
    `${mono} background:${paper}; color:${ink}; padding:4px 6px;`,
  )
  console.log(
    `%c© Todos los derechos reservados.\nEste diseño y su código son propietarios: no se pueden copiar, reutilizar,\nmodificar ni redistribuir sin permiso escrito del autor.`,
    `${mono} color:${paper}; background:${ink}; padding:8px 12px; line-height:1.5;`,
  )
  console.log(
    '%c¿Te gustó lo que ves? Hablemos → andrehcallex@gmail.com   ·   psst: escribe nyx en la página',
    `${mono} color:${lime}; background:${ink}; padding:6px 12px;`,
  )
}
