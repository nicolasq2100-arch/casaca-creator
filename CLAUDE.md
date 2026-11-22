# CLAUDE.md — Configurador 3D de camisetas

## Qué es este proyecto
Web app donde un equipo de fútbol amateur diseña su camiseta sobre un modelo 3D realista:
elige una plantilla, cambia colores por zona, elige patrones (líneas, degradés, etc.), y suma capas de
imágenes (escudo, ilustraciones, sponsors) y textos (nombre, número, frases) que posiciona con guías en
centímetros. Referencias de nivel: owayo.com y spized.com.

Pensado para revenderse a otros equipos o fábricas: nada del cliente puede quedar hardcodeado en el código.

## Prendas diseñables
1. Camiseta de jugador (manga corta)
2. Camiseta de arquero (manga larga)
3. Short
4. Medias

- Cada prenda es un producto independiente: su propio GLB en `/public/models`, su propio layout UV
  y su propia entrada en `garment.config.ts` (piezas, zonas de color, medidas reales en cm y posiciones
  sugeridas para capas: escudo, número, texto). Las posiciones sugeridas son el punto de partida de una
  capa nueva, no un límite.
- Agregar una prenda nueva tiene que ser sumar un GLB + una entrada de config, sin tocar el editor.
- Opción "Kit completo": los colores, el patrón y las capas compartidas (escudo, ilustración, etc.) se
  pueden aplicar a todas las prendas de una vez, y después ajustar cada una por separado (cada prenda
  guarda su propia posición y tamaño de la capa). El arquero suele llevar colores distintos al resto:
  su camiseta tiene que poder desvincularse del kit.
- Zonas típicas: número y escudo en camisetas; número chico en el short; las medias solo llevan
  colores, franjas y, como mucho, un logo chico.

## Idioma
- Interfaz en español rioplatense (vos, "elegí", "subí tu escudo").
- Código, nombres de variables y commits en inglés. Comentarios breves en español solo donde aporten.

## Stack (no cambiar sin preguntar)
- Next.js (App Router) + TypeScript estricto + Tailwind CSS
- 3D: three.js con @react-three/fiber y @react-three/drei
- Estado del diseño: Zustand
- Base de datos, auth y archivos: Supabase (tablas `designs`, `templates`; buckets `layers` y `layers-original`)
- Deploy: Vercel. El modelo GLB se sirve desde `/public/models`, nunca desde Supabase.

## Biblioteca de opciones (tiene que ser grande y crecer sin tocar código)
- **Gráficos/patrones**: catálogo de diseños base (rayas, franjas, diagonales, topográfico, camuflado,
  pinceladas, geométricos, degradés, texturas tipo glitch, etc.), con 2-4 "canales" de color que el
  usuario recolorea. Se registran en `patterns/registry.ts` con nombre, miniatura, categoría y tipo:
  - `svg`: un SVG con los canales como colores reemplazables.
  - `canvas`: una función que dibuja en el canvas.
  - `gradient`: degradé paramétrico (lineal o radial, 2-4 paradas de color, ángulo, y comienzo/fin en cm).
    Se mide en cm sobre la altura de la prenda, no del UV, para que frente y espalda empalmen en la
    costura del costado (ej.: degradé en la parte de abajo que da toda la vuelta).
  Galería con filtros, búsqueda y paginación.
  - **Panel lateral (costado/axila)**: NO es una zona de color. Es un gráfico de la etapa 2: una franja sobre
    las costuras de los costados (frente y espalda, bajo la sisa) que el usuario recolorea como cualquier canal.
  Prohibido copiar o nombrar diseños de clubes reales: todos los gráficos son originales.
- **Cuellos**: cada cuello es una malla 3D separada (GLB) que se intercambia sobre el cuerpo de la
  camiseta, todas alineadas al mismo punto y con UV propio. Se registran en `collars/registry.ts`.
  Arrancamos con pocos (redondo, V, cruzado, polo) y se suman de a uno.
  **v1: solo el cuello en V que trae el modelo.** El escote en V está cortado en la pieza del frente,
  así que cada cuello nuevo va a necesitar su variante de frente (o del escote).
  **Cuello polo: prioridad alta.** Es el próximo trabajo de modelado, apenas esté el editor base
  (malla del cuello polo con UV propio + la variante de frente que necesite). Lo pide el caso de prueba.
  El resto de las variantes quedan para después.
- **Mangas** (más adelante): mismo sistema que los cuellos.

## Capas (imágenes y textos)
Todo lo que va encima de colores y patrón es una capa. El escudo es una capa más, no un caso especial.
- **Tipos**:
  - `image`: archivo subido por el usuario (PNG, JPG o SVG): ilustraciones grandes, escudos, sponsors,
    frases en imagen. Tiene la opción **"Quitar fondo"** (blanco o un color elegido, con tolerancia), porque
    los equipos mandan JPG con fondo blanco. El original se guarda intacto; el fondo se quita al dibujar.
  - `text`: nombre, número, nombre del equipo, frases.
- **Cada capa guarda**: pieza donde va, posición en cm (centro, medida desde la esquina superior izquierda
  de la pieza vista desde afuera), tamaño en cm (escala), rotación en grados y orden (z). Se puede mover,
  escalar, rotar, reordenar, ocultar y borrar.
- Puede ir sobre **cualquier pieza** de la prenda. **v1 (confirmado): se dibuja recortada al contorno de
  su pieza** y no cruza costuras. Cruzarlas queda para más adelante.
- **Escudo**: capa `image` con rol `crest`. Arranca con la posición sugerida de `garment.config.ts`
  (camiseta de jugador: 8 × 8 cm en el pecho izquierdo) y el usuario la ajusta.
- **Textos y número**: tipografía OFL, color y **contorno configurable** (color y grosor en cm; grosor 0 =
  sin borde). El contorno se dibuja por fuera del relleno (trazo debajo del relleno) para que no se coma
  el ancho del número.
- En "Kit completo", una capa puede marcarse como compartida: aparece en todas las prendas y cada prenda
  guarda su propia posición y tamaño (ej.: el mismo gráfico y el escudo en camiseta y short).

## Caso de prueba de referencia
El equipo piloto tiene una camiseta de referencia y la app tiene que poder reproducir ese tipo de diseño:
frente blanco con una ilustración grande en trazos, mangas de otro color, cuello polo, degradé en la
parte de abajo, número grande con borde, nombre del equipo en la espalda; short con el mismo gráfico,
escudo y número. **Sus datos e imágenes no van en el código ni en el repo**: para probar se cargan desde
la app, como cualquier usuario.

## Arquitectura clave: textura dinámica
1. El diseño vive como un objeto JSON (`DesignState`): colores por zona, patrón (incluidos los degradés)
   y la lista ordenada de capas (imágenes con la ruta de la copia WebP y del original; textos con
   tipografía, color y contorno). Ese JSON es lo único que se guarda en la base.
2. Un canvas 2D fuera de pantalla dibuja ese estado sobre el layout UV del modelo.
3. Ese canvas se aplica como `CanvasTexture` al material del GLB. Se redibuja solo cuando cambia el estado.
4. Los patrones se dibujan usando máscaras por pieza (frente, espalda, mangas, cuello) para que las rayas
   sigan la forma del cuerpo y no se corten feo en costuras, axilas y mangas.
5. Orden de dibujo: colores por zona → patrón → capas (de menor a mayor orden), cada una recortada a su pieza.
6. Arrastrar una capa: raycast sobre la malla → coordenada UV → pieza y posición en cm.
7. Guías métricas: un archivo de config (`garment.config.ts`) define cuántos cm reales mide cada pieza
   del UV. Todas las medidas que ve el usuario están en cm.

## Realismo (obligatorio)
- Iluminación con Environment (HDRI de estudio) + ContactShadows. Nada de luces planas por defecto.
- Respetar el normal map de costuras del modelo y sumarle encima el normal map de trama de punto
  (`fabric-knit-normal.jpg`, CC0, repetible) como textura de detalle: la malla tiene que verse al hacer zoom.
  Ver `modelos-optimizados/README.md` (escala del UV y repetición de la trama).
- Fidelidad de color: el color iluminado de frente tiene que coincidir con el HEX que va a la ficha
  (objetivo ΔE2000 ≤ 2 en colores medios). Tone mapping **Neutral** (Khronos PBR Neutral), no ACES:
  ACES desatura y corre los rojos al salmón. colorSpace sRGB en la textura del diseño, HDRI con balance
  de blancos neutro, intensidad del entorno calibrada (1,34) y sheen teñido con el color de la tela.
  Si se cambia la luz, el HDRI o el material, volver a medir.
- OrbitControls con límites de zoom y ángulo para que nunca se vea la camiseta "por dentro".

## Rendimiento
- El GLB final debe pesar menos de 5 MB (Draco o meshopt). Si es más pesado, avisar antes de seguir.
- Imágenes subidas (escudo, ilustraciones, sponsors, cualquier capa `image`): se guardan dos versiones
  de cada archivo.
  - **Original**, tal cual lo suben (PNG, JPG o SVG, máx. 10 MB), en el bucket privado `layers-original`.
    Se usa solo para la ficha de fábrica. Nunca se muestra en el 3D ni es público (acceso con URL firmada).
  - **Copia WebP** (~100 KB, máx. 1024 px), comprimida en el navegador, en el bucket `layers`.
    Es la que se muestra en el 3D.
- Tiene que andar fluido en un celular de gama media: es donde lo van a usar.

## Roles
- Usuario común: elige plantilla, edita, guarda y comparte su diseño.
- Admin del equipo: lo mismo + botón "Guardar como plantilla". No hay panel admin aparte.

## Diseño visual
Leer y respetar `DESIGN.md` en cada tarea de interfaz. Usar el skill impeccable para diseñar,
revisar y pulir. Prohibido el look genérico de plantilla (ver lista negra en DESIGN.md).

## Forma de trabajo
- Una funcionalidad por vez. Al terminar cada una: explicar en 3-5 líneas qué cambió y cómo probarlo.
- Antes de instalar una dependencia nueva, decir cuál y por qué.
- No inventar datos de clubes reales, escudos ni marcas (Nike, Adidas, etc.).
- Datos del equipo piloto (nombre, escudo, ilustraciones, fotos de la camiseta): nunca en el código,
  los ejemplos ni el repo.
- Orden de trabajo acordado: editor base → modelado del cuello polo (prioridad alta) → resto.
- Tipografías: solo fuentes con licencia libre para uso comercial (Google Fonts / OFL).
