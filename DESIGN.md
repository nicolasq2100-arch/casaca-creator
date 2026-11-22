# DESIGN.md — Dirección visual

## Concepto: "Utilería"
La app tiene que sentirse como el cuarto de utilería de un club: el lugar donde se preparan las camisetas
antes del partido. Taller, no tienda. Herramienta seria con alma de fútbol de barrio.
La camiseta 3D es la protagonista absoluta; la interfaz la rodea y nunca le compite.

## Lista negra (lo que hace que se vea genérico)
- Degradés violeta/azul, glassmorphism, sombras difusas por todos lados.
- Tarjetas con bordes redondeados grandes iguales en toda la pantalla.
- Verde césped chillón como color principal. Íconos de pelota como decoración.
- Inter, Roboto o Poppins como tipografía de títulos.
- Emojis en la interfaz. Textos tipo "¡Diseñá la camiseta de tus sueños!".
- Hero gigante con stock photo de estadio.

## Paleta
- Fondo: carbón cálido `#1C1B19` (escena 3D) y hueso `#F2EFE8` (paneles de edición).
- Texto: `#1C1B19` sobre hueso, `#F2EFE8` sobre carbón.
- Acento único: tiza de cancha `#E8E4D8` para líneas y guías + naranja señal `#E8562A`
  solo para la acción principal ("Guardar diseño") y para las guías métricas activas.
- Los colores del diseño del usuario NO son parte de la paleta de la interfaz.

## Tipografía
- Números y títulos: **Big Shoulders Display** (condensada, de dorsal).
- Etiquetas y controles: **Barlow Condensed**, mayúsculas con tracking amplio solo en etiquetas cortas.
- Texto corrido: **Barlow**.
- Medidas en cm: tipografía tabular (font-variant-numeric: tabular-nums).

## Layout
- Selector de prenda arriba de la escena: Jugador · Arquero · Short · Medias · Kit completo
  (miniaturas de la prenda real, no íconos genéricos).
- Escritorio: escena 3D ocupa ~65% a la izquierda; panel de herramientas a la derecha, en columnas
  tipo planilla de utilero (secciones numeradas: 01 Plantilla, 02 Colores, 03 Líneas, 04 Escudo, 05 Nombre y número).
- Celular: escena arriba (55% de alto), herramientas en una hoja inferior deslizable con pestañas.
- Bordes rectos o casi rectos (2-4 px). Divisores finos tipo línea de cancha.

## Detalles que dan identidad
- Guías métricas como líneas de cal punteadas con la medida en cm al costado.
- Las plantillas se muestran como camisetas colgadas en percha (miniaturas del render 3D, no íconos).
- Microanimación al aplicar un color: la textura "se tiñe" desde el centro (200-300 ms), sin rebotes.
- Estado vacío del escudo: silueta punteada con el texto "Subí tu escudo (PNG o SVG)".

## Accesibilidad
- Contraste AA mínimo en todo texto de interfaz.
- Todos los controles táctiles de al menos 44 px.
- Cada color elegible tiene nombre legible ("Rojo bermellón"), no solo la muestra.
