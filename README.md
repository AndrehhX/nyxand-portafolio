# NYXAND — Tinta × Señal

Portafolio personal de **Andreh Callejas (NyxAnd)**, desarrollador de software en Guatemala.
La dirección visual mezcla lo hecho a mano (tinta, brocha, papel rasgado, garabatos) con lo digital (píxeles, dithering, glitch): monocromo con un único acento lima ácido.

## Características

- **Hero WebGL**: "NyxAnd" en blackletter 3D extruido de cromo, con piercings, pasado por un shader de dithering 1-bit. El cursor abre una lente que revela el cromo real, mantener presionado derrite las letras y el scroll las desintegra en píxeles.
- **Intro**: contador en pixel-gótico mientras carga el 3D; luego las letras caen con impacto (temblor de cámara y flash) y el nombre se pinta como tag de aerosol que chorrea.
- **Tipografía urbana**: una sola display, graffiti (Sedgwick Ave Display), también en el NyxAnd 3D; mono para el resto y lima sólo como acento. Los titulares se derriten con un filtro SVG cuya intensidad depende de la velocidad del scroll.
- **Todo animado**: cursor de aerosol que pinta (lima sobre negro, tinta sobre papel) y chorrea si te quedas quieto; titulares que se pintan con niebla de spray, se derriten al pasarles el cursor y se inclinan con la velocidad del scroll; párrafos palabra por palabra; etiquetas y links que se decodifican; números que cuentan; correo con letras que saltan; marquesina que sigue la dirección del scroll; status con glitch.
- **Cortes multicapa**: entre secciones la página se rompe y deja ver capas de sticker roto lima y negro/blanco, con chorreados que se estiran con el scroll.
- **Foto real tramada** a 1-bit como fondo del hero, y carrusel WebGL infinito "Fuera del código" que se arquea y se derrite según la velocidad del arrastre.
- **Capturas reales** de Orunei y Kaze en el carrete (se revelan a color al pasar el cursor).
- **Sigilos procedurales** (estilo cyber-sigilism) generados con curvas bezier y espinas.
- **Animaciones 3D**: titulares que caen como placas, carrete de proyectos en cilindro 3D y "HABLEMOS" con extrusión que sigue al cursor.
- **Transiciones de tinta rasgada** entre secciones, generadas como SVG con chorreados y filtros de turbulencia.
- **Carrete de película**: los proyectos son fotogramas en un cilindro que gira con el scroll (en móvil pasan a lista). Las "fotos" son pósters 1-bit generados en canvas, sin imágenes externas.
- **Panel de caso** por proyecto con stack, estado y enlaces (se cierra con Esc).
- **Stack en cintas arrastrables**.
- **Detalles**: cursor con etiqueta, grano de película, reloj en hora de Guatemala, scroll suave y animaciones de scroll.
- Respeta `prefers-reduced-motion` y es responsive desde 360 px.

## Stack

- [Vite](https://vite.dev) + TypeScript (sin framework)
- [GSAP](https://gsap.com) + ScrollTrigger
- [Lenis](https://lenis.darkroom.engineering) (scroll suave)
- [three.js](https://threejs.org) + [opentype.js](https://opentype.js.org) (texto 3D desde la fuente)
- Tipografías: Anton, JetBrains Mono (Google Fonts), Grenze Gotisch y Jacquard 24 (Fontsource)

## Instalación

```bash
npm install
npm run dev       # http://localhost:5173
```

## Despliegue

```bash
npm run build     # genera /dist
npm run preview   # sirve el build localmente
```

El build es estático: se puede desplegar en Vercel, Netlify o cualquier hosting de archivos. En Vercel basta con importar el repositorio (framework: Vite, output: `dist`).

## Estructura

```
├── index.html          # Estructura de todas las secciones
├── public/favicon.svg
└── src/
    ├── main.ts         # Arranque, Lenis y animaciones de scroll
    ├── hero3d.ts       # Hero WebGL: texto 3D de cromo + shader de dithering
    ├── sigil.ts        # Generador procedural de sigilos
    ├── photos3d.ts     # Carrusel WebGL de fotos que se derrite
    ├── interact.ts     # Carrusel DOM de respaldo (sin WebGL)
    ├── film.ts         # Carrete de proyectos, pósters 1-bit y panel de caso
    ├── projects.ts     # Datos de los proyectos
    ├── fx.ts           # Rasgados, cintas, cursor, grano, reloj y utilidades
    └── style.css       # Estilos y tokens de diseño
```

## Mantenimiento

- **Añadir o editar proyectos**: modificar `src/projects.ts`. El carrete y el panel se generan solos; con `img` se usa una captura de `public/media`, sin ella se genera un póster 1-bit.
- **Fotos**: en `public/media`; el carrusel está en `index.html` (sección `.photos`) y la foto del hero en `PHOTO` de `src/hero3d.ts`.
- **Cambiar colores**: tokens en `:root` dentro de `src/style.css` (`--ink`, `--paper`, `--lime`).
- **Tecnologías del stack**: arreglo `TECHS` en `src/fx.ts`.

## Autoría

Diseño y desarrollo: **Dereck Andreh Callejas Ajin — NyxAnd**, Guatemala, 2026.
