# CLAUDE.md — Configurador 3D de camisetas

## Qué es este proyecto
Web app donde un equipo de fútbol amateur diseña su camiseta sobre un modelo 3D realista:
elige una plantilla, cambia colores por zona, elige patrones de líneas, tipografía de nombre y número,
sube su escudo y lo posiciona con guías en centímetros. Referencias de nivel: owayo.com y spized.com.

Pensado para revenderse a otros equipos o fábricas: nada del cliente puede quedar hardcodeado en el código.

## Prendas diseñables
1. Camiseta de jugador (manga corta)
2. Camiseta de arquero (manga larga)
3. Short
4. Medias

- Cada prenda es un producto independiente: su propio GLB en `/public/models`, su propio layout UV
  y su propia entrada en `garment.config.ts` (piezas, zonas de color, medidas reales en cm, zonas
  donde se permite escudo, número o texto).
- Agregar una prenda nueva tiene que ser sumar un GLB + una entrada de config, sin tocar el editor.
- Opción "Kit completo": los colores y el escudo del equipo se pueden aplicar a todas las prendas de
  una vez, y después ajustar cada una por separado. El arquero suele llevar colores distintos al resto:
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
- Base de datos, auth y archivos: Supabase (tablas `designs`, `templates`; buckets `crests` y `crests-original`)
- Deploy: Vercel. El modelo GLB se sirve desde `/public/models`, nunca desde Supabase.

## Biblioteca de opciones (tiene que ser grande y crecer sin tocar código)
- **Gráficos/patrones**: catálogo de diseños base (rayas, franjas, diagonales, topográfico, camuflado,
  pinceladas, geométricos, degradés, texturas tipo glitch, etc.). Cada uno es un SVG o una función que
  dibuja en el canvas, con 2-4 "canales" de color que el usuario recolorea. Se registran en
  `patterns/registry.ts` con nombre, miniatura y categoría. Galería con filtros, búsqueda y paginación.
  Prohibido copiar o nombrar diseños de clubes reales: todos los gráficos son originales.
- **Cuellos**: cada cuello es una malla 3D separada (GLB) que se intercambia sobre el cuerpo de la
  camiseta, todas alineadas al mismo punto y con UV propio. Se registran en `collars/registry.ts`.
  Arrancamos con pocos (redondo, V, cruzado, polo) y se suman de a uno.
  **v1: solo el cuello en V que trae el modelo.** El escote en V está cortado en la pieza del frente,
  así que cada cuello nuevo va a necesitar su variante de frente (o del escote). Las variantes quedan para después.
- **Mangas** (más adelante): mismo sistema que los cuellos.

## Arquitectura clave: textura dinámica
1. El diseño vive como un objeto JSON (`DesignState`): colores por zona, patrón, tipografías, textos,
   escudo (ruta de la copia WebP, ruta del original, posición en cm, tamaño en cm, rotación).
   Ese JSON es lo único que se guarda en la base.
2. Un canvas 2D fuera de pantalla dibuja ese estado sobre el layout UV del modelo.
3. Ese canvas se aplica como `CanvasTexture` al material del GLB. Se redibuja solo cuando cambia el estado.
4. Los patrones se dibujan usando máscaras por pieza (frente, espalda, mangas, cuello) para que las rayas
   sigan la forma del cuerpo y no se corten feo en costuras, axilas y mangas.
5. Arrastrar el escudo: raycast sobre la malla → coordenada UV → posición en el canvas.
6. Guías métricas: un archivo de config (`garment.config.ts`) define cuántos cm reales mide cada pieza
   del UV. Todas las medidas que ve el usuario están en cm.

## Realismo (obligatorio)
- Iluminación con Environment (HDRI de estudio) + ContactShadows. Nada de luces planas por defecto.
- Respetar el normal map de costuras del modelo y sumarle encima el normal map de trama de punto
  (`fabric-knit-normal.jpg`, CC0, repetible) como textura de detalle: la malla tiene que verse al hacer zoom.
  Ver `modelos-optimizados/README.md` (escala del UV y repetición de la trama).
- Tone mapping ACES y colorSpace sRGB correctos en la textura del diseño.
- OrbitControls con límites de zoom y ángulo para que nunca se vea la camiseta "por dentro".

## Rendimiento
- El GLB final debe pesar menos de 5 MB (Draco o meshopt). Si es más pesado, avisar antes de seguir.
- Escudo: se guardan dos versiones de cada archivo que sube el usuario.
  - **Original**, tal cual lo suben (PNG o SVG, máx. 10 MB), en el bucket privado `crests-original`.
    Se usa solo para la ficha de fábrica. Nunca se muestra en el 3D ni es público (acceso con URL firmada).
  - **Copia WebP** (~100 KB, máx. 1024 px), comprimida en el navegador, en el bucket `crests`.
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
- Tipografías: solo fuentes con licencia libre para uso comercial (Google Fonts / OFL).
