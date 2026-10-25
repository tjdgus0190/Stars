// 인스타그램 2판 3D 배경 (2026-10-25). 광고 3D판과 같은 부품(../scenes/gl/mystic3d.js)으로 정지 화면 한 장을 그린다.
//   ?type=ring   일곱 방 문장 고리 + 가운데 금빛 문 (프로필·소개)
//   ?type=mirror 금이 간 검은 아치 거울, 금 사이로 붉은 빛 (들켰죠 계열)
//   ?type=void   성운·별·금빛 먼지·먼 천문 고리만 (글자 카드)
//   &w=1080&h=1350 크기 · &cy=0.45 고리/거울 가운데(위에서 비율) · &s=1 크기 배율 · &hue=violet|red · &t=4 시각(초) · &dim=1 고리 밝기
// render-ig2.js가 window.__ready3d를 기다렸다가 찍는다. 무작위는 고정 씨앗이라 다시 찍어도 같다.
import { THREE, addNebula, addStars, addDust, addAstrolabe, glowSprite, rng, ROOMS, roomColor, clamp } from "../scenes/gl/mystic3d.js";

const P = new URLSearchParams(location.search);
const W = Number(P.get("w") || 1080), H = Number(P.get("h") || 1350);
const TYPE = P.get("type") || "void";
const CY = Number(P.get("cy") || 0.45);
const S = Number(P.get("s") || 1);
const HUE = P.get("hue") || (TYPE === "mirror" ? "red" : "violet");
const T = Number(P.get("t") || 4);
const DIM = Number(P.get("dim") || 1);

const canvas = document.querySelector("canvas.gl");
canvas.width = W;
canvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#07050f");
scene.fog = new THREE.FogExp2("#0b0718", 0.01);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
const updaters = [];
const stage = { THREE, renderer, scene, camera, on: (f) => updaters.push(f) };

// 화면 좌표 → 세계(z=0) : 카메라 z=10, 세로 화면 높이 = 2*10*tan(20°)
const CAM_Z = 10;
const VIEW_H = 2 * CAM_Z * Math.tan((20 * Math.PI) / 180);
const PX = H / VIEW_H; // z=0에서 1단위 = PX 픽셀
const yAt = (frac) => (0.5 - frac) * VIEW_H; // 위에서 frac 비율 자리의 세계 y
camera.position.set(0, 0, CAM_Z);
camera.lookAt(0, 0, 0);

const C = HUE === "red" ? { c1: [0.42, 0.05, 0.1], c2: [0.16, 0.04, 0.3] } : { c1: [0.28, 0.1, 0.42], c2: [0.05, 0.22, 0.3] };
const nebula = addNebula(stage, { seed: HUE === "red" ? 9.3 : 5.7, ...C });
addStars(stage, { count: 4200, seed: 41 });
addDust(stage, { count: 240, box: [10, 12, 10], center: [0, 0, 2], color: HUE === "red" ? "#ff9a6a" : "#f3d48b", seed: 23, speed: 0.08, opacity: 0.5 });
scene.add(new THREE.AmbientLight("#5b4a8a", 0.45));
const key = new THREE.DirectionalLight("#ffdcae", 1.5);
key.position.set(-3, 5, 7);
scene.add(key);

// ── 일곱 문장 고리
const SIG = {
  saju: ["M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5", "M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6Z", "M15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6"],
  ogham: ["M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20"],
  star: ["M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z"],
  decan: ["M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30"],
  tzolkin: ["M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5"],
  rune: ["M14 3V37M14 14L28 5M14 23L28 14"],
  sibyl: ["M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20"],
  door: ["M9 37V17a11 11 0 0 1 22 0v20ZM5 37h30M20 6v31", "M16.5 24a1 1 0 1 0 0.01 0ZM23.5 24a1 1 0 1 0 0.01 0Z"],
};
function sigTexture(paths, css, size = 512, width = 1.9) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  const k = size / 40;
  x.scale(k, k);
  x.lineCap = x.lineJoin = "round";
  x.strokeStyle = "#fff4e2";
  x.shadowColor = css;
  x.shadowBlur = 3;
  x.lineWidth = width;
  paths.forEach((d) => x.stroke(new Path2D(d)));
  x.shadowBlur = 0;
  x.lineWidth = width * 0.6;
  paths.forEach((d) => x.stroke(new Path2D(d)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
const cssOf = (col) => `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;

if (TYPE === "ring") {
  const g = new THREE.Group();
  g.position.set(0, yAt(CY), 0);
  g.scale.setScalar(S);
  scene.add(g);
  const R = 1.55;
  const goldMat = new THREE.MeshStandardMaterial({ color: "#d8ad62", metalness: 1, roughness: 0.25, emissive: "#3b2508", emissiveIntensity: 0.7 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.028, 16, 240), goldMat);
  g.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.022, 16, 200), goldMat);
  g.add(inner);
  // 눈금
  const tick = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), goldMat, 84);
  const m = new THREE.Matrix4();
  for (let k = 0; k < 84; k++) {
    const a = (k / 84) * Math.PI * 2;
    m.compose(new THREE.Vector3(Math.cos(a) * (R + 0.09), Math.sin(a) * (R + 0.09), 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2), new THREE.Vector3(1, k % 12 === 0 ? 2 : 1, 1));
    tick.setMatrixAt(k, m);
  }
  g.add(tick);
  ROOMS.forEach((room, k) => {
    const a = Math.PI / 2 + (k / 7) * Math.PI * 2;
    const col = roomColor(room, 0.6, 0.9);
    const h = new THREE.Group();
    h.position.set(Math.cos(a) * R, Math.sin(a) * R, 0.02);
    // 메달: 금테 + 어두운 면 + 문장
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 64), goldMat);
    coin.rotation.x = Math.PI / 2;
    h.add(coin);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color("#120c22") }));
    face.position.z = 0.032;
    h.add(face);
    const sig = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: sigTexture(SIG[room], cssOf(col)), transparent: true, depthWrite: false, color: col.clone().lerp(new THREE.Color(1, 1, 1), 0.12).multiplyScalar(2.4 * DIM) }));
    sig.position.z = 0.04;
    h.add(sig);
    const halo = glowSprite(col, 1.3, 0.8 * DIM);
    halo.position.z = -0.05;
    h.add(halo);
    g.add(h);
  });
  // 가운데 문
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: sigTexture(SIG.door, "#ffb85a", 512, 1.6), transparent: true, depthWrite: false, color: new THREE.Color(2.0, 1.55, 0.9) }));
  door.position.z = 0.05;
  g.add(door);
  const core = glowSprite(new THREE.Color("#ffc874"), 2.4, 0.55);
  core.position.z = -0.1;
  g.add(core);
  g.rotation.set(0.0, 0.0, 0.0);
  const astro = addAstrolabe(stage, { radius: 3.4, position: [0, yAt(CY), -6], opacity: 0.22 });
}

if (TYPE === "mirror") {
  // 거울 면: 검은 유리 + 붉은 연기 + 금(별 모양 셋, 큰 거미줄 하나)
  const MW = 3.2 * S, MH = 5.2 * S;
  const g = new THREE.Group();
  g.position.set(0, yAt(CY) - MH * 0.5, 0);
  scene.add(g);
  const shape = new THREE.Shape();
  const r = MW / 2;
  shape.moveTo(-r, 0);
  shape.lineTo(r, 0);
  shape.lineTo(r, MH - r);
  shape.absarc(0, MH - r, r, 0, Math.PI, false);
  shape.lineTo(-r, 0);
  const R2 = rng(777);
  const imps = [[-0.75, 0.66], [0.8, 0.5], [-0.55, 0.32]].map(([fx, fy]) => new THREE.Vector3(fx * r, fy * MH, 0.55 + R2() * 0.3));
  const main = new THREE.Vector2(0.45 * r, 0.47 * MH);
  const rays = [];
  for (let i = 0; i < 18; i++) rays.push(((i + R2() * 0.7) / 18) * Math.PI * 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uImp: { value: imps }, uMain: { value: main }, uRay: { value: rays }, uT: { value: T } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vP; uniform vec3 uImp[3]; uniform vec2 uMain; uniform float uRay[18]; uniform float uT;
      float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
      vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
      float noise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*(3.0-2.0*f);
        return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x), mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                   mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x), mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
      float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.07; a*=0.5; } return v; }
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
      void main(){
        vec2 p = vP;
        vec3 col = vec3(0.012, 0.008, 0.02);
        col += vec3(0.20, 0.05, 0.22) * smoothstep(0.0, 0.6, fbm(vec3(p*0.85, uT*0.12))) * 0.45;
        col += vec3(0.45, 0.06, 0.04) * smoothstep(0.1, 0.7, fbm(vec3(p*1.9+3.0, -uT*0.18))) * 0.35;
        float band = smoothstep(0.35, 0.0, abs(dot(p - vec2(0.0, 2.6), normalize(vec2(1.0, -0.55))) - 0.7));
        col += vec3(0.5, 0.42, 0.55) * band * 0.06;
        float d = 9.0;
        for (int k = 0; k < 3; k++){
          vec3 im = uImp[k];
          for (int i = 0; i < 9; i++){
            float fi = float(i), id = float(k) + 1.0;
            float a = (fi + h1(id*13.0+fi)*0.8)/9.0*6.28318;
            float len = im.z * (0.4 + 0.8*h1(id*7.0+fi*3.1));
            vec2 dir = vec2(cos(a), sin(a)), nrm = vec2(-dir.y, dir.x);
            vec2 m1 = im.xy + dir*len*0.45 + nrm*(h1(fi+id*3.0)-0.5)*len*0.22;
            d = min(d, min(seg(p, im.xy, m1), seg(p, m1, im.xy + dir*len)));
          }
        }
        // 큰 거미줄
        vec2 q = p - uMain; float r = length(q); float dm = 9.0;
        for (int i = 0; i < 18; i++){ vec2 dr = vec2(cos(uRay[i]), sin(uRay[i])); if (dot(q, dr) > 0.0) dm = min(dm, abs(q.x*dr.y - q.y*dr.x)); }
        for (int j = 1; j < 5; j++){ float rr = 0.3 * pow(1.7, float(j)); dm = min(dm, abs(r - rr) + 9.0 * step(0.55, h1(floor(atan(q.y,q.x)*2.2) + float(j)*7.0))); }
        dm += smoothstep(1.6, 3.2, r) * 0.03; // 바깥으로 갈수록 가늘게 사라짐
        float core = smoothstep(0.007, 0.002, d) + smoothstep(0.008, 0.002, dm) * 0.8;
        float glow = exp(-d*60.0)*0.3 + exp(-dm*90.0)*0.3;
        col += mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.9, 0.82), clamp(core,0.0,1.0)) * (core*1.0 + glow) * 1.1;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 64), mat));
  // 금테
  const outer = new THREE.Shape();
  const ro = r + 0.16;
  outer.moveTo(-ro, -0.12);
  outer.lineTo(ro, -0.12);
  outer.lineTo(ro, MH - r);
  outer.absarc(0, MH - r, ro, 0, Math.PI, false);
  outer.lineTo(-ro, -0.12);
  const hole = new THREE.Path();
  hole.moveTo(-r, 0);
  hole.lineTo(-r, MH - r);
  hole.absarc(0, MH - r, r, Math.PI, 0, true);
  hole.lineTo(r, 0);
  hole.lineTo(-r, 0);
  outer.holes.push(hole);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3, curveSegments: 64 }), new THREE.MeshStandardMaterial({ color: "#c99a52", metalness: 1, roughness: 0.3, emissive: "#3b1a08", emissiveIntensity: 0.4 }));
  frame.position.z = -0.1;
  g.add(frame);
  const red = new THREE.PointLight("#ff4a2a", 1.2, 14, 1.6);
  red.position.set(0, yAt(CY), 2.5);
  scene.add(red);
}

if (TYPE === "void") {
  const a = addAstrolabe(stage, { radius: 3.6, position: [0, yAt(CY), -7], opacity: 0.24 * DIM });
  a.grp.children[a.grp.children.length - 1].visible = false; // 가운데 작은 빛 점은 글자 뒤에서 거슬려 뺌
}

nebula.mat.uniforms.uDim.value = TYPE === "void" ? 0.9 : 0.8;
window.__ready3d = (async () => {
  for (const f of updaters) f(T);
  renderer.render(scene, camera);
})();
