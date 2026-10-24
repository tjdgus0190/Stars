// 4안 「들켰죠」 3D 장면 (2026-10-24). 글자까지 전부 WebGL로 그리고, 후처리(번쩍임·색 갈라짐·글리치·번짐 빛)를 한 번에 건다.
// 시간표(초):
//   A 0~1.9   검은 거울, 심장 소리 0.1·0.62, "이 광고, 넘기려고 했죠?" (글리치로 들어오고 나감)
//   B 2.05 · 3.85 · 5.65  세 문장이 카메라 뒤에서 날아와 거울에 꽂힘 → 꽂힌 자리에서 별 모양 금, 화면 흔들림·번쩍임
//   C 6.9~7.4 숨 멈춤(어두워짐·심장 소리) · 7.6 "들켰죠?" 꽂힘 → 7.6~8.15 금이 거울 전체로 번짐
//   D 8.15 거울이 파편으로 터짐(파편 = 처음부터 거울을 이루던 조각, 금 = 조각의 경계) → 느린 화면 → 8.5~9.8 카메라가 구멍을 지나감
//   E 9.6~11.7 일곱 방 문장이 차례로 불붙는 고리 · 자막 "일곱 개의 방이, 당신 속을 끝까지 읽어요" / "결제하면, 듣기 싫은 말까지 전부"
//   F 11.7~15 끝 화면: 낯선 점술관 · 당신의 방, 지금 열기 · 책 전체 9,900원 · 한 번 결제
// 모든 움직임은 시각 t의 함수(무작위는 고정 씨앗). render.js가 프레임마다 window.__seek3d(t)를 부른다.
import { THREE, W, H, createStage, addNebula, addStars, addDust, glowSprite, rng, ROOMS, roomColor, smooth, easeOut, easeInOut, lerp, clamp } from "./mystic3d.js";

const DUR = 15;
const canvas = document.querySelector("canvas.gl");
const stage = createStage(canvas, { fov: 40, fog: 0.006 });
const { scene, camera, renderer } = stage;
renderer.autoClear = false;

// ── 시각표
const T_HOOK_IN = 0.22, T_HOOK_OUT = 1.72;
const HITS = [2.05, 3.85, 5.65]; // 세 문장 꽂힘
const T_FINAL = 7.6; // "들켰죠?"
const T_SHATTER = 8.15;
const FLY = 0.2; // 날아오는 시간
const T_RING = 9.3, T_END = 11.7;

// ── 화면 좌표: 거울 면(z=0)에서 1단위 = 약 251px (카메라 z 10.5, fov 40), 화면 가운데 = 세계 y 0.55
const CAM_Z = 10.5, CAM_Y = 0.55;

// ── 빛
scene.add(new THREE.AmbientLight("#3a2440", 0.5));
const key = new THREE.DirectionalLight("#ffd9b0", 1.4);
key.position.set(-4, 6, 8);
scene.add(key);
const rimL = new THREE.PointLight("#ff4a2a", 0, 18, 1.6);
rimL.position.set(0, 1.5, 2.5);
scene.add(rimL);

const nebula = addNebula(stage, { seed: 9.3, c1: [0.42, 0.05, 0.1], c2: [0.16, 0.04, 0.3] });
const stars = addStars(stage, { count: 4200, seed: 41 });
const dust = addDust(stage, { count: 260, box: [9, 10, 14], center: [0, 0.6, 2], color: "#ff9a6a", seed: 23, speed: 0.08, opacity: 0.45 });

// ═════════ 글자 그리기 (캔버스) ═════════
const SERIF900 = '"Noto Serif KR", "Gowun Batang", serif';
const BATANG = '"Gowun Batang", "Noto Serif KR", serif';
const CINZEL = '"Cinzel", "Gowun Batang", serif';
// 한 덩어리(여러 줄)를 (cx, cy)를 가운데로 그린다. glow: 붉은 빛 번짐, shadow: 어두운 받침
function drawLines(x, lines, { font, size, lh = 1.28, cx, cy, fill = "#fff", glow = null, glowBlur = 0, shadow = 0, track = 0 }) {
  x.save();
  x.font = `${font.weight} ${size}px ${font.family}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  if (track) x.letterSpacing = `${track}px`;
  const n = lines.length;
  lines.forEach((t, i) => {
    const y = cy + (i - (n - 1) / 2) * size * lh;
    if (shadow) {
      x.shadowColor = "rgba(0,0,0,0.95)";
      x.shadowBlur = shadow;
      x.fillStyle = "rgba(0,0,0,0.9)";
      x.fillText(t, cx, y);
    }
    if (glow) {
      x.shadowColor = glow;
      x.shadowBlur = glowBlur;
      x.fillStyle = glow;
      x.fillText(t, cx, y);
      x.fillText(t, cx, y);
    }
    x.shadowBlur = 0;
    x.fillStyle = fill;
    x.fillText(t, cx, y);
  });
  x.restore();
}
const F900 = { weight: 900, family: SERIF900 };
const FB7 = { weight: 700, family: BATANG };
const FB4 = { weight: 400, family: BATANG };
const FC7 = { weight: 700, family: CINZEL };

// ── 거울에 꽂히는 문장 (거울 좌표: 거울 바닥 가운데 = (0,0), 세계 y = 거울 y - 2.9)
const MIRROR_W = 4.0, MIRROR_H = 6.6, MIRROR_Y0 = -2.9;
const BLOCKS = [
  { lines: ["괜찮다는 말,", "오늘 몇 번 했어요?"], y: 2.85, size: 0.29, t: HITS[0], tilt: -0.1 },
  { lines: ["먼저 연락 안 하는 거,", "자존심 아니죠."], y: 1.75, size: 0.29, t: HITS[1], tilt: 0.09 },
  { lines: ["다 맞춰 주고,", "집에 와서 혼자 지치죠."], y: 0.65, size: 0.29, t: HITS[2], tilt: -0.07 },
  { lines: ["들켰죠?"], y: 1.75, size: 0.95, t: T_FINAL, tilt: 0.05 },
];
const ETCH_PX = 256; // 거울 글자 텍스처: 1단위 = 256px
const ETCH_W = Math.round(MIRROR_W * ETCH_PX), ETCH_H = Math.round(MIRROR_H * ETCH_PX);

// 글자 텍스처 두 장: core(RGBA = 문장 1·2·3·들켰죠의 글자), glow(같은 칸에 붉은 번짐 세기)
//   캔버스에 그대로 합치면 알파 0인 곳의 RGB가 지워지므로(캔버스는 미리 곱한 알파) 바이트 배열로 직접 모은다. 줄 순서는 아래가 0
function packed(drawOne) {
  const data = new Uint8Array(ETCH_W * ETCH_H * 4);
  const t = document.createElement("canvas");
  t.width = ETCH_W;
  t.height = ETCH_H;
  const x = t.getContext("2d", { willReadFrequently: true });
  BLOCKS.forEach((b, k) => {
    x.clearRect(0, 0, ETCH_W, ETCH_H);
    drawOne(x, b);
    const d = x.getImageData(0, 0, ETCH_W, ETCH_H).data;
    for (let yy = 0; yy < ETCH_H; yy++) {
      const src = yy * ETCH_W * 4, dst = (ETCH_H - 1 - yy) * ETCH_W * 4;
      for (let xx = 0; xx < ETCH_W; xx++) data[dst + xx * 4 + k] = d[src + xx * 4 + 3];
    }
  });
  const tex = new THREE.DataTexture(data, ETCH_W, ETCH_H, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
const etchY = (b) => ETCH_H - (b.y - MIRROR_Y0) * ETCH_PX; // 거울 좌표 y → 캔버스 y(위가 0)
let etchCore, etchGlow;
function drawEtch() {
  etchCore = packed((x, b) => drawLines(x, b.lines, { font: F900, size: b.size * ETCH_PX, cx: ETCH_W / 2, cy: etchY(b) }));
  etchGlow = packed((x, b) => {
    x.filter = `blur(${Math.round(b.size * ETCH_PX * 0.22)}px)`;
    drawLines(x, b.lines, { font: F900, size: b.size * ETCH_PX, cx: ETCH_W / 2, cy: etchY(b) });
    x.filter = "none";
  });
}

// ═════════ 거울: 처음부터 파편들로 이루어진 면. 금 = 파편의 경계 ═════════
const R = rng(20261024);
const CENTER = new THREE.Vector2(1.05, BLOCKS[3].y - MIRROR_Y0 - 0.62); // 금의 중심(거울 좌표): "들켰죠?" 오른쪽 아래 — 글자가 금 중심에 묻히지 않게
const RAYS = 20;
const RINGS = [0.22, 0.5, 0.9, 1.4, 2.0, 2.75, 3.7, 7.5];
const rayA = [];
for (let i = 0; i < RAYS; i++) rayA.push(((i + 0.15 + R() * 0.7) / RAYS) * Math.PI * 2);
const ringR = []; // [ray][ring] 반지름(살짝 들쭉날쭉)
for (let i = 0; i < RAYS; i++) ringR.push(RINGS.map((r, j) => (j === RINGS.length - 1 ? r : r * (0.86 + R() * 0.28))));
const pt = (i, j) => {
  const a = rayA[i % RAYS], r = ringR[i % RAYS][j];
  return new THREE.Vector2(CENTER.x + Math.cos(a) * r, CENTER.y + Math.sin(a) * r);
};
// 아치(볼록 다각형, 반시계)
const archPoly = (() => {
  const r = MIRROR_W / 2, p = [new THREE.Vector2(-r, 0), new THREE.Vector2(r, 0)];
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * Math.PI;
    p.push(new THREE.Vector2(Math.cos(a) * r, MIRROR_H - r + Math.sin(a) * r));
  }
  return p;
})();
// Sutherland–Hodgman: 볼록 다각형 clip 안쪽만 남김
function clipPoly(poly, clip) {
  let out = poly;
  for (let e = 0; e < clip.length; e++) {
    const a = clip[e], b = clip[(e + 1) % clip.length];
    const inside = (p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
    const inter = (p, q) => {
      const d1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      const d2 = (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
      return p.clone().lerp(q, d1 / (d1 - d2));
    };
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const p = inp[i], q = inp[(i + 1) % inp.length];
      if (inside(q)) {
        if (!inside(p)) out.push(inter(p, q));
        out.push(q);
      } else if (inside(p)) out.push(inter(p, q));
    }
    if (!out.length) break;
  }
  return out;
}
const area = (p) => p.reduce((s, a, i) => s + a.x * p[(i + 1) % p.length].y - p[(i + 1) % p.length].x * a.y, 0) / 2;

const mirrorMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    uTime: { value: 0 },
    uImp: { value: [0, 1, 2].map(() => new THREE.Vector4(0, 0, 99, 0)) },
    uOn: { value: new THREE.Vector4() }, // 문장별 글자 켜짐
    uHeat: { value: new THREE.Vector4() }, // 문장별 달아오름(꽂힌 직후 하얗게)
    uCore: { value: null },
    uGlowT: { value: null },
    uMainAge: { value: -1 },
    uCenter: { value: CENTER.clone() },
    uRayA: { value: rayA },
    uRingR: { value: ringR.flat() },
    uSmoke: { value: 0.25 },
    uBack: { value: 0 },
    uSize: { value: new THREE.Vector2(MIRROR_W, MIRROR_H) },
  },
  vertexShader: `
    attribute vec2 aO; varying vec2 vO; varying vec3 vN; varying vec3 vW;
    void main(){ vO = aO; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0)); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `
    #define RAYS ${RAYS}
    #define RINGS ${RINGS.length}
    varying vec2 vO; varying vec3 vN; varying vec3 vW;
    uniform float uTime; uniform vec4 uImp[3]; uniform vec4 uOn; uniform vec4 uHeat; uniform sampler2D uCore; uniform sampler2D uGlowT;
    uniform float uMainAge; uniform vec2 uCenter; uniform float uRayA[RAYS]; uniform float uRingR[RAYS*RINGS]; uniform float uSmoke; uniform float uBack; uniform vec2 uSize;
    float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
    vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
    float noise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*(3.0-2.0*f);
      return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x), mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                 mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x), mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
    float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.07; a*=0.5; } return v; }
    float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
    // 작은 별 모양 금(세 문장이 꽂힌 자리)
    float star(vec2 p, vec4 im, float id){
      float age = uTime - im.z; if (age < 0.0) return 9.0;
      float grow = 1.0 - exp(-age * 16.0);
      float d = 9.0;
      for (int i = 0; i < 9; i++){
        float fi = float(i);
        float a = (fi + h1(id*13.0+fi) * 0.8) / 9.0 * 6.28318;
        float len = im.w * (0.4 + 0.8 * h1(id*7.0 + fi*3.1)) * grow;
        vec2 dir = vec2(cos(a), sin(a)), nrm = vec2(-dir.y, dir.x);
        vec2 m1 = im.xy + dir*len*0.45 + nrm*(h1(fi+id*3.0)-0.5)*len*0.22;
        d = min(d, min(seg(p, im.xy, m1), seg(p, m1, im.xy + dir*len)));
      }
      float r = length(p - im.xy);
      float chip = step(0.45, h1(floor(atan(p.y-im.y, p.x-im.x) * 2.5) + id));
      d = min(d, abs(r - im.w*0.24*grow) + (1.0 - chip) * 9.0);
      return d;
    }
    float mainCrack(vec2 p){
      if (uMainAge < 0.0) return 9.0;
      float reach = 7.0 * (1.0 - exp(-uMainAge * 5.5));
      vec2 q = p - uCenter; float r = length(q);
      float ang = atan(q.y, q.x); if (ang < 0.0) ang += 6.28318;
      float d = 9.0;
      // 칸 찾기: ang이 들어가는 두 살(ray) 사이
      int s = RAYS - 1;
      for (int i = 0; i < RAYS; i++){ if (ang >= uRayA[i]) s = i; }
      int s2 = s + 1; if (s2 >= RAYS) s2 = 0;
      float a1 = uRayA[s], a2 = uRayA[s2];
      vec2 d1 = vec2(cos(a1), sin(a1)), d2 = vec2(cos(a2), sin(a2));
      if (r < reach){
        d = min(d, abs(q.x*d1.y - q.y*d1.x));
        d = min(d, abs(q.x*d2.y - q.y*d2.x));
      }
      for (int j = 0; j < RINGS - 1; j++){
        float r1 = uRingR[s*RINGS + j], r2 = uRingR[s2*RINGS + j];
        if (max(r1, r2) < reach) d = min(d, seg(q, d1*r1, d2*r2));
      }
      return d;
    }
    void main(){
      vec2 p = vO;
      vec3 V = normalize(cameraPosition - vW);
      vec3 N = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
      float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 3.0);
      // 검은 유리 속 연기
      float t = uTime;
      float sm = fbm(vec3(p * 0.85, t * 0.12));
      float sm2 = fbm(vec3(p * 1.9 + 3.0, -t * 0.18));
      vec3 col = vec3(0.012, 0.008, 0.02);
      col += vec3(0.20, 0.05, 0.22) * smoothstep(0.0, 0.6, sm) * uSmoke;
      col += vec3(0.45, 0.06, 0.04) * smoothstep(0.1, 0.7, sm2) * uSmoke * 0.6 * (0.4 + uBack);
      // 비치는 빛: 사선 띠 + 가장자리
      float band = smoothstep(0.35, 0.0, abs(dot(p - vec2(0.0, 3.3), normalize(vec2(1.0, -0.55))) - 0.9 + 0.15 * sin(t * 0.4)));
      col += vec3(0.5, 0.42, 0.55) * band * 0.06;
      col += vec3(0.85, 0.55, 0.45) * fres * 0.35;
      // 글자 (꽂힌 문장)
      vec2 uv = vec2((p.x + uSize.x * 0.5) / uSize.x, p.y / uSize.y);
      vec4 core = texture2D(uCore, uv) * uOn;
      vec4 gl = texture2D(uGlowT, uv) * uOn;
      float c = max(max(core.x, core.y), max(core.z, core.w));
      float heat = dot(core, uHeat) ;
      float g = gl.x + gl.y + gl.z + gl.w * 1.4;
      col += vec3(1.0, 0.16, 0.06) * g * 0.42;
      col = mix(col, vec3(1.0, 0.97, 0.94) * (1.15 + heat * 2.2), c);
      // 금
      float d = 9.0;
      for (int k = 0; k < 3; k++) d = min(d, star(p, uImp[k], float(k) + 1.0));
      float dm = mainCrack(p);
      float core1 = smoothstep(0.009, 0.002, d);
      float glow1 = exp(-d * 55.0);
      float ageMin = 99.0; for (int k = 0; k < 3; k++){ float a = uTime - uImp[k].z; if (a >= 0.0) ageMin = min(ageMin, a); }
      float hot = 0.9 + 2.6 * exp(-ageMin * 6.0);
      col += mix(vec3(1.0, 0.3, 0.12), vec3(1.0, 0.92, 0.85), core1) * (core1 * 1.3 + glow1 * 0.3) * hot;
      float coreM = smoothstep(0.011, 0.002, dm);
      float glowM = exp(-dm * 90.0);
      float hotM = uMainAge < 0.0 ? 0.0 : 0.8 + 1.6 * exp(-uMainAge * 6.0) + 1.0 * uBack;
      col += mix(vec3(1.0, 0.3, 0.08), vec3(1.0, 0.93, 0.85), coreM) * (coreM * 1.4 + glowM * 0.35) * hotM;
      if (!gl_FrontFacing) col *= 0.35;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
});

const mirror = new THREE.Group();
mirror.position.set(0, MIRROR_Y0, 0);
scene.add(mirror);
const shards = [];
for (let i = 0; i < RAYS; i++) {
  for (let j = 0; j < RINGS.length; j++) {
    const poly = j === 0 ? [CENTER.clone(), pt(i, 0), pt(i + 1, 0)] : [pt(i, j - 1), pt(i, j), pt(i + 1, j), pt(i + 1, j - 1)];
    if (area(poly) < 0) poly.reverse();
    const cl = clipPoly(poly, archPoly);
    if (cl.length < 3 || Math.abs(area(cl)) < 1e-4) continue;
    const cx = cl.reduce((s, p) => s + p.x, 0) / cl.length, cy = cl.reduce((s, p) => s + p.y, 0) / cl.length;
    const pos = [], o = [];
    for (let k = 1; k < cl.length - 1; k++) {
      for (const p of [cl[0], cl[k], cl[k + 1]]) {
        pos.push(p.x - cx, p.y - cy, 0);
        o.push(p.x, p.y);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aO", new THREE.Float32BufferAttribute(o, 2));
    const m = new THREE.Mesh(g, mirrorMat);
    m.position.set(cx, cy, 0);
    m.frustumCulled = false;
    mirror.add(m);
    const dir = new THREE.Vector2(cx - CENTER.x, cy - CENTER.y);
    const dist = dir.length();
    dir.normalize();
    shards.push({
      m, home: new THREE.Vector3(cx, cy, 0), dir, dist, ring: j,
      sp: (1.25 - Math.min(1, dist / 4) * 0.7) * (0.8 + R() * 0.6),
      vz: 0.3 + R() * 3.4,
      axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(),
      spin: 1.5 + R() * 5,
    });
  }
}
// 금테
function archAt(w, h, y0, seg = 64) {
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, y0);
  s.lineTo(r, y0);
  s.lineTo(r, y0 + h - r);
  s.absarc(0, y0 + h - r, r, 0, Math.PI, false);
  s.lineTo(-r, y0);
  return s;
}
const frameShape = archAt(MIRROR_W + 0.34, MIRROR_H + 0.3, -0.13);
const hole = new THREE.Path();
{
  const r = MIRROR_W / 2 - 0.01;
  hole.moveTo(-r, 0.01);
  hole.lineTo(-r, MIRROR_H - r);
  hole.absarc(0, MIRROR_H - r, r, Math.PI, 0, true);
  hole.lineTo(r, 0.01);
  hole.lineTo(-r, 0.01);
}
frameShape.holes.push(hole);
const frameMat = new THREE.MeshStandardMaterial({ color: "#c99a52", metalness: 1, roughness: 0.28, emissive: "#ff3b1a", emissiveIntensity: 0.0 });
const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 64 }), frameMat);
frame.position.z = -0.12;
mirror.add(frame);
// 거울 뒤 몸체(파편이 빠지면 뒤는 빈 하늘)
const backGlow = glowSprite(new THREE.Color("#ffb070"), 4, 0);
backGlow.position.set(0, BLOCKS[3].y, -2.2);
scene.add(backGlow);
const backGlow2 = glowSprite(new THREE.Color("#ff3818"), 12, 0);
backGlow2.position.set(0, BLOCKS[3].y, -4);
scene.add(backGlow2);

// ═════════ 날아와 꽂히는 문장 판 (꽂히는 순간 거울 글자로 바뀐다) ═════════
const FLY_PX = 512;
const flyers = BLOCKS.map((b, k) => {
  const wU = MIRROR_W, hU = b.size * 1.28 * b.lines.length + b.size * 1.2;
  const c = document.createElement("canvas");
  c.width = Math.round(wU * FLY_PX);
  c.height = Math.round(hU * FLY_PX);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false, color: new THREE.Color(1.3, 1.25, 1.2) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wU, hU), mat);
  mesh.renderOrder = 5;
  scene.add(mesh);
  // 잔상 3장(움직임 번짐)
  const ghosts = [1, 2, 3].map((g) => {
    const gm = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, toneMapped: false, color: new THREE.Color(1, 0.35, 0.25) }));
    gm.renderOrder = 4;
    scene.add(gm);
    return gm;
  });
  return { b, k, c, tex, mesh, mat, ghosts, draw() {
    const x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height);
    const s = b.size * FLY_PX;
    drawLines(x, b.lines, { font: F900, size: s, cx: c.width / 2, cy: c.height / 2, glow: "rgba(255,40,16,0.95)", glowBlur: s * 0.35 });
    tex.needsUpdate = true;
  } };
});
function placeFlyer(f, t) {
  const b = f.b;
  const u = (t - (b.t - FLY)) / FLY; // 0 → 1 (꽂힘)
  const show = u >= 0 && u < 1.0;
  const pose = (uu) => {
    const e = uu * uu * uu; // 점점 빨라짐
    const z = lerp(CAM_Z - 0.9, 0.04, e);
    return { z, rot: lerp(b.tilt * 4, 0, e), y: lerp(CAM_Y + (b.y - CAM_Y) * 0.25, b.y, e) };
  };
  const p = pose(clamp(u));
  f.mesh.visible = show;
  f.mesh.position.set(0, p.y, p.z);
  f.mesh.rotation.z = p.rot;
  f.mat.opacity = show ? clamp(u * 4) : 0;
  f.ghosts.forEach((g, i) => {
    const q = pose(clamp(u - (i + 1) * 0.09));
    g.visible = show && u - (i + 1) * 0.09 > 0;
    g.position.set(0, q.y, q.z);
    g.rotation.z = q.rot;
    g.material.opacity = (0.32 / (i + 1)) * (show ? 1 : 0);
  });
}

// ═════════ 일곱 방 문장(紋章) 고리 ═════════
const SIG = {
  saju: ["M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5", "M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6Z", "M15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6"],
  ogham: ["M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20"],
  star: ["M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z"],
  decan: ["M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30"],
  tzolkin: ["M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5"],
  rune: ["M14 3V37M14 14L28 5M14 23L28 14"],
  sibyl: ["M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20"],
};
// 고리는 뒤로 눕혀(타원으로 보임) 위아래 자막 자리를 비운다. 화면에서 고리 가운데 ≈ 위에서 790px
const RING_Z = -16, RING_Y = 0.75, RING_R = 1.6, RING_TILT = -1.08, RING_LOOK = RING_Y - 0.55;
const sigRing = new THREE.Group();
sigRing.position.set(0, RING_Y, RING_Z);
sigRing.rotation.x = RING_TILT;
scene.add(sigRing);
const spinner = new THREE.Group();
sigRing.add(spinner);
const sigs = ROOMS.map((room, k) => {
  const col = roomColor(room, 0.6, 0.95);
  const css = `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.translate(48, 48);
  x.scale(4, 4);
  x.lineCap = x.lineJoin = "round";
  x.strokeStyle = "#fff6e6";
  x.shadowColor = css;
  x.shadowBlur = 6;
  x.lineWidth = 1.9;
  SIG[room].forEach((d) => x.stroke(new Path2D(d)));
  x.shadowBlur = 0;
  x.lineWidth = 1.2;
  SIG[room].forEach((d) => x.stroke(new Path2D(d)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const holder = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, color: new THREE.Color(1.6, 1.4, 1.2) }));
  const halo = glowSprite(col, 0.95, 0);
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.298, 64), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  holder.add(halo, disc, m);
  spinner.add(holder);
  return { holder, m, halo, disc, k };
});
const ringLine = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.008, 8, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.9), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
spinner.add(ringLine);
const coreGlow = glowSprite(new THREE.Color("#ffcf8a"), 2.6, 0);
coreGlow.position.set(0, RING_Y, RING_Z);
scene.add(coreGlow);
const _q = new THREE.Quaternion();

// ═════════ 구멍을 지날 때 빛줄기(빠르기에 따라 길어짐) ═════════
const STREAKS = 340;
const streakPos = new Float32Array(STREAKS * 6);
const streakBase = [];
{
  const RS = rng(77);
  for (let i = 0; i < STREAKS; i++) {
    const a = RS() * Math.PI * 2, r = 0.9 + Math.pow(RS(), 0.7) * 5.5;
    streakBase.push({ x: Math.cos(a) * r, y: 0.9 + Math.sin(a) * r, z: -22 + RS() * 30 });
  }
}
const streakGeo = new THREE.BufferGeometry();
streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPos, 3));
const streakMat = new THREE.LineBasicMaterial({ color: new THREE.Color(2.2, 1.5, 1.1), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const streaks = new THREE.LineSegments(streakGeo, streakMat);
streaks.frustumCulled = false;
scene.add(streaks);

// ═════════ 화면 글자층(HUD): 픽셀 좌표 직교 카메라. 따로 그려 후처리에서 톤 매핑 없이 얹는다 ═════════
const hud = new THREE.Scene();
const hudCam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);
function hudText(wPx, hPx, draw) {
  const c = document.createElement("canvas");
  c.width = wPx;
  c.height = hPx;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wPx, hPx), mat);
  hud.add(mesh);
  const o = {
    mesh, mat, c, tex,
    redraw(arg) {
      const x = c.getContext("2d");
      x.clearRect(0, 0, wPx, hPx);
      draw(x, wPx, hPx, arg);
      tex.needsUpdate = true;
    },
    at(pxY) { mesh.position.set(0, H / 2 - pxY, 0); return o; }, // 화면 위에서 pxY(가운데)
  };
  return o;
}
const hook = hudText(1000, 240, (x, w, h) => drawLines(x, ["이 광고,", "넘기려고 했죠?"], { font: FB7, size: 74, lh: 1.32, cx: w / 2, cy: h / 2, shadow: 26, glow: "rgba(255,60,30,0.5)", glowBlur: 30 })).at(560);
const cap1 = hudText(1000, 240, (x, w, h) => drawLines(x, ["일곱 개의 방이,", "당신 속을 끝까지 읽어요"], { font: FB7, size: 64, lh: 1.36, cx: w / 2, cy: h / 2, shadow: 26 })).at(372);
const cap2 = hudText(1000, 120, (x, w, h) => drawLines(x, ["결제하면, 듣기 싫은 말까지 전부"], { font: F900, size: 50, cx: w / 2, cy: h / 2, fill: "#ffd9c6", glow: "rgba(255,50,20,0.85)", glowBlur: 22, shadow: 18 })).at(1212);
const dim = hudText(1080, 1100, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.55);
  g.addColorStop(0, "rgba(4,2,10,0.82)");
  g.addColorStop(1, "rgba(4,2,10,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}).at(820);
const eyebrow = hudText(900, 70, (x, w, h) => drawLines(x, ["STRANGE ORACLE"], { font: FC7, size: 34, cx: w / 2, cy: h / 2, fill: "#c9a96a", track: 10 })).at(640);
const logo = hudText(1000, 200, (x, w, h, shine = -1) => {
  x.save();
  x.font = `700 132px ${BATANG}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.letterSpacing = "8px";
  x.shadowColor = "rgba(255,170,80,0.55)";
  x.shadowBlur = 40;
  const g = x.createLinearGradient(0, 0, w, 0);
  const s = shine;
  g.addColorStop(0, "#b8904c");
  if (s > 0.05 && s < 0.95) {
    g.addColorStop(Math.max(0.01, s - 0.12), "#e6c37a");
    g.addColorStop(s, "#fff6dc");
    g.addColorStop(Math.min(0.99, s + 0.12), "#e6c37a");
  } else g.addColorStop(0.5, "#ecca82");
  g.addColorStop(1, "#b8904c");
  x.fillStyle = g;
  x.fillText("낯선 점술관", w / 2, h / 2);
  x.restore();
}).at(760);
const cta = hudText(1000, 120, (x, w, h) => drawLines(x, ["당신의 방, 지금 열기"], { font: F900, size: 62, cx: w / 2, cy: h / 2, fill: "#ffe2a8", glow: "rgba(255,120,40,0.6)", glowBlur: 24, shadow: 16 })).at(960);
const note = hudText(1000, 80, (x, w, h) => drawLines(x, ["책 전체 9,900원 · 한 번 결제"], { font: FB4, size: 34, cx: w / 2, cy: h / 2, fill: "rgba(225,215,240,0.85)", shadow: 12 })).at(1050);

// ═════════ 후처리: 장면(HDR) → 번짐 빛(1/4) → 합성(색 갈라짐·글리치·번쩍임·붉은 기운·비네트·입자) + HUD ═════════
const rtScene = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const rtHud = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
const BW = W / 4, BH = H / 4;
const rtA = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType });
const rtB = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType });
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadScene = new THREE.Scene();
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
quad.frustumCulled = false;
quadScene.add(quad);
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const brightMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, uTh: { value: 1.1 } }, vertexShader: VS, depthTest: false, toneMapped: false,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tSrc; uniform float uTh;
    void main(){ vec2 px = vec2(1.0/${W}.0, 1.0/${H}.0) * 1.5; vec3 c = vec3(0.0);
      c += texture2D(tSrc, vUv + px*vec2(-1,-1)).rgb; c += texture2D(tSrc, vUv + px*vec2(1,-1)).rgb; c += texture2D(tSrc, vUv + px*vec2(-1,1)).rgb; c += texture2D(tSrc, vUv + px*vec2(1,1)).rgb;
      c *= 0.25; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, uTh + 0.6, l), 1.0); }`,
});
const blurMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, toneMapped: false,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uDir;
    void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2;
      float w[4]; w[0]=0.18; w[1]=0.14; w[2]=0.09; w[3]=0.05;
      for (int i = 1; i <= 4; i++){ vec2 o = uDir * float(i) * 1.6; c += (texture2D(tSrc, vUv + o).rgb + texture2D(tSrc, vUv - o).rgb) * w[i-1]; }
      gl_FragColor = vec4(c, 1.0); }`,
});
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: rtScene.texture }, tBloom: { value: rtA.texture }, tHud: { value: rtHud.texture },
    uTime: { value: 0 }, uChroma: { value: 0 }, uFlash: { value: 0 }, uRed: { value: 0 }, uGlitch: { value: 0 }, uBloom: { value: 1 },
    uVig: { value: 1 }, uDesat: { value: 0 }, uBarrel: { value: 0 }, uFrame: { value: 0 }, uInv: { value: 0 }, uZoom: { value: 0 }, uZoomC: { value: 0.5 },
  },
  vertexShader: VS, depthTest: false,
  fragmentShader: `varying vec2 vUv;
    uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tHud;
    uniform float uTime; uniform float uChroma; uniform float uFlash; uniform float uRed; uniform float uGlitch; uniform float uBloom; uniform float uVig; uniform float uDesat; uniform float uBarrel; uniform float uFrame; uniform float uInv; uniform float uZoom; uniform float uZoomC;
    float hash(float n){ return fract(sin(n) * 43758.5453); }
    float hash2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 cc = uv - 0.5;
      uv = 0.5 + cc * (1.0 - uBarrel * dot(cc, cc));
      // 글리치: 가로 띠가 옆으로 밀림 (프레임마다 다른 띠, 씨앗 고정)
      float fr = floor(uFrame / 2.0);
      float band = floor(uv.y * 34.0 + hash(fr) * 7.0);
      float on = step(0.72, hash(band * 1.7 + fr * 3.1));
      float shift = (hash(band + fr * 9.3) - 0.5) * 0.09 * uGlitch * on;
      float fine = (hash2(vec2(floor(uv.y * 380.0), fr)) - 0.5) * 0.004 * uGlitch;
      uv.x += shift + fine;
      vec2 dir = normalize(cc + 1e-5) * (uChroma + uGlitch * on * 0.012);
      vec3 s = vec3(0.0);
      vec2 toC = vec2(0.5, uZoomC) - uv;
      for (int i = 0; i < 10; i++){
        vec2 o = toC * (float(i) / 9.0) * uZoom;
        s.r += texture2D(tScene, uv + o + dir).r;
        s.g += texture2D(tScene, uv + o).g;
        s.b += texture2D(tScene, uv + o - dir).b;
      }
      s /= 10.0;
      vec3 bl = texture2D(tBloom, uv).rgb;
      vec3 col = s + bl * uBloom;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(lum) * vec3(1.05, 0.95, 1.0), uDesat);
      col += vec3(0.9, 0.06, 0.02) * uRed * (0.35 + lum);
      col = mix(col, vec3(2.4, 2.2, 2.1), uFlash);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      // HUD(톤 매핑 없이). 같은 글리치·색 갈라짐을 받는다
      vec4 hr = texture2D(tHud, uv + dir * 0.7); vec4 hg = texture2D(tHud, uv); vec4 hb = texture2D(tHud, uv - dir * 0.7);
      vec4 h = vec4(hr.r, hg.g, hb.b, max(hg.a, max(hr.a, hb.a)));
      gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - hg.a) + h.rgb;
      // 비네트·입자
      float v = smoothstep(0.95, 0.25, length(cc * vec2(0.85, 1.0)) * uVig);
      gl_FragColor.rgb *= mix(0.25, 1.0, v);
      vec2 fc = gl_FragCoord.xy + vec2(fr * 5.588238, fr * 3.17);
      gl_FragColor.rgb += (fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715)))) - 0.5) * 0.035;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), uFlash * 0.6);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0) - clamp(gl_FragColor.rgb, 0.0, 1.0), uInv);
      #include <colorspace_fragment>
    }`,
});
function pass(mat, target) {
  quad.material = mat;
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(quadScene, quadCam);
}
stage.post = (t) => {
  renderer.setRenderTarget(rtScene);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(rtHud);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(hud, hudCam);
  renderer.setClearColor(0x000000, 1);
  brightMat.uniforms.tSrc.value = rtScene.texture;
  pass(brightMat, rtA);
  for (let i = 0; i < 2; i++) {
    blurMat.uniforms.tSrc.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(1 / BW, 0);
    pass(blurMat, rtB);
    blurMat.uniforms.tSrc.value = rtB.texture;
    blurMat.uniforms.uDir.value.set(0, 1 / BH);
    pass(blurMat, rtA);
  }
  pass(postMat, null);
};

// ═════════ 시간에 따른 움직임 ═════════
const decay = (t, t0, k) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);
const IMPACTS = [...HITS, T_FINAL];
// 파편 시간 늘이기: 처음 0.1초는 빠르게 터지고, 느린 화면, 그다음 다시 빨라짐
const warp = (dt) => (dt <= 0 ? 0 : 0.55 * (1 - Math.exp(-dt / 0.06)) + 0.22 * dt + 0.9 * Math.pow(Math.max(0, dt - 1.0), 2));
// 심장 소리 시점(소리판과 같은 값)
const BEATS = [0.1, 0.42, 6.95, 7.22];

stage.on((t) => {
  // ── 카메라
  let z = lerp(11.4, CAM_Z, easeOut(t / 2.0));
  z += -0.25 * smooth(2.0, 6.8, t); // 세 문장 동안 조금씩 다가감
  z += 0.55 * smooth(6.85, 7.45, t) * (1 - smooth(7.6, 7.75, t)); // 숨 멈춤: 물러섬 → 일격에 다시
  const through = easeInOut((t - 8.45) / 1.35); // 구멍 통과
  z = lerp(z, -7.2, through);
  let x = 0.12 * Math.sin(t * 0.7) * (1 - through), y = CAM_Y + 0.06 * Math.sin(t * 0.9 + 1);
  y = lerp(y, BLOCKS[3].y - 0.15, smooth(8.2, 9.3, t) * (1 - smooth(9.4, 10.6, t)));
  y = lerp(y, RING_LOOK, smooth(9.4, 10.6, t));
  let shake = 0;
  IMPACTS.forEach((ti, i) => (shake += (i === 3 ? 0.16 : 0.07 + i * 0.012) * decay(t, ti, 9)));
  shake += 0.2 * decay(t, T_SHATTER, 6);
  const sx = shake * (Math.sin(t * 91) + 0.5 * Math.sin(t * 157)), sy = shake * (Math.cos(t * 83) + 0.5 * Math.sin(t * 131));
  camera.position.set(x + sx, y + sy, z);
  let fov = 40 - 3.2 * IMPACTS.reduce((s, ti) => s + decay(t, ti, 10), 0) + 12 * Math.sin(Math.PI * clamp((t - 8.45) / 1.35)) - 2 * smooth(10, 15, t);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  const lookZ = lerp(0, RING_Z, smooth(8.6, 9.9, t));
  const toRing = smooth(9.4, 10.6, t);
  camera.lookAt(x * 0.3, lerp(lerp(CAM_Y, BLOCKS[3].y, smooth(7.0, 8.2, t)), RING_LOOK, toRing), lookZ);
  camera.rotateZ(0.04 * smooth(6.9, 7.5, t) * (1 - smooth(7.6, 7.8, t)) + 0.015 * Math.sin(t * 0.5) + shake * 0.25 * Math.sin(t * 71));

  // ── 거울 글자·금
  const u = mirrorMat.uniforms;
  u.uTime.value = t;
  HITS.forEach((ti, k) => u.uImp.value[k].set(0, BLOCKS[k].y - MIRROR_Y0 + (k - 1) * 0.04, ti, 0.75 + k * 0.12));
  // 꽂힌 자리: 문장 가운데보다 살짝 옆(글자가 금에 가리지 않게) — 왼쪽·오른쪽 번갈아
  u.uImp.value[0].x = -1.35;
  u.uImp.value[1].x = 1.4;
  u.uImp.value[2].x = -1.2;
  const fade = 1 - smooth(T_FINAL - 0.05, T_FINAL + 0.25, t) * 0.72; // "들켰죠?"가 오면 세 문장은 어둡게
  u.uOn.value.set(...[0, 1, 2].map((k) => (t >= BLOCKS[k].t ? fade : 0)), t >= T_FINAL ? 1 : 0);
  u.uHeat.value.set(...BLOCKS.map((b, k) => (k === 3 ? 0.45 : 1) * decay(t, b.t, 4.5)));
  u.uMainAge.value = t >= T_FINAL ? t - T_FINAL : -1;
  u.uSmoke.value = 0.25 + 0.25 * smooth(2, 6, t) - 0.18 * smooth(6.9, 7.4, t) * (1 - smooth(7.6, 7.8, t));
  u.uBack.value = smooth(T_FINAL, T_SHATTER, t);

  // ── 파편
  const dt = t - T_SHATTER;
  const w = warp(dt);
  shards.forEach((s) => {
    if (dt <= 0) {
      s.m.position.copy(s.home);
      s.m.quaternion.identity();
      s.m.visible = true;
      // 터지기 직전 떨림
      const tr = smooth(T_SHATTER - 0.3, T_SHATTER, t) * 0.012;
      s.m.position.x += tr * Math.sin(t * 140 + s.dist * 9);
      s.m.position.y += tr * Math.cos(t * 120 + s.dist * 7);
      return;
    }
    const sp = s.sp * (s.ring === 0 ? 1.5 : 1);
    s.m.position.set(s.home.x + s.dir.x * sp * w * 0.85, s.home.y + s.dir.y * sp * w * 0.85 - 0.1 * w * w, s.home.z + s.vz * w * 2.6);
    s.m.quaternion.setFromAxisAngle(s.axis, s.spin * w);
    // 카메라에 너무 가까운 파편은 감춤(화면을 덮지 않게)
    const wz = s.m.position.z + mirror.position.z;
    s.m.visible = camera.position.z - wz > 0.35;
  });
  frameMat.emissiveIntensity = 0.15 * BEATS.reduce((s, b) => s + decay(t, b, 7), 0) + 0.6 * decay(t, T_FINAL, 3) + 1.2 * decay(t, T_SHATTER, 2);
  rimL.intensity = 3 * IMPACTS.reduce((s, ti) => s + decay(t, ti, 5), 0) + 25 * decay(t, T_SHATTER, 1.4);
  backGlow.material.opacity = 0.4 * smooth(T_SHATTER - 0.02, T_SHATTER + 0.08, t) * (1 - 0.8 * smooth(8.6, 9.4, t));
  backGlow.scale.setScalar(2 + 2.5 * easeOut(dt / 1.2) * (dt > 0 ? 1 : 0));
  backGlow2.material.opacity = 0.1 * smooth(T_SHATTER - 0.02, T_SHATTER + 0.3, t) * (1 - smooth(8.8, 9.5, t));
  frame.visible = camera.position.z > -0.6;

  // ── 빛줄기: 카메라가 빠를수록 길고 밝게
  const speed = (17.8 * (easeInOut((t + 0.02 - 8.45) / 1.35) - easeInOut((t - 0.02 - 8.45) / 1.35))) / 0.04; // 구멍 통과 속도(단위/초, 시각의 함수)
  const sl = Math.min(4, speed * 0.22);
  streakBase.forEach((b, i) => {
    streakPos.set([b.x, b.y, b.z, b.x, b.y, b.z + sl + 0.02], i * 6);
  });
  streakGeo.attributes.position.needsUpdate = true;
  streakMat.opacity = Math.min(1, speed / 9) * 0.9;
  streaks.visible = speed > 0.3;

  // ── 날아오는 문장
  flyers.forEach((f) => placeFlyer(f, t));

  // ── 일곱 문장 고리
  const ringIn = smooth(T_RING - 0.3, T_RING + 0.6, t);
  sigRing.visible = t > 8.3;
  spinner.rotation.z = -t * 0.35 + 0.6;
  const endS = smooth(T_END - 0.1, T_END + 0.8, t);
  sigRing.scale.setScalar(lerp(0.85, 1, ringIn) * lerp(1, 2.3, easeInOut(endS))); // 끝 화면: 고리가 화면 밖으로 퍼지며 옅어짐
  sigRing.updateMatrixWorld(true);
  spinner.getWorldQuaternion(_q).invert().multiply(camera.quaternion); // 문장은 늘 카메라를 보고 바로 선 채로
  sigs.forEach((s) => {
    const a = Math.PI / 2 + (s.k / 7) * Math.PI * 2;
    s.holder.position.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0);
    s.holder.quaternion.copy(_q);
    const ig = clamp((t - (T_RING + 0.15 + s.k * 0.11)) / 0.25);
    const pop = ig > 0 ? 1 + 0.9 * Math.exp(-(t - (T_RING + 0.15 + s.k * 0.11)) * 7) : 0.001;
    s.holder.scale.setScalar(pop);
    s.m.material.opacity = ig * (1 - 0.9 * endS);
    s.halo.material.opacity = ig * (0.45 + 0.55 * Math.exp(-(t - (T_RING + 0.15 + s.k * 0.11)) * 3)) * (1 - 0.94 * endS);
    s.disc.material.opacity = ig * 0.8 * (1 - 0.9 * endS);
  });
  ringLine.material.opacity = 0.7 * smooth(T_RING + 0.2, T_RING + 1.2, t) * (1 - 0.88 * endS);
  coreGlow.material.opacity = 0.6 * smooth(T_RING + 0.9, T_RING + 1.6, t) * (1 - 0.5 * endS);
  coreGlow.scale.setScalar(2.2 + 0.4 * Math.sin(t * 2));

  // ── 하늘
  nebula.mat.uniforms.uDim.value = 0.55 + 0.25 * smooth(2, 6, t) - 0.35 * smooth(6.9, 7.4, t) * (1 - smooth(7.6, 7.9, t)) + 0.12 * smooth(T_SHATTER, 9.5, t);
  stars.mat.uniforms.uOpacity.value = 0.6 + 0.4 * smooth(8, 10, t);
  dust.mat.uniforms.uOpacity.value = 0.35 + 0.45 * smooth(T_SHATTER, 9, t);
  renderer.toneMappingExposure = 1.05 - 0.35 * smooth(6.9, 7.4, t) * (1 - smooth(7.58, 7.62, t));

  // ── HUD
  const hookA = smooth(T_HOOK_IN, T_HOOK_IN + 0.12, t) * (1 - smooth(T_HOOK_OUT, T_HOOK_OUT + 0.14, t));
  const flick = t < T_HOOK_IN + 0.3 ? (Math.sin(t * 173) > -0.2 ? 1 : 0.25) : 1; // 들어올 때 깜빡임
  hook.mat.opacity = hookA * flick;
  cap1.mat.opacity = smooth(9.6, 9.85, t) * (1 - smooth(T_END - 0.25, T_END, t));
  cap1.mesh.position.y = H / 2 - 372 + 14 * (1 - easeOut((t - 9.6) / 0.4));
  cap2.mat.opacity = smooth(10.3, 10.4, t) * (1 - smooth(T_END - 0.25, T_END, t));
  cap2.mesh.scale.setScalar(1 + 0.35 * decay(t, 10.3, 14));
  dim.mat.opacity = smooth(T_END - 0.1, T_END + 0.6, t);
  eyebrow.mat.opacity = smooth(T_END + 0.05, T_END + 0.5, t);
  logo.mat.opacity = smooth(T_END, T_END + 0.4, t);
  logo.mesh.scale.setScalar(lerp(1.12, 1, easeOut((t - T_END) / 0.6)));
  const shine = clamp((t - (T_END + 0.5)) / 0.9);
  if (t > T_END && (shine < 1 || logo._s !== 1)) {
    logo.redraw(shine < 1 ? shine : -1);
    logo._s = shine < 1 ? 0 : 1;
  }
  cta.mat.opacity = smooth(12.4, 12.65, t);
  cta.mesh.scale.setScalar(1 + 0.25 * decay(t, 12.4, 10));
  note.mat.opacity = smooth(12.85, 13.1, t);

  // ── 후처리 값
  const P = postMat.uniforms;
  P.uTime.value = t;
  P.uFrame.value = Math.round(t * 30);
  P.uFlash.value = clamp(HITS.reduce((s, ti) => s + 0.38 * decay(t, ti, 36), 0) + 0.55 * decay(t, T_FINAL, 30) + 0.9 * decay(t, T_SHATTER, 30));
  // 한 프레임 반전(마지막 일격·깨짐)
  P.uInv.value = [T_FINAL, T_SHATTER].some((ti) => t >= ti && t < ti + 1 / 30) ? 1 : 0;
  // 날아오는 동안 가운데로 빨려 드는 번짐
  let zb = 0, zc = 0.5;
  BLOCKS.forEach((b) => {
    const k = (t - (b.t - FLY)) / FLY;
    if (k > 0 && k < 1) { zb = Math.max(zb, 0.16 * Math.sin(Math.PI * k * 0.9)); zc = 0.5 + (b.y - CAM_Y) / 7.64; }
    zb = Math.max(zb, 0.07 * decay(t, b.t, 14));
  });
  zb = Math.max(zb, 0.12 * decay(t, T_SHATTER, 5));
  P.uZoom.value = zb;
  P.uZoomC.value = zc;
  P.uChroma.value = 0.0012 + IMPACTS.reduce((s, ti) => s + 0.011 * decay(t, ti, 7), 0) + 0.02 * decay(t, T_SHATTER, 3) + 0.004 * Math.sin(Math.PI * clamp((t - 8.45) / 1.35));
  P.uRed.value = IMPACTS.reduce((s, ti) => s + 0.3 * decay(t, ti, 4), 0) + 0.15 * smooth(6.9, 7.4, t) * (1 - smooth(7.6, 7.7, t));
  let gl = 0.7 * (smooth(T_HOOK_IN - 0.02, T_HOOK_IN + 0.04, t) * (1 - smooth(T_HOOK_IN + 0.12, T_HOOK_IN + 0.3, t)));
  gl += 0.9 * smooth(T_HOOK_OUT - 0.04, T_HOOK_OUT + 0.04, t) * (1 - smooth(T_HOOK_OUT + 0.14, T_HOOK_OUT + 0.24, t));
  gl += IMPACTS.reduce((s, ti) => s + 0.6 * decay(t, ti, 11), 0) + 0.8 * decay(t, T_SHATTER, 6);
  gl += t > 6.95 && t < 7.45 ? 0.35 * (Math.sin(t * 61) > 0.85 ? 1 : 0) : 0; // 숨 멈춤 동안 가끔 튐
  gl += 0.4 * decay(t, 10.3, 9);
  P.uGlitch.value = gl;
  P.uBarrel.value = IMPACTS.reduce((s, ti) => s + 0.35 * decay(t, ti, 9), 0) + 0.5 * decay(t, T_SHATTER, 4);
  P.uDesat.value = 0.45 * smooth(6.9, 7.4, t) * (1 - smooth(7.58, 7.62, t));
  P.uVig.value = 1.0 + 0.25 * smooth(6.9, 7.4, t) * (1 - smooth(7.6, 7.8, t)) - 0.1 * smooth(T_END, 13, t);
  P.uBloom.value = 1.0 + 0.3 * smooth(T_SHATTER, 8.6, t) * (1 - smooth(9.2, 10, t));
});

window.__ready3d = (async () => {
  await document.fonts.ready;
  const sample = "괜찮다는 말, 오늘 몇 번 했어요? 먼저 연락 안 하는 거, 자존심 아니죠. 다 맞춰 주고, 집에 와서 혼자 지치죠. 들켰죠? 이 광고, 넘기려고 했죠? 일곱 개의 방이, 당신 속을 끝까지 읽어요 결제하면, 듣기 싫은 말까지 전부 낯선 점술관 당신의 방, 지금 열기 책 전체 9,900원 · 한 번 결제";
  await Promise.all([`900 80px ${SERIF900}`, `700 80px ${BATANG}`, `400 34px ${BATANG}`, `700 34px ${CINZEL}`].map((f) => document.fonts.load(f, sample + " STRANGE ORACLE")));
  drawEtch();
  mirrorMat.uniforms.uCore.value = etchCore;
  mirrorMat.uniforms.uGlowT.value = etchGlow;
  flyers.forEach((f) => f.draw());
  [hook, cap1, cap2, dim, eyebrow, cta, note].forEach((o) => o.redraw());
  logo.redraw(-1);
  stage.seek(0);
})();
window.__seek3d = (t) => stage.seek(t);
const t0 = performance.now();
(async function loop() {
  await window.__ready3d;
  const tick = () => {
    if (document.documentElement.classList.contains("is-paused")) return;
    stage.seek(((performance.now() - t0) / 1000) % DUR);
    requestAnimationFrame(tick);
  };
  tick();
})();
