export type Project = {
  id: string
  name: string
  kind: string
  desc: string
  long: string
  stack: string[]
  status: string
  glyph: string
  /** captura real (en /public/media). Sin ella se genera un póster 1-bit. */
  img?: string
  links: { label: string; href: string }[]
  seed: number
}

// Datos de proyectos. Para añadir uno nuevo basta con agregar un objeto aquí.
export const projects: Project[] = [
  {
    id: '01',
    name: 'ORUNEI',
    kind: 'Plataforma social de anime',
    desc: 'Catálogo en vivo, AnimeList y perfiles con identidad visual.',
    long: 'Descubre anime, organiza tu AnimeList y comparte una identidad visual propia, con catálogo en vivo, recomendaciones y perfiles privados.',
    stack: ['React', 'Supabase', 'AniList API'],
    status: 'En línea',
    glyph: 'O',
    img: '/media/orunei.webp',
    links: [
      { label: 'Abrir demo', href: 'https://orunei.fun/' },
      { label: 'Ver código', href: 'https://github.com/AndrehhX/orunei' },
    ],
    seed: 1,
  },
  {
    id: '02',
    name: 'KAZE',
    kind: 'Ecosistema multimedia',
    desc: 'Streaming HLS, Watch Parties en tiempo real y app Android.',
    long: 'Streaming adaptativo HLS conectado a AniList, Watch Parties sincronizadas en tiempo real y una app nativa para Android que comparte la misma cuenta.',
    stack: ['Next.js', 'TypeScript', 'Supabase', 'Kotlin'],
    status: 'En línea',
    glyph: '風',
    img: '/media/kaze.webp',
    links: [
      { label: 'Abrir demo', href: 'https://orunei-v2.vercel.app/' },
      { label: 'Ver código', href: 'https://github.com/AndrehhX/Kaze' },
    ],
    seed: 2,
  },
  {
    id: '03',
    name: 'LAUNCHER',
    kind: 'App de escritorio',
    desc: 'Una sola biblioteca nativa para Steam, Epic Games y GOG.',
    long: 'Una sola biblioteca nativa y ligera para Steam, Epic Games y GOG. Lo estoy reconstruyendo desde cero para que arranque en milisegundos.',
    stack: ['Tauri', 'Rust', 'React'],
    status: 'Reconstruyendo',
    glyph: '▶',
    links: [],
    seed: 3,
  },
  {
    id: '04',
    name: 'MONO MOTION',
    kind: 'Experimento editorial',
    desc: 'Tipografía, composición y transiciones interactivas.',
    long: 'Laboratorio de tipografía, composición y transiciones interactivas para practicar el control del movimiento dentro de una interfaz.',
    stack: ['React', 'TypeScript', 'GSAP'],
    status: 'Experimento',
    glyph: 'M',
    links: [{ label: 'Ver código', href: 'https://github.com/AndrehhX/mono-motion' }],
    seed: 4,
  },
  {
    id: '05',
    name: 'STUDENT ORG',
    kind: 'Proyecto académico en grupo',
    desc: 'Estudiantes, calificaciones, tareas y promedios en la web.',
    long: 'Organiza estudiantes, calificaciones, tareas y promedios desde una base web funcional. Hecho en equipo para la universidad.',
    stack: ['Java', 'HTML y CSS', 'JavaScript'],
    status: 'Terminado',
    glyph: 'A+',
    links: [{ label: 'Ver código', href: 'https://github.com/AndrehhX/Student-Organizer-Web' }],
    seed: 5,
  },
]
