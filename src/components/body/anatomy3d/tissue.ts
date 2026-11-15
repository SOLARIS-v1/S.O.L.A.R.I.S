/**
 * Shared GLSL for living tissue (organs, bones and the artistic skin): procedural gradient noise, derivative bump
 * mapping and a cheap subsurface-scattering term patched into three's physical direct lighting.
 *
 * Subsurface: light entering skin or an organ scatters and comes out a little further on, mostly in red. Two cheap
 * terms stand in for it (no transmission pass): per-channel wrap lighting, which carries red light past the
 * shadow terminator and softens it, and back-lit translucency, where lights behind the tissue glow through its
 * edges and thin parts. Each material sets the globals sssWrap, sssColor and sssBack in main(), before lighting.
 */
import * as THREE from 'three';

/** Gradient noise (quintic fade, "hash without sine" gradients). Roughly in [-0.7, 0.7]. */
export const TISSUE_NOISE = /* glsl */ `
  vec3 tHash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
  }
  float tNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(
      mix(mix(dot(tHash(i), f), dot(tHash(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
          mix(dot(tHash(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
              dot(tHash(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
      mix(mix(dot(tHash(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
              dot(tHash(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
          mix(dot(tHash(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
              dot(tHash(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y),
      u.z);
  }
  // Bump mapping from a procedural height in metres (after Mikkelsen), no tangents needed.
  vec3 tBump(vec3 surfPos, vec3 n, float h) {
    vec3 sx = dFdx(surfPos);
    vec3 sy = dFdy(surfPos);
    vec3 r1 = cross(sy, n);
    vec3 r2 = cross(n, sx);
    float det = dot(sx, r1);
    if (abs(det) < 1e-14) return n;
    vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
    return normalize(abs(det) * n - grad);
  }
  // Thin lines along the zero set of a noise value, anti-aliased; they fade out once thinner than a pixel.
  float tLine(float v, float width) {
    float aa = fwidth(v) + 1e-5;
    return (1.0 - smoothstep(width - aa, width + aa, abs(v))) * smoothstep(0.15, 0.8, width / aa);
  }
  float tBand(float v, float a, float b, float w) {
    return smoothstep(a - w, a + w, v) * (1.0 - smoothstep(b - w, b + w, v));
  }`;

const DIFFUSE_LINE = 'reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );';

/**
 * Adds the subsurface terms to RE_Direct_Physical (used by MeshStandardMaterial and MeshPhysicalMaterial). Shadows
 * are already folded into directLight.color, so shadowed areas get no scattered light either.
 */
export function patchScatter(shader: { fragmentShader: string }) {
  const chunk = THREE.ShaderChunk.lights_physical_pars_fragment;
  if (!chunk || !chunk.includes(DIFFUSE_LINE)) {
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main()',
      /* glsl */ `
      vec3 sssWrap = vec3(0.0);
      vec3 sssColor = vec3(0.0);
      float sssBack = 0.0;
      void main()`
    );
    return;
  }
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lights_physical_pars_fragment>',
    /* glsl */ `
    vec3 sssWrap = vec3(0.0);
    vec3 sssColor = vec3(0.0);
    float sssBack = 0.0;
    ${chunk.replace(
      DIFFUSE_LINE,
      /* glsl */ `${DIFFUSE_LINE}
      {
        float nlRaw = dot( geometryNormal, directLight.direction );
        vec3 wrapped = saturate( ( vec3( nlRaw ) + sssWrap ) / ( 1.0 + sssWrap ) );
        vec3 scatter = max( wrapped * wrapped - vec3( dotNL ), 0.0 );
        float back = pow( saturate( dot( geometryViewDir, - directLight.direction ) ), 3.0 ) * sssBack;
        reflectedLight.directDiffuse += ( scatter + back ) * sssColor * directLight.color *
          BRDF_Lambert( material.diffuseContribution );
      }`,
    )}`,
  );
}
