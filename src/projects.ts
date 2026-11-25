export type Project = {
  id: string
  name: string
  kind: string
  desc: string
  long: string
  /** puntos concretos del caso (salen de los README de cada repo) */
  highlights: string[]
  stack: string[]
  status: string
  glyph: string
  /** captura real (en /public/media). Sin ella se genera un póster 1-bit. */
  img?: string
  links: { label: string; href: string }[]
  seed: number
}

// Datos de proyectos. Para añadir uno nuevo basta con agregar un objeto aquí.
// Links verificados el 2026-11-24: orunei.fun y los .vercel.app antiguos no responden.
export const projects: Project[] = [
  {
    id: '01',
    name: 'KAZE',
    kind: 'Plataforma de anime y manga',
    desc: '15.000+ usuarios autenticados en Supabase; VPS, workers, monitoreo, AniList y Cloudflare Pages.',
    long: 'Kaze ya tiene más de 15.000 usuarios autenticados en Supabase. La plataforma combina web en Next.js y app Android nativa en Kotlin con workers y monitoreo en VPS, despliegue web en Cloudflare Pages e integración con AniList. Biblioteca, progreso, amigos y salas se sincronizan entre web y móvil.',
    highlights: [
      'Más de 15.000 usuarios autenticados en Supabase; workers y monitoreo corren en VPS, y la web está desplegada en Cloudflare Pages.',
      'Reproductor HLS con varios servidores y cambio automático si uno falla; salto de opening/ending con AniSkip.',
      'Watch parties sincronizadas en tiempo real con chat, reacciones y compensación de latencia.',
      'App Android en Kotlin + Jetpack Compose que funciona sin conexión (Room) y se sincroniza sola.',
      'Sincronización con AniList por OAuth; tokens cifrados con AES-256-GCM.',
    ],
    stack: ['Next.js', 'React 19', 'TypeScript', 'Supabase Realtime', 'Kotlin', 'Jetpack Compose'],
    status: 'En línea',
    glyph: '風',
    img: '/media/kaze.webp',
    links: [
      { label: 'Abrir plataforma', href: 'https://www.orunei.sbs' },
      { label: 'Descargar APK', href: 'https://www.orunei.sbs/kaze.apk' },
      { label: 'Ver código', href: 'https://github.com/AndrehhX/Kaze' },
    ],
    seed: 2,
  },
  {
    id: '02',
    name: 'ORUNEI',
    kind: 'Plataforma social de anime',
    desc: 'Recomendaciones, AnimeList y perfiles con identidad visual propia.',
    long: 'Red social para descubrir anime, organizar tu AnimeList y compartir una identidad visual propia: recomendaciones personalizadas, catálogo de AniList, noticias reales y perfiles con privacidad por sección.',
    highlights: [
      'Recomendaciones según gustos, biblioteca, favoritos y noticias marcadas.',
      'Reescalado en el navegador con shaders WebGL2 (Anime4K + FidelityFX CAS) que se apaga solo si la GPU baja de 45 FPS.',
      '"Donde lo dejaste": reanuda cada episodio al segundo exacto.',
      'Sistema social: amigos, bloqueo, comentarios moderables y perfiles públicos con permisos.',
    ],
    stack: ['React 18', 'Vite', 'Tailwind', 'WebGL2', 'Supabase', 'AniList GraphQL'],
    status: 'Código',
    glyph: 'O',
    img: '/media/orunei.webp',
    links: [{ label: 'Ver código', href: 'https://github.com/AndrehhX/orunei' }],
    seed: 1,
  },
  {
    id: '03',
    name: 'WILBER BARRERA',
    kind: 'Portafolio para cliente',
    desc: 'Marketing digital y beats: vinilo animado y caja de ritmos que suena en el navegador.',
    long: 'Portafolio oficial de Wilber Barrera, especialista en marketing digital y productor de beats. Lo diseñé y desarrollé completo: una experiencia de una sola página que se "construye" mientras haces scroll, con la metáfora del disco de vinilo (Side A: marketing, Side B: beats) y una identidad editorial en rojo y negro con estética retro.',
    highlights: [
      'Beat Lab: caja de ritmos interactiva de 16 pasos (kick, snare, hi-hat, 808 y teclados) sintetizada en tiempo real con Web Audio API, con visualizador, control de tempo y patrones aleatorios.',
      'Portada con vinilo giratorio y brazo de tocadiscos; el scroll "inunda" la pantalla de rojo.',
      'Pantalla de carga con contador, registro tipo terminal y apagado CRT; el sitio se construye bloque por bloque al hacer scroll.',
      'Galería de proyectos horizontal sincronizada con el scroll (vertical en móvil) y servicios en dos caras, Side A / Side B.',
    ],
    stack: ['Vite', 'JavaScript', 'GSAP + ScrollTrigger', 'Lenis', 'Web Audio API'],
    status: 'En línea',
    glyph: 'W',
    img: '/media/wilbinho.jpg',
    links: [
      { label: 'Abrir sitio', href: 'https://wilbinho-portfolio.vercel.app' },
      { label: 'Ver código', href: 'https://github.com/wilbinho123/WILBINHO-PORTFOLIO' },
    ],
    seed: 6,
  },
  {
    id: '04',
    name: 'MONO MOTION',
    kind: 'Experimento editorial',
    desc: 'Portafolio experimental de motion, tipografía y transiciones.',
    long: 'Experimento de frontend que empezó como una portada y creció: el Home funciona como hub y cada vista se reorganiza con transiciones coreografiadas en lugar de reemplazarse.',
    highlights: [
      'Loader cinematográfico que se transforma en el Home en una sola toma, sin cortes.',
      'Elementos compartidos entre rutas con GSAP Flip: la tipografía viaja de una vista a otra.',
      'Galería en riel horizontal con drag con momentum, wheel horizontal y snap suave.',
      'Texturas de impresión y medios tonos generados con CSS/SVG, sin imágenes pesadas.',
    ],
    stack: ['React 18', 'TypeScript', 'GSAP + Flip', 'React Router', 'Tailwind'],
    status: 'Experimento',
    glyph: 'M',
    links: [{ label: 'Ver código', href: 'https://github.com/AndrehhX/mono-motion' }],
    seed: 4,
  },
  {
    id: '05',
    name: 'STUDENT ORG',
    kind: 'Proyecto académico en grupo',
    desc: 'Cursos, tareas, calificaciones y promedios.',
    long: 'Aplicación para organizar cursos, tareas y calificaciones. La interfaz está en HTML, CSS y JavaScript; Java aplica las reglas del sistema y MySQL guarda los datos.',
    highlights: [
      'Cuentas con inicio de sesión por usuario o correo y sesión que vence tras 30 minutos sin actividad.',
      'Tareas con fecha y prioridad; calificaciones por curso y actividad.',
      'Promedio por curso, promedio general y top 5 de cursos de la cuenta.',
      'Hecho en equipo para la universidad.',
    ],
    stack: ['Java 17', 'MySQL 8', 'HTML y CSS', 'JavaScript'],
    status: 'Terminado',
    glyph: 'A+',
    links: [{ label: 'Ver código', href: 'https://github.com/AndrehhX/Student-Organizer-Web' }],
    seed: 5,
  },
  {
    id: '06',
    name: 'LAUNCHER',
    kind: 'App de escritorio',
    desc: 'Una sola biblioteca nativa para Steam, Epic Games y GOG.',
    long: 'Una sola biblioteca nativa y ligera para Steam, Epic Games y GOG. Lo estoy reconstruyendo desde cero.',
    highlights: [
      'Rust + Tauri para un binario pequeño y de arranque rápido.',
      'Interfaz en React sobre la capa nativa.',
      'En reconstrucción: todavía sin repositorio público.',
    ],
    stack: ['Tauri', 'Rust', 'React'],
    status: 'En desarrollo',
    glyph: '▶',
    links: [],
    seed: 3,
  },
]
