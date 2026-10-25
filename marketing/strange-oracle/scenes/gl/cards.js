// 광고 5·6안 공용 (2026-10-25): 일곱 방 카드(앞면 = 방 문장·이름·문화·결과 이름, 뒷면 = 금빛 무늬)와 사주 원국 카드.
// 글자는 모두 제품의 공개 화면 문장(방 이름·결과 이름)이다. 유료 문장 0.
import { THREE, roomColor, glowSprite } from "./mystic3d.js";
import { BATANG, CINZEL, SERIF900 } from "./fx.js";

export const SIG = {
  saju: ["M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5", "M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6Z", "M15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6"],
  ogham: ["M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20"],
  star: ["M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z"],
  decan: ["M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30"],
  tzolkin: ["M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5"],
  rune: ["M14 3V37M14 14L28 5M14 23L28 14"],
  sibyl: ["M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20"],
};
// 방 정보(제품 data.js와 같은 이름). result = 공개 결과 이름 예시
export const ROOM_INFO = {
  saju: { num: "Ⅰ", name: "만신의 방", origin: "한국 · 사주 명리", result: "곧게 선 큰 나무" },
  ogham: { num: "Ⅱ", name: "오검의 방", origin: "켈트 · 나무 문자", result: "버티는 방패" },
  star: { num: "Ⅲ", name: "베다의 방", origin: "인도 · 베다 점성술", result: "므리가시라" },
  decan: { num: "Ⅳ", name: "데칸의 방", origin: "이집트 · 데칸", result: "마음을 읽는 이" },
  tzolkin: { num: "Ⅴ", name: "촐킨의 방", origin: "마야 · 촐킨 달력", result: "4 태양군주" },
  rune: { num: "Ⅵ", name: "룬의 방", origin: "북유럽 · 룬", result: "페후 · 케나즈 · 이사" },
  sibyl: { num: "Ⅶ", name: "시빌라 신탁의 방", origin: "로마 · 시빌라 신탁", result: "봉인 풀린 항아리" },
};
const css = (c) => `rgb(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0})`;

function roundRect(x, X, Y, w, h, r) {
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + w, Y, X + w, Y + h, r);
  x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r);
  x.arcTo(X, Y, X + w, Y, r);
  x.closePath();
}
function frame(x, w, h, col) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#160f2a");
  g.addColorStop(1, "#0a0716");
  roundRect(x, 6, 6, w - 12, h - 12, 34);
  x.fillStyle = g;
  x.fill();
  const r = x.createRadialGradient(w / 2, h * 0.36, 10, w / 2, h * 0.36, w * 0.7);
  r.addColorStop(0, col.replace("rgb", "rgba").replace(")", ",0.32)"));
  r.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = r;
  x.fill();
  x.lineWidth = 4;
  x.strokeStyle = col;
  x.shadowColor = col;
  x.shadowBlur = 18;
  roundRect(x, 10, 10, w - 20, h - 20, 30);
  x.stroke();
  x.shadowBlur = 0;
  x.lineWidth = 1.5;
  x.globalAlpha = 0.5;
  roundRect(x, 26, 26, w - 52, h - 52, 22);
  x.stroke();
  x.globalAlpha = 1;
}
function sigil(x, paths, cx, cy, size, col) {
  x.save();
  const k = size / 40;
  x.translate(cx - size / 2, cy - size / 2);
  x.scale(k, k);
  x.lineCap = x.lineJoin = "round";
  x.strokeStyle = col;
  x.shadowColor = col;
  x.shadowBlur = 10;
  x.lineWidth = 1.8;
  paths.forEach((d) => x.stroke(new Path2D(d)));
  x.shadowBlur = 0;
  x.strokeStyle = "#fff6e8";
  x.lineWidth = 0.8;
  paths.forEach((d) => x.stroke(new Path2D(d)));
  x.restore();
}
function text(x, t, cx, cy, font, fill, opts = {}) {
  x.save();
  x.font = font;
  x.textAlign = "center";
  x.textBaseline = "middle";
  if (opts.track) x.letterSpacing = `${opts.track}px`;
  if (opts.glow) {
    x.shadowColor = opts.glow;
    x.shadowBlur = opts.blur || 16;
  }
  x.fillStyle = fill;
  let size = parseFloat(/(\d+)px/.exec(font)[1]);
  while (opts.max && x.measureText(t).width > opts.max && size > 20) {
    size -= 2;
    x.font = font.replace(/\d+px/, `${size}px`);
  }
  x.fillText(t, cx, cy);
  x.restore();
}

// 방 카드 앞면 (600x900 캔버스)
export function drawRoomCard(x, w, h, room, { showResult = true } = {}) {
  const info = ROOM_INFO[room];
  const col = css(roomColor(room, 0.66, 0.85));
  frame(x, w, h, col);
  text(x, info.num, w / 2, 92, `700 46px ${CINZEL}`, col, { glow: col });
  sigil(x, SIG[room], w / 2, 300, 230, col);
  text(x, info.name, w / 2, 520, `700 60px ${BATANG}`, "#f7f0e2", { max: w - 90 });
  text(x, info.origin, w / 2, 590, `400 34px ${BATANG}`, "rgba(225,215,240,0.85)", { max: w - 90 });
  if (showResult) {
    x.save();
    x.globalAlpha = 0.9;
    roundRect(x, 60, 668, w - 120, 150, 20);
    x.fillStyle = "rgba(255,240,210,0.07)";
    x.fill();
    x.strokeStyle = "rgba(236,202,130,0.55)";
    x.lineWidth = 2;
    x.stroke();
    x.restore();
    text(x, "나는", w / 2, 708, `400 28px ${BATANG}`, "rgba(236,202,130,0.9)");
    text(x, `‘${info.result}’`, w / 2, 768, `900 46px ${SERIF900}`, "#ecca82", { max: w - 150, glow: "rgba(255,180,90,0.5)" });
  }
}
// 사주 원국 카드 (600x900): 네 기둥 + 결과 이름
export function drawSajuChart(x, w, h, { title = "곧게 선 큰 나무", sub = "갑목 · 태어난 날의 하늘 글자" } = {}) {
  const col = css(roomColor("saju", 0.66, 0.85));
  frame(x, w, h, col);
  text(x, "Ⅰ  만신의 방", w / 2, 84, `700 38px ${BATANG}`, col, { glow: col });
  text(x, "사주 · 여덟 글자", w / 2, 132, `400 28px ${BATANG}`, "rgba(225,215,240,0.8)");
  const P = [["丙", "寅"], ["甲", "戌"], ["辛", "巳"], ["庚", "午"]];
  const cw = 106, gap = 18, X0 = (w - (cw * 4 + gap * 3)) / 2;
  P.forEach(([a, b], i) => {
    const X = X0 + i * (cw + gap), day = i === 1;
    roundRect(x, X, 180, cw, 330, 16);
    x.fillStyle = day ? "rgba(242,165,133,0.18)" : "rgba(255,255,255,0.05)";
    x.fill();
    x.strokeStyle = day ? col : "rgba(236,202,130,0.4)";
    x.lineWidth = day ? 3 : 1.5;
    x.stroke();
    text(x, a, X + cw / 2, 270, `700 74px ${SERIF900}`, day ? "#fff1e6" : "#e9dcc4", { glow: day ? col : null });
    text(x, b, X + cw / 2, 420, `700 74px ${SERIF900}`, "#e9dcc4");
  });
  text(x, title, w / 2, 610, `900 58px ${SERIF900}`, "#f7f0e2", { max: w - 80, glow: "rgba(255,170,120,0.35)" });
  text(x, sub, w / 2, 676, `400 30px ${BATANG}`, "rgba(225,215,240,0.85)", { max: w - 80 });
  text(x, "낯선 점술관", w / 2, 820, `700 30px ${BATANG}`, "rgba(236,202,130,0.75)", { track: 4 });
}
// 카드 뒷면: 금빛 문양
export function drawCardBack(x, w, h) {
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2a1c10");
  g.addColorStop(1, "#140d08");
  roundRect(x, 6, 6, w - 12, h - 12, 34);
  x.fillStyle = g;
  x.fill();
  x.strokeStyle = "#d6ae66";
  x.lineWidth = 4;
  roundRect(x, 12, 12, w - 24, h - 24, 30);
  x.stroke();
  x.save();
  x.translate(w / 2, h / 2);
  x.strokeStyle = "rgba(214,174,102,0.8)";
  x.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    x.rotate((Math.PI * 2) / 7);
    x.beginPath();
    x.ellipse(0, -120, 40, 120, 0, 0, Math.PI * 2);
    x.stroke();
  }
  x.beginPath();
  x.arc(0, 0, 230, 0, Math.PI * 2);
  x.stroke();
  x.beginPath();
  x.arc(0, 0, 60, 0, Math.PI * 2);
  x.fillStyle = "rgba(236,202,130,0.9)";
  x.fill();
  x.restore();
}

// 카드 한 장(앞·뒤 두 면 + 뒤 빛). 크기 w×h(세계 단위)
export function makeCard({ front, back = drawCardBack, w = 2.4, h = 3.6, glow = "#ffcf8a", px = 600 }) {
  const mk = (draw) => {
    const c = document.createElement("canvas");
    c.width = px;
    c.height = Math.round((px * h) / w);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { c, tex, draw: () => { const x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height); draw(x, c.width, c.height); tex.needsUpdate = true; } };
  };
  const F = mk(front), B = mk(back);
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w, h);
  const fm = new THREE.MeshBasicMaterial({ map: F.tex, transparent: true, side: THREE.FrontSide, color: new THREE.Color(1.15, 1.12, 1.1) });
  const bm = new THREE.MeshBasicMaterial({ map: B.tex, transparent: true, side: THREE.FrontSide });
  const fMesh = new THREE.Mesh(geo, fm);
  const bMesh = new THREE.Mesh(geo, bm);
  bMesh.rotation.y = Math.PI;
  const halo = glowSprite(new THREE.Color(glow), Math.max(w, h) * 1.6, 0.35);
  halo.position.z = -0.1;
  g.add(halo, fMesh, bMesh);
  return { group: g, halo, front: fm, back: bm, draw() { F.draw(); B.draw(); }, setOpacity(a) { fm.opacity = a; bm.opacity = a; halo.material.opacity = 0.35 * a; fMesh.visible = bMesh.visible = a > 0.002; } }; // 다 사라진 카드가 깊이만 남아 뒤의 빛을 네모나게 가리지 않게
}
