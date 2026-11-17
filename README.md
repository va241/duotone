# Design Tools x Public Design UNIT

Herramientas de imagen de Public: Duotone, Photo Treatment, Backgrounds, Masks y Data Motion.

Abre `index.html` en un navegador para usarla. Las fuentes y JSZip se cargan desde servicios externos.

## Fondos

Selecciona **Backgrounds** para procesar las imágenes con desenfoque **Gaussian** o **Motion**. Ajusta la intensidad y, en movimiento, el ángulo. Activa **Apply duotone palette** para combinar el fondo con la paleta y los controles de tratamiento existentes.

La intensidad es proporcional al lado menor de cada imagen. La vista previa de fondos se limita a 1200 px en su lado mayor; PNG, JPG y ZIP se generan a resolución original con los ajustes seleccionados al iniciar la descarga. El procesamiento ocurre localmente. Mantén `blur.js` junto a `index.html`.

El gaussiano usa una aproximación de tres filtros de caja; el movimiento acumula muestras direccionales. Ambos extienden los bordes para evitar franjas oscuras.

## Masks

La pestaña **Masks** integra fotos animadas en Circle, Square, Rectangle (16:9), Ohio, Alabama o un SVG propio. **None (free)** muestra imágenes completas sin máscara, conservando sus proporciones y transparencia. **Fit to first photo** toma la proporción de la primera imagen; también se puede elegir una proporción fija. El zoom permite ampliar manualmente las imágenes. Permite hasta 50 fotos, duración de 0,5 a 6 segundos por foto, encuadre y zoom, cuatro transiciones, proporciones, duotono y exportación GIF con fondo transparente. **Use Duotone palette** copia los colores seleccionados en la herramienta Duotone. Los ajustes y fotos se guardan localmente cuando hay espacio disponible. Mantén `mask.js` y `mask.css` junto a `index.html`.

Masks starts without demo photos. Previously saved demo images are removed automatically; uploaded photos are preserved. All module controls and messages are in English.

## Data Motion

Módulo independiente de animación de datos, con controles en inglés y sin datos precargados. Permite hasta 20 elementos, cifras animadas, notas de fuente, formas geométricas, casas, autos, personas, edificios, árboles y maletines, además de barras y anillos de progreso. Los conteos de Highlighted / Total son independientes de la cifra mostrada. Incluye orden, duplicado, vista previa por elemento, cuatro proporciones, paleta compartida y exportación GIF del loop o PNG del elemento seleccionado. Mantén `data-motion.js` y `data-motion.css` junto a `index.html`.

La visual **Rectangle · number + text** permite 1–6 bloques en una fila, cada uno con una cifra y texto de hasta cuatro palabras, más un título opcional. Los bloques aparecen de izquierda a derecha y se pueden reordenar o eliminar. Al seleccionarla se activa el formato panorámico **Rectangle 5:1**, que también se puede cambiar. Compatible con los estilos de cifra, paleta, PNG y GIF existentes.

En Data Motion, **Transparent background (GIF / PNG)** permite exportar sin fondo y muestra una cuadrícula en la vista previa. El GIF reserva un índice transparente y limpia cada fotograma para evitar rastros. GIF admite transparencia binaria; los píxeles con alfa menor a 128 se exportan transparentes. PNG conserva el alfa completo.

Data Motion exporta por defecto a **1920 px de ancho y 20 fps**, con opciones de 1280 y 2560 px. El lienzo se renderiza directamente a la resolución elegida (5:1: 1920 × 384; 16:9: 1920 × 1080). La conversión de color utiliza RGB completo para evitar que colores cercanos compartan por error una entrada de caché. La transparencia GIF sigue siendo binaria; PNG conserva los bordes semitransparentes.

## Photo Treatment

Selecciona **Photo Treatment** para dar un acabado natural y consistente a un lote. Comparte las imágenes cargadas con Duotone y Backgrounds: carga varias fotos o una carpeta, ajusta el tratamiento y descarga una imagen o el lote en ZIP, como JPG o PNG a resolución original. El procesamiento es local y no modifica los archivos originales. Mantén `photo-treatment.js` junto a `index.html`.

**Level normalization** adapta el rango tonal y los medios tonos de cada foto mediante percentiles de luminancia, con límites suaves para conservar la intención de escenas oscuras o luminosas. Su intensidad es común a todo el lote; no pretende igualar escenas de iluminación diferente de forma exacta. Las imágenes de contraste casi nulo no se estiran.

Incluye exposición, contraste, recuperación suave de sombras y compresión de luces, temperatura, tinte verde/magenta, saturación y ruido monocromático. **Noise / grain** agrega textura; no es reducción de ruido. El grano es determinista y se procesa a la misma resolución en la vista previa y la exportación; su apariencia en pantalla depende del tamaño de visualización. PNG conserva el canal alfa.

Presets: **Natural**, **Soft daylight**, **Warm documentary** y **Neutral / no edits**. **Reset** vuelve a Natural. Los ajustes se aplican a todas las fotos y se capturan al iniciar cada descarga, por lo que cambiar controles durante un ZIP no modifica las imágenes pendientes de ese lote. **Hold: show original** permite comparar.

Verificación del procesamiento: `node --test tests/photo-treatment.test.cjs`.
