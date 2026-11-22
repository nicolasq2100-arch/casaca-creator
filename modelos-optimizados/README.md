# Modelos optimizados

Archivos listos para `/public/models` y `/public/textures` cuando se cree el proyecto.
Los originales están en `/modelos-originales` y no se tocan.

## jersey-player.glb

Origen: `modelos-originales/Soccer Printed Sports Jersey-Third Kit.glb` (export de CLO, talle M, licencia comercial extendida).

- Unidades en metros, centrado en el origen. Frente hacia +Z, Y arriba.
- Mallas por pieza: `front`, `back`, `sleeve_l`, `sleeve_r`, `cuff_l`, `cuff_r`, `hem_front`, `hem_back`, `collar`.
  Izquierda/derecha según quien la lleva puesta (`_l` está en +X).
- `inner`: cara interior de todas las piezas en una malla, material liso `inner`, sin UV.
- Material `fabric`: sin textura de color (la pone el canvas), normal map de costuras, roughness 0,349, metal 0.
- UV en 0..1 (el original usaba V negativa, mosaico UDIM 1001). Escala uniforme: **1 unidad UV = 115,4 cm**.
- Compresión: `EXT_meshopt_compression` + `KHR_mesh_quantization` (requiere `MeshoptDecoder` en `GLTFLoader`).
- Sin atributo TANGENT: three.js calcula el espacio tangente en el shader.

## textures/fabric-knit-normal.jpg

Normal map de trama de punto, repetible, formato OpenGL (Y+), 1024 × 1024 (el original venía en 1024 × 1025;
se recortó la última fila, que empalma con la primera como cualquier par de filas vecinas), JPG de 162 KB.

- Fuente: Poly Haven, "Cotton Jersey" (`cotton_jersey_nor_gl_1k.jpg`), https://polyhaven.com/a/cotton_jersey
- Licencia: CC0 (dominio público). Fotografía: colormass; procesado: Rico Cilliers.
- Tamaño real de una repetición: 26,4 × 26,4 cm (4,38 veces por unidad UV). En la app se usa **2,92 por unidad UV**
  (1,5× más gruesa, intensidad 2,4): a escala real la malla no se notaba de cerca. Ver `garment.config.ts`.
- Se usa como textura de detalle sobre el normal map de costuras (no reemplaza al del GLB).
