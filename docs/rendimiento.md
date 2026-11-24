# Rendimiento de NYXAND

24 de noviembre de 2026. Cambios locales, sin publicación.

## Estado final del alcance

Por indicación del propietario, el carrusel de fotos se restauró al original:
`src/photos3d.ts`, `src/interact.ts`, marcado y estilos específicos de fotos.
No quedan selección persistente, zoom, botones nuevos ni revelado verde nuevo.
Se conservan GitHub e Instagram nyx_and_.

Los resultados de las variantes con selección/zoom no certifican esta versión
restaurada. Se detuvieron las pruebas prolongadas; no se afirma un máximo
universal menor de 33 ms para el estado final.

## Ajustes de rendimiento conservados

- `src/melt.ts`: rasteriza el texto y la niebla una vez por fuente/tamaño;
  después deforma copiando columnas a canvas a 24 Hz. Conserva el texto DOM.
- `src/fx.ts`: actualiza sólo titulares visibles o próximos al viewport;
  conserva SVG como fallback y para la placa estática de Hablemos.
- `src/main.ts`: entrada de aerosol mediante la niebla cacheada y señal
  de arranque para los scripts, sin cambiar la interacción de las fotos.
- `src/fx.ts`, initCursor: transformación 3D estable y posición inicial
  completa dentro del viewport. La primera aparición del cursor recortado
  coincidía con picos de composición; la prueba aislada mejoró al presentarlo
  inicialmente en (16.5,16.5). No se pudo separar por completo el coste del
  recorte, antialias subpíxel y comportamiento del driver.
- `src/style.css`: mantiene formato de transformación y recorte durante el
  glitch de las tarjetas de proyectos. Conserva filtros, tinte y animación.

Los canvas de titulares cambian píxeles: se evita recalcular el filtro SVG,
no todo raster/copia GPU. No se usa contain:paint para no cortar chorreados.
El hero, cortes, gotas goo, grano, sigilo, reloj y status conservan sus efectos.

## Hallazgos de las mediciones

Se encontraron 88 procesos Edge de perfiles temporales de pruebas que habían
quedado vivos: edge.kill() terminaba el lanzador, no el navegador relanzado.
Los scripts ahora cierran mediante Browser.close, también ante errores.

La espera fija tampoco garantizaba carga completa. Ahora se espera fuente,
intro y la señal data-photos-ready. Se corrigió además la barrera de inicio:
el observador y un rAF de referencia quedan registrados ANTES de mandar
el primer movimiento. Las pruebas anteriores a esa corrección podían omitir
parte del primer bloqueo y no deben usarse para certificarlo.

La batería completa corregida previa a restaurar las fotos midió seis
secciones, primera interacción y repetición, con peores frames entre 8.6 y
25.1 ms. Hubo corridas de diagnóstico anteriores con picos mayores, incluido
un outlier de 592 ms; no todas las variantes cumplieron el objetivo.
Una repetición posterior interrumpida produjo intervalos anómalos de decenas
de segundos y se descarta como validación de la versión final.

Las trazas distinguieron dos rutas: invalidación de titulares SVG y esperas
iniciales de composición del cursor. Un FinishPaintRenderPass de 41.584 ms
usó sólo 0.559 ms de CPU del hilo; un Flush largo no identifica por sí solo
el nodo culpable. Es necesario correlacionar capas y confirmar con A/B.

## Repetir el benchmark

En una terminal: npm run dev

En otra, PowerShell:

```powershell
$env:ONLY = 'hero,fotos,stack,hablemos'
$env:SAMPLES = '3'
$env:COMPARE_WARM = '1'
$env:MAX_FRAME_MS = '33'
node scripts/perf/secciones.mjs http://localhost:5173/ 1920,1080 1
```

El código de salida falla si alguna muestra llega al límite. warm conserva
la segunda interacción; la primera no se elimina. Se informa el viewport
real: una ventana nativa solicitada de 390 px puede quedar en 492 px CSS
por el tamaño mínimo de Edge. La revisión visual de 390 px se hizo con un
viewport emulado, no con un teléfono físico.

Para una traza de atribución:

```powershell
$env:TRACE_OUT = "$env:TEMP/nyx-stack-traza.json"
$env:DETAIL = '1'
node scripts/perf/traza.mjs http://localhost:5173/ '#stack'
Remove-Item Env:DETAIL
```

No medir varias instancias GPU en paralelo. DETAIL añade invalidaciones,
capas, picture, CC y GPU service: puede producir archivos grandes y alterar
los tiempos. Para FPS usar el benchmark sin esa instrumentación.

## Atribuir una capa

1. Desacoplar DevTools para mantener el viewport. Rendering → Paint flashing
   y Layer borders. Separar scroll, movimiento de puntero y ambos.
2. Performance → Enable advanced paint instrumentation. Seleccionar un Paint
   del frame problemático y revisar Paint Profiler y Layers.
3. Correlacionar Paint/invalidaciones, RasterTask con tile/layerId, GPU/Viz,
   EndRaster/Flush, DrawRenderPass, FinishPaintRenderPass y SwapBuffers.
4. Comparar duración total con tiempo CPU y probar un solo sospechoso por
   vez mediante el JS previo admitido por los scripts. Repetir con efectos
   restaurados. Un clip grande de Paint no equivale al área rasterizada.

Algunos Edge no emiten LayerTree.layerPainted; el script lo indica y conserva
Paint por nodo y RasterTask por layerId, además del JSON completo.

Referencias primarias:
- https://developer.chrome.com/docs/devtools/rendering/performance
- https://developer.chrome.com/docs/devtools/performance/reference/
- https://developer.chrome.com/docs/devtools/layers
- https://chromium.googlesource.com/chromium/src/+/master/gpu/command_buffer/service/raster_decoder.cc

Para adornos estáticos caros puede cachearse el resultado completo como
imagen. Para muchos títulos deformables, otra opción es una textura de texto
con desplazamiento UV en un renderer WebGL compartido; añadir un contexto
por título aumentaría complejidad y memoria. La copia de columnas evita
esa complejidad en este proyecto.
