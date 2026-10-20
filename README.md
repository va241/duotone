# duotone

Herramienta Duotone de Public Design Unit.

Abre `index.html` en un navegador para usarla. Las fuentes y JSZip se cargan desde servicios externos.

## Fondos

Selecciona **Backgrounds** para procesar las imágenes con desenfoque **Gaussian** o **Motion**. Ajusta la intensidad y, en movimiento, el ángulo. Activa **Apply duotone palette** para combinar el fondo con la paleta y los controles de tratamiento existentes.

La intensidad es proporcional al lado menor de cada imagen. La vista previa de fondos se limita a 1200 px en su lado mayor; PNG, JPG y ZIP se generan a resolución original con los ajustes seleccionados al iniciar la descarga. El procesamiento ocurre localmente. Mantén `blur.js` junto a `index.html`.

El gaussiano usa una aproximación de tres filtros de caja; el movimiento acumula muestras direccionales. Ambos extienden los bordes para evitar franjas oscuras.
