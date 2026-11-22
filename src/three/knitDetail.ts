import * as THREE from "three";

// Normal map de detalle (trama de punto) mezclado sobre el normal map de costuras del GLB.
// three.js tiene un solo normalMap por material, así que se inyecta en el shader estándar.

const ANCHOR = "mapN.xy *= normalScale;";

export interface KnitDetail {
  uniforms: {
    detailNormalMap: { value: THREE.Texture };
    detailRepeat: { value: number };
    detailNormalScale: { value: THREE.Vector2 };
  };
  /** Signo de Y heredado del normal map del GLB. */
  ySign: number;
}

/**
 * Aplica la trama al material. Requiere que el material ya tenga normalMap (el de costuras),
 * porque reutiliza su UV y su espacio tangente.
 */
export function applyKnitDetail(
  material: THREE.MeshStandardMaterial,
  texture: THREE.Texture,
  repeatPerUv: number,
  strength: number,
): KnitDetail {
  if (!material.normalMap) throw new Error("applyKnitDetail: el material no tiene normalMap");

  // Igual que las texturas glTF: sin flipY y con el mismo signo de Y que GLTFLoader le dio al normal map
  // (lo invierte cuando el modelo no trae tangentes).
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  const ySign = Math.sign(material.normalScale.y) || 1;

  const detail: KnitDetail = {
    uniforms: {
      detailNormalMap: { value: texture },
      detailRepeat: { value: repeatPerUv },
      detailNormalScale: { value: new THREE.Vector2(strength, strength * ySign) },
    },
    ySign,
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, detail.uniforms);
    const chunk = THREE.ShaderChunk.normal_fragment_maps;
    if (!chunk.includes(ANCHOR)) {
      throw new Error("applyKnitDetail: cambió normal_fragment_maps en esta versión de three");
    }
    // Mezcla "whiteout": suma las pendientes y multiplica Z.
    const patched = chunk.replace(
      ANCHOR,
      `${ANCHOR}
	vec3 detailN = texture2D( detailNormalMap, vNormalMapUv * detailRepeat ).xyz * 2.0 - 1.0;
	detailN.xy *= detailNormalScale;
	mapN = normalize( vec3( mapN.xy + detailN.xy, mapN.z * detailN.z ) );`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <normalmap_pars_fragment>",
        `#include <normalmap_pars_fragment>
uniform sampler2D detailNormalMap;
uniform float detailRepeat;
uniform vec2 detailNormalScale;`,
      )
      .replace("#include <normal_fragment_maps>", patched);
  };
  material.customProgramCacheKey = () => "knit-detail-v1";
  material.needsUpdate = true;
  return detail;
}

export function setKnitStrength(detail: KnitDetail, strength: number) {
  detail.uniforms.detailNormalScale.value.set(strength, strength * detail.ySign);
}
