# NYXAND — Tinta × Señal

Portafolio personal de **Andreh Callejas (NyxAnd)**, desarrollador de software en Guatemala.
Dirección visual urbana y brutalista: 1-bit, graffiti y pintura que chorrea, en monocromo con un único acento lima ácido.

## Características

- **Hero WebGL**: "NyxAnd" en graffiti 3D de cromo con piercings, tramado a 1-bit sobre una foto real. El cursor abre una lente que revela el cromo, mantener presionado derrite las letras y el scroll las desintegra en píxeles.
- **Intro**: contador mientras carga el 3D, letras que caen con impacto y el nombre pintado como tag de aerosol. Más corta si ya se vio en la sesión.
- **Tipografía**: una sola display (Sedgwick Ave Display), mono para el resto y números en pixel-gótico (Jacquard 24). Los titulares se pintan con spray, se derriten al pasarles el cursor o al hacer scroll rápido y se inclinan con la velocidad.
- **Cortes entre secciones**: papel rasgado con capas de sticker roto lima y negro/blanco. Los chorreados usan física simple y un filtro metaball: la pintura se acumula, baja por su peso y suelta gotas.
- **Proyectos**: carrete de película en cilindro 3D (lista en móvil). Cada caso abre un panel rasgado con descripción, puntos destacados, stack y enlaces verificados.
- **Fuera del código**: carrusel WebGL infinito de fotos personales que se arquea y se derrite al arrastrarlo (también con flechas del teclado).
- **Detalles**: cursor de aerosol, monito dibujado a mano que cobra vida, barra de progreso que gotea, etiquetas que se decodifican, cintas arrastrables y el easter egg: escribe `nyx` en cualquier parte.

## Calidad

Auditado con Lighthouse sobre el build de producción (headless, sin GPU):

| Categoría | Desktop | Móvil |
|---|---|---|
| Accesibilidad | 100 | 100 |
| Buenas prácticas | 100 | 100 |
| SEO | 100 | 100 |
| Rendimiento | 67 | 65 |

El rendimiento en Lighthouse se ve penalizado porque su entorno no tiene GPU y todo el WebGL se calcula en CPU. Para equipos reales sin aceleración o con pocos recursos existe un **modo liviano** automático (`src/device.ts`): baja la resolución, limita los cuadros por segundo del WebGL, congela los chorreados y apaga el derretido por scroll.

Otras medidas: arranque en tareas cortas, chunks separados para three.js, animaciones que se pausan fuera de pantalla, `prefers-reduced-motion`, enlace para saltar al contenido, `noscript`, metadatos Open Graph y JSON-LD, `robots.txt`, `sitemap.xml` y cabeceras de caché y seguridad en `vercel.json`.

## Stack

- [Vite](https://vite.dev) + TypeScript (sin framework)
- [GSAP](https://gsap.com) + ScrollTrigger y [Lenis](https://lenis.darkroom.engineering)
- [three.js](https://threejs.org) + [opentype.js](https://opentype.js.org) (texto 3D a partir de la fuente)
- Tipografías: Sedgwick Ave Display, JetBrains Mono y Anton (Google Fonts), Jacquard 24 (Fontsource)

## Instalación

```bash
npm install
npm run dev       # http://localhost:5173
```

## Despliegue

```bash
npm run build     # genera /dist
npm run preview   # sirve el build en http://localhost:4173
```

Vercel: importar el repositorio; `vercel.json` ya define framework, salida y cabeceras.
Las URLs absolutas de SEO (canónica, Open Graph, sitemap) apuntan a `https://nyxand.site/`. Si se publica en otro dominio, actualizar `index.html`, `public/robots.txt` y `public/sitemap.xml`.

## Estructura

```
├── index.html          # Secciones, metadatos y filtros SVG
├── vercel.json         # Build y cabeceras
├── public/
│   ├── media/          # Fotos y capturas
│   ├── og.jpg          # Imagen para redes (1200×630)
│   ├── cv-andreh-callejas.pdf
│   └── favicon.svg, robots.txt, sitemap.xml
└── src/
    ├── main.ts         # Arranque, intro, Lenis y animaciones de scroll
    ├── device.ts       # Detección de modo liviano
    ├── hero3d.ts       # Hero WebGL
    ├── photos3d.ts     # Carrusel WebGL de fotos
    ├── film.ts         # Carrete, pósters 1-bit y panel de caso
    ├── projects.ts     # Datos de los proyectos
    ├── drips.ts        # Chorreados de los cortes
    ├── doodle.ts       # Monito dibujado a mano
    ├── extras.ts       # Progreso, panel rasgado, easter egg
    ├── fx.ts           # Cortes, cintas, cursor, spray, derretido y utilidades
    ├── sigil.ts        # Sigilos procedurales
    ├── interact.ts     # Carrusel DOM de respaldo (sin WebGL)
    └── style.css       # Estilos y tokens de diseño
```

## Mantenimiento

- **Proyectos**: editar `src/projects.ts`. Con `img` se usa una captura de `public/media`; sin ella se genera un póster 1-bit. Verificar que los enlaces respondan antes de publicar.
- **Fotos**: `public/media`; la lista del carrusel está en `PHOTOS` (`src/photos3d.ts`) y la foto del hero en `PHOTO` (`src/hero3d.ts`).
- **Colores**: tokens en `:root` de `src/style.css` (`--ink`, `--paper`, `--lime`).
- **Tecnologías del stack**: arreglo `TECHS` en `src/fx.ts`.

## Autoría

Diseño y desarrollo: **Dereck Andreh Callejas Ajin — NyxAnd**, Guatemala, 2026.
