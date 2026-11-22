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
- Logo y títulos: **Righteous** (OFL), letras redondeadas y geométricas. Solo en el logo y en los títulos
  de sección; nunca en botones, etiquetas ni texto.
  - Logo: "Casaca" en gris (tiza al 60 %) y "Creator" en blanco (tiza).
- Botones, etiquetas y texto: **Barlow**, una sola sans legible, en mayúscula y minúscula normales
  (sin mayúsculas sostenidas ni tracking amplio).
- Medidas en cm y códigos HEX: cifras tabulares (font-variant-numeric: tabular-nums).

## Layout
- Selector de prenda arriba de todo, junto al logo: Jugador · Arquero · Short · Medias · Kit completo
  (miniaturas de la prenda real, no íconos genéricos).
- Secciones (pestañas **sin números**): Plantilla · Colores · Gráficos · Capas · Nombre.
- **Escritorio:**
  - Barra de herramientas debajo del selector: deshacer/rehacer a la izquierda, las pestañas de sección en
    el centro y Frente / Espalda / Costado a la derecha.
  - Panel de la sección elegida a la **izquierda**, debajo de deshacer/rehacer (~340 px), en hueso.
  - La escena 3D ocupa el resto y la camiseta queda centrada en ese espacio. No hay panel a la derecha.
- **Celular:** escena arriba, herramientas en una hoja inferior deslizable (tres alturas) con las mismas
  pestañas sin números. Sobre la escena: deshacer/rehacer y Guías cm (solo ícono de regla) arriba a la
  izquierda, Frente/Espalda/Costado arriba a la derecha; nada abajo, para no tapar el bajo de la camiseta.
  El estado del borrador va en la línea del asa de la hoja.
- Zonas de color de la camiseta: Frente, Espalda, Mangas, Cuello, Puños, Bajo.
- **Capas** (imágenes y textos: escudo, ilustraciones, sponsors, frases, nombre del equipo): lista tipo
  planilla, una fila por capa, ordenada de arriba (más adelante) hacia abajo. Cada fila muestra miniatura,
  nombre, pieza donde va y tamaño en cm (tabular), con controles para reordenar, ocultar y borrar.
  Arriba de la lista, dos acciones: "Subir imagen" y "Agregar texto". El escudo es una fila más.
  El nombre y número de cada jugador siguen en "Nombre".
- Botones con esquinas redondeadas (radio 10-12 px): deshacer/rehacer, vistas, Guías cm, pestañas y los
  botones de los paneles. Muestras de color y campos con radio chico (4-6 px).
- Divisores finos tipo línea de cancha.

## Detalles que dan identidad
- Guías métricas como líneas de cal punteadas con la medida en cm al costado.
- Las plantillas se muestran como camisetas colgadas en percha (miniaturas del render 3D, no íconos).
- Microanimación al aplicar un color: la textura "se tiñe" desde el centro (200-300 ms), sin rebotes.
- Estado vacío de "Capas" (todavía no hay ninguna capa): silueta punteada de un escudo con el texto
  "Subí tu escudo o un gráfico (PNG, JPG o SVG)" como acción principal de la sección, y debajo, más chico,
  "o agregá un texto". Tocar la silueta abre la subida de archivo.

## Accesibilidad
- Contraste AA mínimo en todo texto de interfaz.
- Todos los controles táctiles de al menos 44 px.
- Cada color elegible tiene nombre legible ("Rojo bermellón"), no solo la muestra.
