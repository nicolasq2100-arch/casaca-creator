import * as THREE from "three";

// Extensiones del material de tela, inyectadas en el shader estándar de three:
// 1. Trama de punto: normal map de detalle repetido, mezclado sobre el normal map de costuras.
// 2. Teñido: al cambiar el diseño, la textura nueva aparece desde el centro de la prenda hacia afuera.

const NORMAL_ANCHOR = "mapN.xy *= normalScale;";
const MAP_ANCHOR = "vec4 sampledDiffuseColor = texture2D( map, vMapUv );";

export interface FabricShader {
  uniforms: {
    detailNormalMap: { value: THREE.Texture };
    detailRepeat: { value: number };
    detailNormalScale: { value: THREE.Vector2 };
    prevMap: { value: THREE.Texture | null };
    /** 0 = todo el diseño anterior, 1 = todo el nuevo. */
    tintProgress: { value: number };
    /** Distancia (m) desde el centro de la prenda que cubre el teñido completo. */
    tintRadius: { value: number };
  };
  /** Signo de Y heredado del normal map del GLB. */
  ySign: number;
}

function patch(source: string, anchor: string, replacement: string, what: string) {
  if (!source.includes(anchor)) throw new Error(`fabricShader: cambió ${what} en esta versión de three`);
  return source.replace(anchor, replacement);
}

/**
 * Requiere que el material tenga normalMap (el de costuras) y map (el diseño),
 * porque reutiliza su UV y su espacio tangente.
 */
export function applyFabricShader(
  material: THREE.MeshStandardMaterial,
  knit: { texture: THREE.Texture; repeatPerUv: number; strength: number },
  tintRadius: number,
): FabricShader {
  if (!material.normalMap) throw new Error("applyFabricShader: el material no tiene normalMap");

  // Igual que las texturas glTF: sin flipY y con el mismo signo de Y que GLTFLoader le dio al normal map
  // (lo invierte cuando el modelo no trae tangentes).
  knit.texture.flipY = false;
  knit.texture.wrapS = knit.texture.wrapT = THREE.RepeatWrapping;
  knit.texture.colorSpace = THREE.NoColorSpace;
  knit.texture.needsUpdate = true;
  const ySign = Math.sign(material.normalScale.y) || 1;

  const shader: FabricShader = {
    uniforms: {
      detailNormalMap: { value: knit.texture },
      detailRepeat: { value: knit.repeatPerUv },
      detailNormalScale: { value: new THREE.Vector2(knit.strength, knit.strength * ySign) },
      prevMap: { value: null },
      tintProgress: { value: 1 },
      tintRadius: { value: tintRadius },
    },
    ySign,
  };

  material.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, shader.uniforms);

    s.vertexShader = patch(
      s.vertexShader,
      "#include <common>",
      "#include <common>\nvarying vec3 vTintWorld;",
      "common (vertex)",
    );
    s.vertexShader = patch(
      s.vertexShader,
      "#include <project_vertex>",
      "#include <project_vertex>\n\tvTintWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;",
      "project_vertex",
    );

    const normalChunk = patch(
      THREE.ShaderChunk.normal_fragment_maps,
      NORMAL_ANCHOR,
      `${NORMAL_ANCHOR}
	vec3 detailN = texture2D( detailNormalMap, vNormalMapUv * detailRepeat ).xyz * 2.0 - 1.0;
	detailN.xy *= detailNormalScale;
	mapN = normalize( vec3( mapN.xy + detailN.xy, mapN.z * detailN.z ) );`,
      "normal_fragment_maps",
    );
    // Frente de teñido con un borde suave de ~4 cm.
    const mapChunk = patch(
      THREE.ShaderChunk.map_fragment,
      MAP_ANCHOR,
      `vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	if ( tintProgress < 1.0 ) {
		float tintD = length( vTintWorld.xy ) / tintRadius;
		float tintEdge = 0.12;
		float tintMix = smoothstep( tintProgress * ( 1.0 + tintEdge ) - tintEdge, tintProgress * ( 1.0 + tintEdge ), tintD );
		sampledDiffuseColor = mix( sampledDiffuseColor, texture2D( prevMap, vMapUv ), tintMix );
	}`,
      "map_fragment",
    );

    s.fragmentShader = patch(
      s.fragmentShader,
      "#include <common>",
      `#include <common>
varying vec3 vTintWorld;
uniform sampler2D detailNormalMap;
uniform float detailRepeat;
uniform vec2 detailNormalScale;
uniform sampler2D prevMap;
uniform float tintProgress;
uniform float tintRadius;`,
      "common (fragment)",
    )
      .replace("#include <normal_fragment_maps>", normalChunk)
      .replace("#include <map_fragment>", mapChunk);
  };
  material.customProgramCacheKey = () => "fabric-v2";
  material.needsUpdate = true;
  return shader;
}

export function setKnitStrength(shader: FabricShader, strength: number) {
  shader.uniforms.detailNormalScale.value.set(strength, strength * shader.ySign);
}
