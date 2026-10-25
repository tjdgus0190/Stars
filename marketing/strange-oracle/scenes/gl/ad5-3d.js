// 5안 「언제까지 사주만」 3D (2026-10-25). 사주가 일곱 문 중 하나일 뿐이라는 걸 보여 준다.
// 시간표(초):
//   A 0~2.6   사주 원국 카드가 화면 가득 · "오늘도 사주 봤죠?"(0.25) → "언제까지 사주만 볼 거예요?"(1.35, 꽂힘)
//   B 2.6~4.6 카메라가 크게 물러나며 사주 카드가 일곱 장의 고리 가운데 한 장이었음이 드러남 · "사주는 일곱 문 중 하나일 뿐"(4.4)
//   C 4.9~10.9 고리가 돌며 여섯 방 카드가 1초마다 앞으로 · "켈트 · 인도 · 이집트 / 마야 · 북유럽 · 로마"(7.5)
//   D 11.0~12.2 일곱 장이 가운데 빛으로 빨려 듦 · "사주 밖의 나를 만나 보세요"
//   E 12.3~15 끝 화면: 낯선 점술관 · 일곱 개의 문, 지금 열기 · 책 전체 9,900원 · 한 번 결제
import { THREE, createStage, addNebula, addStars, addDust, addAstrolabe, glowSprite, ROOMS, roomColor, smooth, easeOut, easeInOut, lerp, clamp } from "./mystic3d.js";
import { createHud, createPost, drawLines, drawLogo, decay, F900, FB7, FB4, FC7, SERIF900, BATANG, CINZEL } from "./fx.js";
import { makeCard, drawRoomCard, drawSajuChart } from "./cards.js";

const DUR = 15;
const T_SLAM = 1.35, T_PULL = 2.6, T_SPIN = 4.9, T_GATHER = 11.0, T_END = 12.3;
const stage = createStage(document.querySelector("canvas.gl"), { fov: 40, fog: 0.008 });
const { scene, camera, renderer } = stage;
scene.add(new THREE.AmbientLight("#ffffff", 0.6));
const nebula = addNebula(stage, { seed: 5.7 });
addStars(stage, { count: 4200, seed: 41 });
const dust = addDust(stage, { count: 300, box: [14, 10, 18], center: [0, 0.5, -2], seed: 23, speed: 0.08, opacity: 0.55 });
const astro = addAstrolabe(stage, { radius: 5.5, position: [0, 0.4, -16], opacity: 0.22 });

// ── 일곱 장 고리 (가운데 C, 반지름 R). k=0 사주 원국 카드가 앞
const R = 4.0, C = new THREE.Vector3(0, 0, -R);
const STEP = (Math.PI * 2) / 7;
const ring = new THREE.Group();
scene.add(ring);
const cards = ROOMS.map((room, k) => {
  const col = roomColor(room, 0.6, 0.9);
  const card = makeCard({ front: k === 0 ? (x, w, h) => drawSajuChart(x, w, h) : (x, w, h) => drawRoomCard(x, w, h, room, { showResult: false }), glow: `#${col.getHexString()}` });
  ring.add(card.group);
  return { room, k, card };
});
const core = glowSprite(new THREE.Color("#ffd28a"), 2, 0);
core.position.set(0, 0, -1.2);
scene.add(core);

// ── HUD
const hud = createHud();
const c0 = hud.text(1000, 140, (x, w, h) => drawLines(x, ["오늘도 사주 봤죠?"], { font: FB7, size: 66, cx: w / 2, cy: h / 2, shadow: 26 })).at(360);
const c1 = hud.text(1040, 260, (x, w, h) => drawLines(x, ["언제까지", "사주만 볼 거예요?"], { font: F900, size: 88, lh: 1.2, cx: w / 2, cy: h / 2, shadow: 30, glow: "rgba(255,150,80,0.55)", glowBlur: 28 })).at(372);
const c2 = hud.text(1040, 240, (x, w, h) => drawLines(x, ["사주는", "일곱 문 중 하나일 뿐"], { font: F900, size: 80, lh: 1.25, cx: w / 2, cy: h / 2, shadow: 28, fill: "#fff3dc" })).at(400);
const c3 = hud.text(1040, 300, (x, w, h) => {
  drawLines(x, ["켈트 · 인도 · 이집트", "마야 · 북유럽 · 로마"], { font: FB7, size: 66, lh: 1.35, cx: w / 2, cy: 110, shadow: 26 });
  drawLines(x, ["일곱 문화의 점술이 같은 나를 읽어요"], { font: FB4, size: 38, cx: w / 2, cy: 250, shadow: 18, fill: "#ead9ff" });
}).at(392);
const c4 = hud.text(1040, 240, (x, w, h) => drawLines(x, ["사주 밖의 나를", "만나 보세요"], { font: F900, size: 90, lh: 1.25, cx: w / 2, cy: h / 2, shadow: 30, fill: "#ffe2a8", glow: "rgba(255,170,80,0.6)", glowBlur: 30 })).at(560);
const dim = hud.text(1080, 1100, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.55);
  g.addColorStop(0, "rgba(4,2,10,0.8)");
  g.addColorStop(1, "rgba(4,2,10,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}).at(820);
const eyebrow = hud.text(900, 70, (x, w, h) => drawLines(x, ["SEVEN ORACLES · ONE STORY"], { font: FC7, size: 30, cx: w / 2, cy: h / 2, fill: "#c9a96a", track: 8 })).at(650);
const logo = hud.text(1000, 200, (x, w, h, s) => drawLogo(x, w, h, s)).at(760);
const cta = hud.text(1000, 120, (x, w, h) => drawLines(x, ["일곱 개의 문, 지금 열기"], { font: F900, size: 62, cx: w / 2, cy: h / 2, fill: "#ffe2a8", glow: "rgba(255,120,40,0.6)", glowBlur: 24, shadow: 16 })).at(960);
const note = hud.text(1000, 80, (x, w, h) => drawLines(x, ["책 전체 9,900원 · 한 번 결제"], { font: FB4, size: 34, cx: w / 2, cy: h / 2, fill: "rgba(225,215,240,0.85)", shadow: 12 })).at(1050);

const post = createPost(stage, hud);
stage.post = post.render;

const rotAt = (t) => {
  let r = 0;
  for (let k = 1; k <= 6; k++) r += STEP * easeInOut((t - (T_SPIN + (k - 1))) / 0.55);
  return r;
};

stage.on((t) => {
  // ── 카메라
  const pull = easeInOut((t - T_PULL) / 1.6);
  const near = lerp(9.6, 9.0, smooth(0, T_PULL, t));
  let cz = lerp(near, 13.2, pull) - 1.6 * smooth(5, 11, t);
  let cy = lerp(0, 2.6, pull) - 0.6 * smooth(5, 11, t);
  cz = lerp(cz, 9.5, smooth(T_GATHER, T_END, t));
  cy = lerp(cy, 0.4, smooth(T_GATHER, T_END, t));
  const shake = 0.05 * decay(t, T_SLAM, 9);
  camera.position.set(0.25 * Math.sin(t * 0.4) * (1 - pull * 0.6) + shake * Math.sin(t * 90), cy + shake * Math.cos(t * 80), cz);
  const g2 = smooth(T_GATHER, T_END, t);
  camera.lookAt(0, lerp(lerp(0.55, -0.3, pull), 0, g2), lerp(lerp(0, -R * 0.55, pull), -1.2, g2)); // 처음엔 카드가 화면 아래쪽에 오게(위에 자막 자리)
  camera.fov = 40 - 2.5 * decay(t, T_SLAM, 10) + 6 * Math.sin(Math.PI * clamp((t - T_PULL) / 1.6));
  camera.updateProjectionMatrix();

  // ── 고리
  const rot = rotAt(t);
  const gather = easeInOut((t - T_GATHER) / 1.1);
  cards.forEach(({ k, card }) => {
    const a = k * STEP - rot;
    const p = new THREE.Vector3(C.x + R * Math.sin(a), C.y, C.z + R * Math.cos(a));
    const front = Math.max(0, Math.cos(a)); // 앞에 가까울수록 1
    const g = card.group;
    g.position.copy(p).lerp(new THREE.Vector3(0, 0, -1.2), gather);
    g.rotation.set(0, a + (k === 0 ? 0.08 * Math.sin(t * 0.7) * (1 - pull) : 0), 0);
    const hl = Math.pow(front, 8);
    g.scale.setScalar(lerp(1, 1.08, hl) * lerp(1, 0.15, gather));
    const appear = k === 0 ? 1 : smooth(T_PULL + 0.2 + k * 0.12, T_PULL + 1.0 + k * 0.12, t);
    card.setOpacity(appear * (1 - smooth(T_GATHER + 0.6, T_GATHER + 1.1, t)) * (0.55 + 0.45 * Math.max(hl, k === 0 && t < T_SPIN ? 1 : 0)));
    card.halo.material.opacity = 0.2 + 0.5 * hl * appear;
    if (k === 0) g.position.y += 0.05 * Math.sin(t * 1.3) * (1 - pull);
  });
  core.material.opacity = 0.9 * smooth(T_GATHER + 0.3, T_GATHER + 1.0, t) * (1 - 0.5 * smooth(T_END, 14, t));
  core.scale.setScalar(2 + 5 * smooth(T_GATHER + 0.3, T_GATHER + 1.2, t));
  astro.mat.opacity = 0.22 + 0.1 * smooth(T_END, 13.5, t);
  nebula.mat.uniforms.uDim.value = 0.8 + 0.2 * smooth(T_PULL, 4.5, t);
  dust.mat.uniforms.uOpacity.value = 0.5;

  // ── HUD
  c0.set(smooth(0.25, 0.45, t) * (1 - smooth(1.1, 1.3, t)), 10 * (1 - easeOut((t - 0.25) / 0.4)));
  c1.set(smooth(T_SLAM, T_SLAM + 0.06, t) * (1 - smooth(4.15, 4.35, t)), 0, 0.5 * decay(t, T_SLAM, 14));
  c2.set(smooth(4.4, 4.6, t) * (1 - smooth(7.3, 7.5, t)), 12 * (1 - easeOut((t - 4.4) / 0.4)));
  c3.set(smooth(7.55, 7.8, t) * (1 - smooth(10.75, 10.95, t)), 12 * (1 - easeOut((t - 7.55) / 0.4)));
  c4.set(smooth(11.0, 11.2, t) * (1 - smooth(12.1, 12.3, t)), 0, 0.25 * decay(t, 11.0, 10));
  dim.set(smooth(T_END - 0.1, T_END + 0.5, t));
  eyebrow.set(smooth(T_END + 0.05, T_END + 0.5, t));
  logo.set(smooth(T_END, T_END + 0.4, t), 0, 0.12 * (1 - easeOut((t - T_END) / 0.6)) * (t > T_END ? 1 : 0));
  const shine = clamp((t - (T_END + 0.5)) / 0.9);
  if (t > T_END && (shine < 1 || logo._s !== 1)) {
    logo.redraw(shine < 1 ? shine : -1);
    logo._s = shine < 1 ? 0 : 1;
  }
  cta.set(smooth(13.0, 13.25, t), 0, 0.2 * decay(t, 13.0, 10));
  note.set(smooth(13.4, 13.65, t));

  // ── 후처리
  const U = post.u;
  U.uFrame.value = Math.round(t * 30);
  U.uFlash.value = clamp(0.18 * decay(t, T_SLAM, 30) + 0.7 * decay(t, 12.05, 12));
  U.uChroma.value = 0.0012 + 0.012 * decay(t, T_SLAM, 7) + 0.004 * Math.sin(Math.PI * clamp((t - T_PULL) / 1.6));
  U.uGlitch.value = 0.5 * decay(t, T_SLAM, 12) + 0.25 * decay(t, 11.0, 10);
  U.uZoom.value = 0.1 * Math.sin(Math.PI * clamp((t - T_PULL) / 1.2)) + 0.12 * decay(t, 12.0, 6);
  U.uTint.value.set(0.18 * decay(t, T_SLAM, 5), 0.04 * decay(t, T_SLAM, 5), 0);
  U.uVig.value = 1.0 - 0.1 * smooth(T_END, 13, t);
  renderer.toneMappingExposure = 1.05;
});

window.__ready3d = (async () => {
  await document.fonts.ready;
  const sample = "오늘도 사주 봤죠? 언제까지 사주만 볼 거예요? 사주는 일곱 문 중 하나일 뿐 켈트 인도 이집트 마야 북유럽 로마 일곱 문화의 점술이 같은 나를 읽어요 사주 밖의 나를 만나 보세요 낯선 점술관 일곱 개의 문, 지금 열기 책 전체 9,900원 한 번 결제 만신의 방 오검의 방 베다의 방 데칸의 방 촐킨의 방 룬의 방 시빌라 신탁의 방 한국 사주 명리 켈트 나무 문자 인도 베다 점성술 이집트 데칸 마야 촐킨 달력 북유럽 룬 로마 시빌라 신탁 여덟 글자 곧게 선 큰 나무 갑목 태어난 날의 하늘 글자 丙寅甲戌辛巳庚午";
  await Promise.all([`900 80px ${SERIF900}`, `700 80px ${SERIF900}`, `700 80px ${BATANG}`, `400 34px ${BATANG}`, `700 34px ${CINZEL}`].map((f) => document.fonts.load(f, sample + " SEVEN ORACLES ONE STORY Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ")));
  cards.forEach(({ card }) => card.draw());
  hud.redrawAll();
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
