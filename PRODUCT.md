# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Web responsive, con el celular como dispositivo principal (gama media). No hay app nativa.

## Stack

Lo decidió el usuario y está fijado en CLAUDE.md: Next.js (App Router) + TypeScript estricto + Tailwind,
three.js con @react-three/fiber y drei, Zustand, Supabase y deploy en Vercel. No se cambia sin preguntar.

## Users

- **Usuario principal:** alguien de un equipo de fútbol amateur (el que se encarga de la ropa del equipo)
  que diseña el kit desde el celular, lo guarda, comparte el link con el resto y después arma el pedido.
- **Admin del equipo:** hace lo mismo y además puede guardar un diseño como plantilla del equipo.
  No hay un panel de admin aparte.
- **Fábrica (receptora y futura compradora):** recibe la ficha técnica y el pedido para producir.
  Más adelante, fábricas y otros equipos son el mercado de reventa del producto.

## Product Purpose

Casaca Creator deja que un equipo amateur diseñe su kit completo (camiseta de jugador, camiseta de
arquero, short y medias) sobre un modelo 3D realista y lo convierta en algo que se puede fabricar:
un link para compartir, un pedido con la lista de jugadores y una ficha técnica para la fábrica.

El éxito es que lo que el equipo ve en pantalla sea lo que la fábrica produce, sin idas y vueltas
por WhatsApp para aclarar colores, medidas o la ubicación del escudo.

## Positioning

Los configuradores de referencia (owayo, spized) atan el diseño a la compra en su propia fábrica.
Casaca Creator es la herramienta de diseño independiente de quién fabrica. Mide todo en centímetros reales
por prenda y cierra con una ficha de producción y un pedido con talles. Está pensado para revenderse
a cualquier fábrica o equipo sin tocar el código.

## Operating Context

- Se usa sobre todo en el celular, a menudo fuera de la computadora.
- Flujo: elegir prenda (o kit completo) → plantilla → colores por zona → patrón → cuello → escudo →
  nombre y número → guardar → compartir link → cargar la lista de jugadores → mandar el pedido o
  exportar la ficha.
- El arquero lleva colores distintos: su camiseta se desvincula del kit y se ajusta por separado.
- El diseño se guarda como un JSON (`DesignState`). Es el único registro del diseño y la fuente de la
  ficha y del pedido.

## Capabilities and Constraints

Confirmado:
- Cuatro prendas como productos independientes (GLB + entrada en `garment.config.ts`). Sumar una prenda
  no toca el editor.
- Kit completo: colores y escudo aplicados a todas las prendas, con ajuste individual después.
- Biblioteca de patrones y cuellos que crece por registro (`patterns/registry.ts`, `collars/registry.ts`),
  con galería, filtros, búsqueda y paginación.
- Escudo subido por el usuario, posicionado y medido en cm. Todas las medidas visibles están en cm.
- Escudo en dos versiones: el original tal cual se sube (PNG o SVG, máx. 10 MB), en el bucket privado
  `crests-original` y usado solo para la ficha de fábrica, y una copia WebP de ~100 KB en el bucket
  `crests` para el 3D.
- **Salidas del diseño:**
  1. Guardar y compartir por link.
  2. Pedido con la lista de jugadores (nombre, número, talle), enviado como pedido o como pedido
     de presupuesto.
  3. Ficha técnica para la fábrica (PDF/PNG con colores, medidas en cm y escudo en alta resolución).
- Roles: usuario común y admin del equipo (con "Guardar como plantilla").
- Rendimiento: GLB de menos de 5 MB y fluido en un celular de gama media.

Decisiones abiertas (no inventar):
- A quién llega el pedido y por qué canal (mail, WhatsApp, panel de la fábrica).
- Si hay precios, cotización automática o pago. Por ahora no hay precios.
- Tabla de talles: cuáles se ofrecen y si dependen de la prenda o de la fábrica.

## Brand Commitments

- Nombre: **Casaca Creator**.
- Marca propia fija: no es white-label. Las fábricas y equipos que lo compren usan la identidad tal cual.
  "Nada del cliente hardcodeado" se refiere a los datos (equipos, plantillas, escudos, catálogo), que viven
  en config y en la base, no a la marca del producto.
- Voz: español rioplatense, con vos y en imperativo ("elegí", "subí tu escudo"). Directa, sin euforia de
  marketing.
- No se usan clubes reales, escudos reales ni marcas deportivas (Nike, Adidas, etc.), ni en datos ni en
  gráficos. Todos los patrones son originales.
- Tipografías solo con licencia libre para uso comercial (Google Fonts / OFL).
- La identidad visual vive en DESIGN.md.

## Evidence on Hand

- Hay un equipo amateur real como piloto. Sus datos no van en el código ni en los ejemplos.
- Todavía no hay modelos GLB, plantillas, patrones, cuellos, testimonios, fotos ni clientes que se
  puedan citar. No se fabrican: hasta que existan se usan placeholders marcados como tales.

## Product Principles

1. **Lo que se ve es lo que se fabrica.** El 3D, las medidas en cm, la ficha y el pedido salen del mismo
   `DesignState`. Si algo no se puede producir, no se puede diseñar.
2. **Primero el celular.** Cada decisión se prueba en un celular de gama media con una mano.
3. **Datos, no código.** Prendas, cuellos, patrones, plantillas y clientes se suman por config, registro o
   base de datos, nunca tocando el editor.
4. **Kit primero, prenda después.** El equipo piensa en el kit entero. La excepción (el arquero) se
   resuelve desvinculando, no rehaciendo.
5. **Siempre original.** Ningún gráfico, nombre ni ejemplo imita a un club o una marca real.

## Accessibility & Inclusion

- Contraste AA mínimo en todo texto de interfaz.
- Controles táctiles de al menos 44 px.
- Cada color elegible tiene un nombre legible, no solo la muestra, porque hay que poder dictarlo por
  teléfono o escribirlo en el pedido.
