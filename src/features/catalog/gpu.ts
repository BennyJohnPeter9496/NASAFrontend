/**
 * GLSL for the catalog. `KEPLER` is mirrored by src/features/catalog/kepler.ts so GPU and CPU agree.
 * Three prepends `#version 300 es` for WebGL2, so texelFetch and integer bit ops are available.
 */

const KEPLER = /* glsl */ `
  vec3 keplerPos(float a, float e, float inc, float raan, float argp, float m0, float n, float t) {
    float M = mod(m0 + n * t, 6.2831853);
    float E = M + e * sin(M);
    for (int i = 0; i < 7; i++) E -= (E - e * sin(E) - M) / (1.0 - e * cos(E));
    float xo = a * (cos(E) - e);
    float yo = a * sqrt(1.0 - e * e) * sin(E);
    float cw = cos(argp); float sw = sin(argp);
    float x1 = xo * cw - yo * sw;
    float y1 = xo * sw + yo * cw;
    float ci = cos(inc); float si = sin(inc);
    float y2 = y1 * ci;
    float z2 = y1 * si;
    float cO = cos(raan); float sO = sin(raan);
    return vec3(x1 * cO - y2 * sO, z2, x1 * sO + y2 * cO);
  }
`

/** Bit 4 is "still in space"; an object that exists at the simulated date always counts as in space. */
const ALIVE = /* glsl */ `
  bool visibleAt(float year, float launch, float decay, float maskBits, float enabled) {
    if (year < launch || year >= decay) return false;
    return ((int(maskBits + 0.5) | 16) & int(enabled + 0.5)) != 0;
  }
`

export const POINTS_VERTEX = /* glsl */ `
  attribute float aA;
  attribute float aE;
  attribute float aInc;
  attribute float aRaan;
  attribute float aArgp;
  attribute float aM0;
  attribute float aN;
  attribute float aMask;
  attribute float aLaunch;
  attribute float aDecay;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uMask;
  uniform float uSize;
  uniform float uYear;
  uniform float uNear;
  varying vec3 vColor;
  ${KEPLER}
  ${ALIVE}
  void main() {
    if (!visibleAt(uYear, aLaunch, aDecay, aMask, uMask)) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    vec3 p = keplerPos(aA, aE, aInc, aRaan, aArgp, aM0, aN, uTime);
    // Close to the camera the 3D model is drawn instead of the dot.
    if (uNear > 0.0 && distance((modelMatrix * vec4(p, 1.0)).xyz, cameraPosition) < uNear) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * 6.0 / -mv.z, uSize * 0.9, uSize * 2.4);
    vColor = aColor;
  }
`

export const POINTS_FRAGMENT = /* glsl */ `
  uniform float uFade;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.15, d) * uFade);
  }
`

export const FULLSCREEN_VERTEX = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`

/**
 * Computes every object's position (and the position a moment later, for heading) into a float texture.
 * Output texel 2i holds xyz + visible flag, texel 2i+1 holds the position 0.03 s later.
 */
export const COMPUTE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform sampler2D uC;
  uniform float uTime;
  uniform float uYear;
  uniform float uMask;
  ${KEPLER}
  ${ALIVE}
  void main() {
    ivec2 fc = ivec2(gl_FragCoord.xy);
    int k = fc.x & 1;
    ivec2 tc = ivec2(fc.x >> 1, fc.y);
    vec4 A = texelFetch(uA, tc, 0);
    vec4 B = texelFetch(uB, tc, 0);
    vec4 C = texelFetch(uC, tc, 0);
    vec3 p = keplerPos(A.x, A.y, A.z, A.w, B.x, B.y, B.z, uTime + float(k) * 0.03);
    bool vis = C.z >= 0.0 && visibleAt(uYear, B.w, C.x, C.y, uMask);
    gl_FragColor = vec4(p, vis ? 1.0 : 0.0);
  }
`

export const MODEL_VERTEX = /* glsl */ `
  attribute float aIndex;
  attribute float aPhase;
  attribute float aPart;
  attribute vec3 color;
  uniform sampler2D uPos;
  uniform int uW;
  uniform float uTime;
  uniform float uScale;
  uniform int uKind;
  uniform float uNear;
  uniform vec4 uClear;
  varying vec3 vColor;
  varying float vLight;
  varying float vSpec;

  mat3 rotAxis(vec3 axis, float ang) {
    float c = cos(ang); float s = sin(ang); float t = 1.0 - c;
    return mat3(
      t * axis.x * axis.x + c,          t * axis.x * axis.y + s * axis.z, t * axis.x * axis.z - s * axis.y,
      t * axis.x * axis.y - s * axis.z, t * axis.y * axis.y + c,          t * axis.y * axis.z + s * axis.x,
      t * axis.x * axis.z + s * axis.y, t * axis.y * axis.z - s * axis.x, t * axis.z * axis.z + c);
  }

  void main() {
    int idx = int(aIndex + 0.5);
    ivec2 tc = ivec2(2 * (idx % uW), idx / uW);
    vec4 p0 = texelFetch(uPos, tc, 0);
    if (p0.w < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec3 wcenter = (modelMatrix * vec4(p0.xyz, 1.0)).xyz;
    if (distance(wcenter, cameraPosition) > uNear * 1.04) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    // Keep a bubble around the selected object clear of other models so it can be seen.
    if (uClear.w > 0.0 && distance(wcenter, uClear.xyz) < uClear.w) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }

    vec3 p1 = texelFetch(uPos, tc + ivec2(1, 0), 0).xyz;
    vec3 pos = position;
    vec3 nrm = normal;
    if (aPart > 0.5) {
      // Solar panels turn about the model's X axis (the orbit normal for satellites).
      float a = uTime * 0.35 + aPhase;
      float c = cos(a); float s = sin(a);
      pos = vec3(pos.x, c * pos.y - s * pos.z, s * pos.y + c * pos.z);
      nrm = vec3(nrm.x, c * nrm.y - s * nrm.z, s * nrm.y + c * nrm.z);
    }

    mat3 basis;
    if (uKind <= 1) {
      // Nadir-pointing: model Y away from the planet, Z along the direction of travel.
      vec3 up = normalize(p0.xyz);
      vec3 vel = p1 - p0.xyz;
      vec3 fwd = normalize(vel - up * dot(vel, up));
      basis = mat3(cross(fwd, up), up, fwd);
    } else {
      vec3 axis = normalize(vec3(sin(aPhase * 3.1) + 0.1, cos(aPhase * 7.3), sin(aPhase * 5.7 + 1.0)));
      float rate = 0.5 + fract(aPhase * 13.7);
      basis = rotAxis(axis, uTime * rate + aPhase * 3.0);
    }

    vec3 local = p0.xyz + basis * (pos * uScale);
    vec3 world = (modelMatrix * vec4(local, 1.0)).xyz;
    vec3 nWorld = normalize(mat3(modelMatrix) * (basis * nrm));
    vec3 L = normalize(-world);
    vec3 V = normalize(cameraPosition - world);
    vLight = 0.3 + 0.95 * max(dot(nWorld, L), 0.0);
    vSpec = pow(max(dot(V, reflect(-L, nWorld)), 0.0), 18.0) * (0.25 + 0.5 * aPart);
    vColor = color;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

export const MODEL_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vLight;
  varying float vSpec;
  void main() {
    gl_FragColor = vec4(vColor * vLight + vec3(vSpec), 1.0);
  }
`
