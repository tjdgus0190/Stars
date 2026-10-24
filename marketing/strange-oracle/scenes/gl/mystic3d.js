// 광고 영상 3D 층 공용 부품 (2026-10-24). three.js(jsdelivr, 판 고정)로 별·성운·금빛 먼지·천문 고리·바닥 문양을 그린다.
// 모든 움직임은 시간 t(초)의 함수다(무작위는 고정 씨앗). render.js가 프레임마다 window.__seek3d(t)를 부르고 그 뒤 화면을 찍는다.
// 그림 파일 없음: 도형·셰이더·캔버스 글자로만 그린다.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
export { THREE };

export const W = 1080;
export const H = 1920;

// 고정 씨앗 난수 (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInOut = (x) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const lerp = (a, b, t) => a + (b - a) * t;

// 방 색 (제품 hue와 같은 결)
export const ROOM_HUE = { saju: 18, ogham: 150, star: 295, decan: 65, tzolkin: 190, rune: 230, sibyl: 35 };
export const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
export const roomColor = (room, l = 0.62, s = 0.85) => new THREE.Color().setHSL(ROOM_HUE[room] / 360, s, l);
export const GOLD = new THREE.Color("#e9c77b");

export function createStage(canvas, { fov = 42, fog = 0.028 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07050f");
  scene.fog = new THREE.FogExp2("#0b0718", fog);
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.05, 400);
  const updaters = [];
  return {
    THREE, renderer, scene, camera,
    on(fn) {
      updaters.push(fn);
    },
    post: null, // (4안) 후처리를 쓰는 장면은 post(t)가 화면을 그린다
    seek(t) {
      for (const fn of updaters) fn(t);
      if (this.post) this.post(t);
      else renderer.render(scene, camera);
    },
  };
}

// ── 성운 하늘: 안쪽에서 보는 큰 구. 3D 잡음(fbm)으로 보라·남색·청록 구름과 옅은 금빛
export function addNebula(stage, { radius = 160, seed = 3.1, c1 = [0.28, 0.10, 0.42], c2 = [0.05, 0.22, 0.30] } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uDim: { value: 1 }, uC1: { value: new THREE.Vector3(...c1) }, uC2: { value: new THREE.Vector3(...c2) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime; uniform float uSeed; uniform float uDim; uniform vec3 uC1; uniform vec3 uC2;
      vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
      float noise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*(3.0-2.0*f);
        return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                       mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                   mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                       mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
      float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      void main(){
        vec3 d = vDir; float t = uTime*0.012;
        vec3 q = d*2.2 + vec3(uSeed, t, -t*0.7);
        float n1 = fbm(q + fbm(q*1.7 + 4.0));
        float n2 = fbm(d*4.5 + vec3(-t, uSeed*0.3, t));
        float band = exp(-pow((d.y + 0.15*sin(d.x*3.0)) * 2.6, 2.0));
        vec3 deep = vec3(0.020, 0.012, 0.050);
        vec3 violet = uC1;
        vec3 teal = uC2;
        vec3 gold = vec3(0.55, 0.38, 0.14);
        vec3 col = deep;
        col += violet * smoothstep(0.0, 0.65, n1) * (0.35 + 0.65*band);
        col += teal * smoothstep(0.15, 0.7, n2) * 0.55 * band;
        col += gold * pow(smoothstep(0.35, 0.85, n1*n2*2.2), 2.0) * 0.35;
        gl_FragColor = vec4(col * uDim, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
  mesh.renderOrder = -10;
  stage.scene.add(mesh);
  stage.on((t) => {
    mat.uniforms.uTime.value = t;
    mesh.position.copy(stage.camera.position);
  });
  return { mesh, mat };
}

// ── 별: 깊이가 다른 점 수천 개. 반짝임은 t의 사인 함수
const POINT_VS = `
  attribute float aSize; attribute float aPhase; attribute vec3 aColor;
  uniform float uTime; uniform float uScale; uniform float uTw;
  varying vec3 vColor; varying float vA;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    float tw = 1.0 - uTw + uTw * (0.5 + 0.5*sin(uTime*(0.8 + aPhase*2.2) + aPhase*40.0));
    vColor = aColor; vA = tw;
    gl_PointSize = min(aSize * uScale / max(0.1, -mv.z), 26.0); // 카메라 바로 앞 입자가 화면을 덮지 않게
    gl_Position = projectionMatrix * mv;
  }`;
const POINT_FS = `
  varying vec3 vColor; varying float vA; uniform float uOpacity;
  void main(){
    vec2 c = gl_PointCoord - 0.5; float r = length(c);
    float core = smoothstep(0.5, 0.0, r);
    float a = pow(core, 2.2) * vA * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * (0.6 + 0.8*pow(core,6.0)), a);
  }`;
export function addStars(stage, { count = 5000, rMin = 35, rMax = 140, seed = 7 } = {}) {
  const R = rng(seed);
  const pos = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = R() * 2 - 1, th = R() * Math.PI * 2, r = lerp(rMin, rMax, Math.pow(R(), 0.6));
    const s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3);
    size[i] = (R() < 0.03 ? 5.5 : 1.4 + R() * 2.2);
    phase[i] = R();
    const warm = R();
    const c = new THREE.Color().setHSL(warm < 0.7 ? 0.62 + R() * 0.1 : 0.1 + R() * 0.05, 0.35 + R() * 0.3, 0.75 + R() * 0.2);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 260 }, uTw: { value: 0.55 }, uOpacity: { value: 1 } },
    vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const pts = new THREE.Points(g, mat);
  pts.renderOrder = -9;
  stage.scene.add(pts);
  stage.on((t) => {
    mat.uniforms.uTime.value = t;
    pts.position.copy(stage.camera.position).multiplyScalar(0.85); // 먼 별은 거의 따라옴(시차는 작게)
    pts.rotation.y = t * 0.006;
  });
  return { pts, mat };
}

// ── 금빛 먼지: 카메라 가까이에서 천천히 떠오르는 큰 입자(보케). 상자 안에서 감아 돈다
export function addDust(stage, { count = 420, box = [14, 8, 14], center = [0, 2.5, 0], seed = 11, color = "#f3d48b", speed = 0.12, opacity = 0.75 } = {}) {
  const R = rng(seed);
  const base = new Float32Array(count * 3), vel = new Float32Array(count * 3);
  const size = new Float32Array(count), phase = new Float32Array(count), col = new Float32Array(count * 3);
  const c0 = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    base.set([(R() - 0.5) * box[0], (R() - 0.5) * box[1], (R() - 0.5) * box[2]], i * 3);
    vel.set([(R() - 0.5) * 0.08, (0.3 + R()) * speed, (R() - 0.5) * 0.08], i * 3);
    size[i] = 2 + R() * 7;
    phase[i] = R();
    const c = c0.clone().offsetHSL((R() - 0.5) * 0.06, 0, (R() - 0.5) * 0.2);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const pos = new Float32Array(count * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 300 }, uTw: { value: 0.35 }, uOpacity: { value: opacity } },
    vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  stage.scene.add(pts);
  const wrap = (x, s) => ((((x + s / 2) % s) + s) % s) - s / 2;
  stage.on((t) => {
    mat.uniforms.uTime.value = t;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      pos[k] = center[0] + wrap(base[k] + vel[k] * t + 0.15 * Math.sin(t * 0.4 + phase[i] * 6), box[0]);
      pos[k + 1] = center[1] + wrap(base[k + 1] + vel[k + 1] * t, box[1]);
      pos[k + 2] = center[2] + wrap(base[k + 2] + vel[k + 2] * t + 0.15 * Math.cos(t * 0.3 + phase[i] * 5), box[2]);
    }
    g.attributes.position.needsUpdate = true;
  });
  return { pts, mat };
}

// ── 천문 고리(아스트롤라베): 금빛 고리 셋 + 눈금. 서로 다른 축으로 돈다
export function addAstrolabe(stage, { radius = 5, position = [0, 4, -12], opacity = 0.55 } = {}) {
  const grp = new THREE.Group();
  grp.position.set(...position);
  const mat = new THREE.MeshStandardMaterial({ color: "#c79b52", metalness: 0.9, roughness: 0.3, emissive: "#3a2508", emissiveIntensity: 0.6, transparent: true, opacity });
  const rings = [];
  [1, 0.82, 0.64].forEach((s, i) => {
    const r = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius * s, 0.035 + 0.015 * (2 - i), 10, 160), mat);
    r.add(torus);
    const tickGeo = new THREE.BoxGeometry(0.03, i === 0 ? 0.32 : 0.22, 0.03);
    const n = i === 0 ? 72 : 48;
    const ticks = new THREE.InstancedMesh(tickGeo, mat, n);
    const m = new THREE.Matrix4();
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const long = k % (i === 0 ? 6 : 4) === 0 ? 1.8 : 1;
      m.compose(new THREE.Vector3(Math.cos(a) * radius * s * 0.965, Math.sin(a) * radius * s * 0.965, 0),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2), new THREE.Vector3(1, long, 1));
      ticks.setMatrixAt(k, m);
    }
    r.add(ticks);
    grp.add(r);
    rings.push(r);
  });
  // 가운데 작은 빛
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: "#ffe2a0" }));
  grp.add(core);
  stage.scene.add(grp);
  stage.on((t) => {
    rings[0].rotation.set(0.3, t * 0.05, t * 0.03);
    rings[1].rotation.set(1.1 + t * 0.07, 0.4, -t * 0.02);
    rings[2].rotation.set(-0.6, t * -0.09, 0.8 + t * 0.05);
  });
  return { grp, mat, rings };
}

// ── 둥근 바닥: 어두운 돌 위에 빛나는 동심원·방위 눈금·일곱 점(셰이더)
export function addFloor(stage, { radius = 9.5, glow = 1 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    uniforms: { uTime: { value: 0 }, uGlow: { value: glow }, uLit: { value: new Array(7).fill(0) } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vP; uniform float uTime; uniform float uGlow; uniform float uLit[7];
      float ring(float r, float c, float w){ return smoothstep(w, 0.0, abs(r - c)); }
      void main(){
        float r = length(vP); float a = atan(vP.y, vP.x);
        float edge = smoothstep(${radius.toFixed(2)}, ${(radius * 0.55).toFixed(2)}, r);
        vec3 stone = vec3(0.035, 0.028, 0.055) * (0.8 + 0.2*sin(r*3.0));
        float g = 0.0;
        g += ring(r, 1.2, 0.02) + ring(r, 2.6, 0.015) + ring(r, 2.75, 0.008) + ring(r, 4.4, 0.02) + ring(r, 5.4, 0.012);
        float ticks = step(0.96, fract(a / 6.28318 * 72.0)) * step(4.4, r) * step(r, 5.4);
        float spokes = step(0.995, fract(a / 6.28318 * 12.0)) * step(1.2, r) * step(r, 2.6);
        g += ticks * 0.8 + spokes * 0.7;
        float pulse = 0.75 + 0.25*sin(uTime*1.3 - r*1.5);
        vec3 col = stone + vec3(0.95, 0.72, 0.36) * g * 0.55 * pulse * uGlow;
        // 일곱 문 앞의 빛 웅덩이 (문 방향 a_k)
        for (int k = 0; k < 7; k++){
          float ak = 1.5707963 - float(k) * 0.8975979; // 문 k 방향(세계 좌표 sin θ, -cos θ → 바닥 평면 각)
          vec2 dk = vec2(cos(ak), sin(ak)) * 5.6;
          float d = length(vP - dk);
          col += vec3(0.9, 0.75, 0.5) * uLit[k] * 0.35 * exp(-d*d*0.9);
        }
        gl_FragColor = vec4(col, edge);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 128), mat);
  mesh.rotation.x = -Math.PI / 2;
  stage.scene.add(mesh);
  stage.on((t) => (mat.uniforms.uTime.value = t));
  return { mesh, mat };
}

// ── 둥근 빛 무늬 텍스처(가산 합성용 스프라이트)
export function glowTexture(inner = "rgba(255,240,200,1)", outer = "rgba(255,200,120,0)", size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, "0.45)"));
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
export function glowSprite(color, scale, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity });
  const s = new THREE.Sprite(m);
  s.scale.set(scale, scale, 1);
  return s;
}

// ── 아치 모양 (아래 직사각 + 위 반원). w 폭, h 전체 높이
export function archShape(w, h, seg = 40) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}
export function archPath(w, h) {
  const p = new THREE.Path();
  const r = w / 2;
  p.moveTo(-r, 0);
  p.lineTo(-r, h - r);
  p.absarc(0, h - r, r, Math.PI, 0, true);
  p.lineTo(r, 0);
  p.lineTo(-r, 0);
  return p;
}
// 왼쪽(또는 오른쪽) 반쪽 문짝 모양: 경첩 x=0 기준으로 바깥쪽이 -w(또는 +w)
export function halfLeafShape(w, h, right = false, seg = 24) {
  const r = w; // 반쪽 폭 = 반지름
  const s = new THREE.Shape();
  const sx = right ? -1 : 1;
  // 경첩에서 시작: (0,0) → 가운데 (sx*w, 0) → 가운데 위 (sx*w, h) → 원호 → (0, h-r)
  s.moveTo(0, 0);
  s.lineTo(sx * w, 0);
  s.lineTo(sx * w, h);
  for (let i = 1; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 2);
    s.lineTo(sx * (w - Math.sin(a) * r), h - r + Math.cos(a) * r);
  }
  s.lineTo(0, 0);
  return s;
}

// 캔버스 글자 텍스처
export function textTexture(draw, w = 512, h = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  draw(x, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, canvas: c, ctx: x, redraw(fn) { x.clearRect(0, 0, w, h); fn(x, w, h); tex.needsUpdate = true; } };
}
