---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components"]
---

# Editor (pantalla principal)

Modo: Operate. Etapa 1 de 5 (estructura, deshacer/rehacer, borrador local, 02 Colores).

## Brief
- Quién: el encargado de la ropa del equipo, en el celular, con una mano, en ratos cortos.
- Tarea: pasar de camiseta en blanco a un diseño fabricable sin perderse ni miedo a romper nada.
- Prueba: el caso del piloto (ilustración grande, mangas de otro color, degradé, número con borde) armado solo desde el celular.
- Solo existe la camiseta de jugador; las otras prendas y "Kit completo" se ven deshabilitadas con "Próximamente".
- Decisiones: borrador local sí; 12 patrones de arranque (3 degradés); sección 03 = "Gráficos"; capas de imagen con "Quitar fondo"; tamaños de nombre/número "a confirmar con la fábrica".
- Abierto: guardar en Supabase (después de las etapas), tabla de talles, logo de marca.

## Direction contract
THESIS: La planilla del utilero junto a la camiseta: un taller donde cada decisión es una fila con nombre, medida y código, y la camiseta 3D manda. Rechaza el configurador-tienda de tarjetas redondeadas, íconos genéricos y paneles flotantes sobre el modelo.
OWN-WORLD: Carbón cálido #1C1B19 detrás de la camiseta, hueso #F2EFE8 en la planilla, tiza #E8E4D8 para guías y divisores tipo línea de cancha, naranja señal #E8562A solo para la acción principal y guías activas. Números de dorsal en Big Shoulders Display, etiquetas en Barlow Condensed mayúscula, texto en Barlow, cm y HEX tabulares. Bordes de 2-4 px, filas con divisores finos, nada de sombras difusas.
STORY: Entiende que la camiseta es suya y que todo se puede deshacer; elige una zona, ve su nombre y su HEX, la tiñe y ve el resultado en el 3D al instante; sabe que el borrador quedó guardado en su dispositivo.
FIRST VIEWPORT: Celular: tira de prendas arriba (Jugador activa con miniatura del render, el resto atenuado "Próximamente"); escena carbón ~55 % con la camiseta centrada, deshacer/rehacer arriba a la izquierda, Frente/Espalda/Costado arriba a la derecha, interruptor de guías cm abajo a la derecha; hoja hueso con asa, pestañas 01-05 numeradas como dorsales y 02 Colores abierta con cinco filas de zona. Escritorio: escena ~65 % a la izquierda, planilla a la derecha con índice 01-05 y secciones apiladas.
FORM: Planilla de utilero sobre escena 3D con hoja inferior de tres alturas. seed: none (pinned) "Escritorio: escena 3D ocupa ~65% a la izquierda; panel de herramientas a la derecha, en columnas tipo planilla de utilero (secciones numeradas…). Celular: escena arriba (55% de alto), herramientas en una hoja inferior deslizable con pestañas." Interacción firma: al aplicar un color la tela se tiñe desde el centro de la camiseta (250 ms, sin rebote) y la zona elegida se marca un instante en el 3D.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
