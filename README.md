# Design Tools x Public Design UNIT

Herramientas de imagen de Public: Duotone, Backgrounds y Masks.

Abre `index.html` en un navegador para usarla. Las fuentes y JSZip se cargan desde servicios externos.

## Fondos

Selecciona **Backgrounds** para procesar las imágenes con desenfoque **Gaussian** o **Motion**. Ajusta la intensidad y, en movimiento, el ángulo. Activa **Apply duotone palette** para combinar el fondo con la paleta y los controles de tratamiento existentes.

La intensidad es proporcional al lado menor de cada imagen. La vista previa de fondos se limita a 1200 px en su lado mayor; PNG, JPG y ZIP se generan a resolución original con los ajustes seleccionados al iniciar la descarga. El procesamiento ocurre localmente. Mantén `blur.js` junto a `index.html`.

El gaussiano usa una aproximación de tres filtros de caja; el movimiento acumula muestras direccionales. Ambos extienden los bordes para evitar franjas oscuras.

## Masks

La pestaña **Masks** integra fotos animadas en Ohio, Alabama o un SVG propio. Permite hasta 10 fotos, encuadre y zoom, cuatro transiciones, proporciones, duotono y exportación GIF con fondo transparente. **Use Duotone palette** copia los colores seleccionados en la herramienta Duotone. Los ajustes y fotos se guardan localmente cuando hay espacio disponible. Mantén `mask.js` y `mask.css` junto a `index.html`.

Masks starts without demo photos. Previously saved demo images are removed automatically; uploaded photos are preserved. All module controls and messages are in English.
