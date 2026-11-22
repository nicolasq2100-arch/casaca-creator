---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/editor"]
---

# Editor (pantalla principal)

Modo: Operate. Etapa 1 de 5 aprobada; ajuste de layout pedido por el usuario (pestañas arriba, panel a la izquierda, botones redondeados, Righteous en logo y títulos, zonas Frente/Espalda separadas).

## Brief
- Quién: el encargado de la ropa del equipo, en el celular, con una mano, en ratos cortos.
- Tarea: pasar de camiseta en blanco a un diseño fabricable sin perderse ni miedo a romper nada.
- Prueba: el caso del piloto (ilustración grande, mangas de otro color, degradé, número con borde) armado solo desde el celular.
- Solo existe la camiseta de jugador; las otras prendas y "Kit completo" se ven deshabilitadas con "Próximamente".
- Decisiones: borrador local sí; 12 patrones de arranque (3 degradés); sección "Gráficos"; capas de imagen con "Quitar fondo"; tamaños de nombre/número "a confirmar con la fábrica"; zonas Frente, Espalda, Mangas, Cuello, Puños, Bajo (el panel lateral es un gráfico de la etapa 2).
- Abierto: guardar en Supabase (después de las etapas), tabla de talles, logo de marca.

## Direction contract
THESIS: La planilla del utilero junto a la camiseta: un taller donde cada decisión es una fila con nombre, medida y código, y la camiseta 3D manda. Rechaza el configurador-tienda de tarjetas iguales, íconos genéricos y paneles que le compiten al modelo.
OWN-WORLD: Carbón cálido #1C1B19 detrás de la camiseta, hueso #F2EFE8 en el panel de la sección, tiza #E8E4D8 para guías y divisores tipo línea de cancha, naranja señal #E8562A solo para la acción principal y guías activas. Logo y títulos en Righteous (redondeada, geométrica; "Casaca" gris, "Creator" blanco); botones, etiquetas y texto en Barlow, sin mayúsculas sostenidas; cm y HEX tabulares. Botones con radio 10-12 px; muestras y campos con radio chico; nada de sombras difusas.
STORY: Entiende que la camiseta es suya y que todo se puede deshacer; elige una zona, ve su nombre y su HEX, la tiñe y ve el resultado en el 3D al instante; sabe que el borrador quedó guardado en su dispositivo.
FIRST VIEWPORT: Escritorio: arriba logo + tira de prendas (Jugador activa con miniatura del render, el resto atenuado "Próximamente"); debajo una barra: deshacer/rehacer a la izquierda, pestañas Plantilla · Colores · Gráficos · Capas · Nombre (sin números) en el centro, Frente/Espalda/Costado a la derecha; panel hueso de ~340 px a la izquierda bajo deshacer/rehacer con la sección abierta (Colores: seis filas de zona); la escena carbón ocupa el resto con la camiseta centrada en ese espacio y Guías cm abajo a la derecha. Celular: tira de prendas, escena con deshacer/rehacer y vistas, hoja hueso de tres alturas con las mismas pestañas sin números.
FORM: Panel de utilero a la izquierda de la escena 3D, barra de herramientas arriba; hoja inferior en celular. seed: none (pinned) "Las secciones pasan a la barra de arriba, en el espacio vacío entre deshacer/rehacer y Frente/Espalda/Costado: pestañas SIN números … El contenido de la sección elegida se despliega en un panel a la IZQUIERDA, debajo de deshacer/rehacer (~340 px). La escena 3D ocupa el resto y la camiseta queda centrada en ese espacio." Interacción firma: al aplicar un color la tela se tiñe desde el centro de la camiseta (250 ms, sin rebote) y la zona elegida se marca un instante en el 3D.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
