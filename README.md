# NYXAND — Tinta × Señal

Portafolio personal de **Andreh Callejas (NyxAnd)**, desarrollador de software en Guatemala.
La dirección visual mezcla lo hecho a mano (tinta, brocha, papel rasgado, garabatos) con lo digital (píxeles, dithering, glitch): monocromo con un único acento lima ácido.

## Características

- **Hero en píxeles**: "NYXAND" renderizado en una rejilla con dithering Bayer, que se dispersa con el cursor o el dedo y hace glitch por su cuenta.
- **Transiciones de tinta rasgada** entre secciones, generadas como SVG con chorreados y filtros de turbulencia.
- **Carrete de película**: los proyectos son fotogramas que se recorren en horizontal con el scroll (en móvil pasan a lista vertical). Las "fotos" son pósters 1-bit generados en canvas, sin imágenes externas.
- **Panel de caso** por proyecto con stack, estado y enlaces (se cierra con Esc).
- **Stack en cintas arrastrables**.
- **Detalles**: cursor con etiqueta, grano de película, reloj en hora de Guatemala, scroll suave y animaciones de scroll.
- Respeta `prefers-reduced-motion` y es responsive desde 360 px.

## Stack

- [Vite](https://vite.dev) + TypeScript (sin framework)
- [GSAP](https://gsap.com) + ScrollTrigger
- [Lenis](https://lenis.darkroom.engineering) (scroll suave)
- Tipografías de Google Fonts: Anton, JetBrains Mono, Knewave

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
    ├── pixelHero.ts    # Hero de píxeles con dithering e interacción
    ├── film.ts         # Carrete de proyectos, pósters 1-bit y panel de caso
    ├── projects.ts     # Datos de los proyectos
    ├── fx.ts           # Rasgados, cintas, cursor, grano, reloj y utilidades
    └── style.css       # Estilos y tokens de diseño
```

## Mantenimiento

- **Añadir o editar proyectos**: modificar `src/projects.ts`. El carrete y el panel se generan solos.
- **Cambiar colores**: tokens en `:root` dentro de `src/style.css` (`--ink`, `--paper`, `--lime`).
- **Tecnologías del stack**: arreglo `TECHS` en `src/fx.ts`.

## Autoría

Diseño y desarrollo: **Dereck Andreh Callejas Ajin — NyxAnd**, Guatemala, 2026.
