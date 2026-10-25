// 6안 「사주가 알려주지 않은 이야기」 3D (2026-10-25). 사주 결과 카드가 뒤집히고, 그 뒤에서 여섯 방의 결과 카드가 차례로 펼쳐진다.
// 시간표(초):
//   A 0~3.0   사주 결과 카드 · "사주는 여기까지 말해 줬죠"(0.3)
//   B 3.0~3.6 카드가 뒤집힘(금빛 뒷면) · 3.3 "사주가 알려주지 않은 이야기"(꽂힘) · 여섯 장이 뒤에서 날아옴
//   C 3.9~9.4 카메라가 여섯 장을 1.05초마다 하나씩 지나감(카드: 방 문장·이름·문화·"나는 '결과 이름'") · 6.4 "같은 나, 일곱 개의 다른 이야기"
//   D 10.2~12.1 카메라가 물러나며 일곱 장이 한 묶음(책)으로 · "일곱 점술을 한 권의 책으로"
//   E 12.3~15 끝 화면: 낯선 점술관 · 사주 다음 장, 지금 열기 · 책 전체 9,900원 · 한 번 결제
import { THREE, createStage, addNebula, addStars, addDust, addAstrolabe, glowSprite, ROOMS, roomColor, smooth, easeOut, easeInOut, lerp, clamp } from "./mystic3d.js";
import { createHud, createPost, drawLines, drawLogo, decay, F900, FB7, FB4, FC7, SERIF900, BATANG, CINZEL } from "./fx.js";
import { makeCard, drawRoomCard, drawSajuChart } from "./cards.js";

const DUR = 15;
const T_FLIP = 3.0, T_SLAM = 3.3, T_PAN = 3.9, PAN_STEP = 1.05, T_BOOK = 10.2, T_END = 12.3;
const stage = createStage(document.querySelector("canvas.gl"), { fov: 40, fog: 0.008 });
const { scene, camera, renderer } = stage;
const nebula = addNebula(stage, { seed: 7.7, c1: [0.34, 0.08, 0.3], c2: [0.06, 0.18, 0.32] });
addStars(stage, { count: 4200, seed: 43 });
const dust = addDust(stage, { count: 320, box: [26, 10, 14], center: [7, 0.5, -1], seed: 29, speed: 0.08, opacity: 0.5 });
const astro = addAstrolabe(stage, { radius: 6, position: [7.25, 0.6, -18], opacity: 0.2 });

const GAP = 2.9, Y0 = -0.3;
const OTHER = ROOMS.slice(1);
const xOf = (k) => k * GAP; // 여섯 장 k=0..5
const MID = xOf(2.5);
// 사주 결과 카드
const saju = makeCard({ front: (x, w, h) => drawSajuChart(x, w, h), glow: "#f2a585" });
scene.add(saju.group);
// 여섯 장
const six = OTHER.map((room, k) => {
  const col = roomColor(room, 0.6, 0.9);
  const card = makeCard({ front: (x, w, h) => drawRoomCard(x, w, h, room, { showResult: true }), glow: `#${col.getHexString()}` });
  scene.add(card.group);
  return { room, k, card };
});
const bookGlow = glowSprite(new THREE.Color("#ffd28a"), 3, 0);
bookGlow.position.set(MID, Y0, -0.5);
scene.add(bookGlow);

// ── HUD
const hud = createHud();
const c0 = hud.text(1040, 240, (x, w, h) => drawLines(x, ["사주는", "여기까지 말해 줬죠"], { font: FB7, size: 76, lh: 1.3, cx: w / 2, cy: h / 2, shadow: 28 })).at(372);
const c1 = hud.text(1040, 260, (x, w, h) => drawLines(x, ["사주가 알려주지 않은", "이야기"], { font: F900, size: 88, lh: 1.2, cx: w / 2, cy: h / 2, shadow: 30, fill: "#ffe2a8", glow: "rgba(255,150,80,0.6)", glowBlur: 30 })).at(372);
const c2 = hud.text(1040, 240, (x, w, h) => drawLines(x, ["같은 나,", "일곱 개의 다른 이야기"], { font: F900, size: 80, lh: 1.25, cx: w / 2, cy: h / 2, shadow: 28, fill: "#fff3dc" })).at(372);
const c3 = hud.text(1040, 240, (x, w, h) => drawLines(x, ["일곱 점술을", "한 권의 책으로"], { font: F900, size: 84, lh: 1.25, cx: w / 2, cy: h / 2, shadow: 30, fill: "#ffe2a8", glow: "rgba(255,170,80,0.55)", glowBlur: 28 })).at(372);
const dim = hud.text(1080, 1100, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.55);
  g.addColorStop(0, "rgba(4,2,10,0.82)");
  g.addColorStop(1, "rgba(4,2,10,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}).at(820);
const eyebrow = hud.text(900, 70, (x, w, h) => drawLines(x, ["SEVEN ORACLES · ONE STORY"], { font: FC7, size: 30, cx: w / 2, cy: h / 2, fill: "#c9a96a", track: 8 })).at(650);
const logo = hud.text(1000, 200, (x, w, h, s) => drawLogo(x, w, h, s)).at(760);
const cta = hud.text(1000, 120, (x, w, h) => drawLines(x, ["사주 다음 장, 지금 열기"], { font: F900, size: 62, cx: w / 2, cy: h / 2, fill: "#ffe2a8", glow: "rgba(255,120,40,0.6)", glowBlur: 24, shadow: 16 })).at(960);
const note = hud.text(1000, 80, (x, w, h) => drawLines(x, ["책 전체 9,900원 · 한 번 결제"], { font: FB4, size: 34, cx: w / 2, cy: h / 2, fill: "rgba(225,215,240,0.85)", shadow: 12 })).at(1050);

const post = createPost(stage, hud);
stage.post = post.render;

// 카메라가 보는 x: 처음 0(사주) → 여섯 장을 차례로 → 가운데
function camX(t) {
  let x = 0;
  for (let k = 0; k < 6; k++) {
    const t0 = T_PAN + k * PAN_STEP - 0.5;
    x = lerp(x, xOf(k), easeInOut((t - t0) / 0.5));
  }
  return lerp(x, MID, easeInOut((t - T_BOOK) / 1.2));
}

stage.on((t) => {
  // ── 카메라
  const cx = camX(t);
  const back = easeInOut((t - T_BOOK) / 1.4);
  const cz = lerp(9.4 - 0.4 * smooth(0, T_FLIP, t), 15.5, back) + 1.5 * smooth(T_END, 15, t); // 끝 화면에서는 묶음이 멀어지며 로고 뒤로
  const shake = 0.05 * decay(t, T_SLAM, 9);
  camera.position.set(cx + 0.2 * Math.sin(t * 0.5) + shake * Math.sin(t * 90), 0.1 + shake * Math.cos(t * 77), cz);
  camera.lookAt(cx, lerp(0.55 + Y0, Y0 + 0.2, back), 0);
  camera.fov = 40 - 2.5 * decay(t, T_SLAM, 10);
  camera.updateProjectionMatrix();

  // ── 사주 카드: 뒤집히고 뒤로 물러나 사라짐 → 끝에 책 묶음 맨 위로
  const flip = easeInOut((t - T_FLIP) / 0.6);
  const away = easeInOut((t - (T_FLIP + 0.5)) / 0.8);
  const bookIn = easeInOut((t - T_BOOK) / 1.2);
  saju.group.rotation.set(0, Math.PI * flip + 0.06 * Math.sin(t * 0.8) * (1 - flip), 0);
  saju.group.position.set(lerp(lerp(0, -2.5, away), MID, bookIn), lerp(lerp(Y0, Y0 + 1.2, away), Y0 + 0.02 * 7, bookIn), lerp(lerp(0, -6, away), 0.3, bookIn));
  saju.group.scale.setScalar((1 + 0.08 * Math.sin(Math.PI * clamp((t - T_FLIP) / 0.6))) * lerp(1, 0.9, bookIn));
  saju.setOpacity((1 - smooth(T_FLIP + 0.8, T_FLIP + 1.3, t) + smooth(T_BOOK, T_BOOK + 0.6, t)) * (1 - 0.88 * smooth(T_END - 0.2, T_END + 0.5, t)));
  if (bookIn > 0) saju.group.rotation.set(0, Math.PI * (1 - bookIn) + 0, 0); // 묶일 때는 앞면이 위로(표지 = 사주 원국)

  // ── 여섯 장: 뒤에서 날아와 줄 서고, 끝에 한 묶음으로
  six.forEach(({ k, card }) => {
    const fly = easeOut((t - (T_FLIP + 0.35 + k * 0.08)) / 0.7);
    const home = new THREE.Vector3(xOf(k), Y0, 0);
    const from = new THREE.Vector3(xOf(k) * 0.3 - 1, Y0 + 0.5, -10);
    const p = from.clone().lerp(home, fly);
    const stack = new THREE.Vector3(MID + (k - 2.5) * 0.04, Y0 + 0.02 * k, 0.3 - (6 - k) * 0.05);
    p.lerp(stack, bookIn);
    card.group.position.copy(p);
    const focus = Math.exp(-Math.pow((camX(t) - xOf(k)) / 1.2, 2)); // 카메라 앞일수록 1
    card.group.rotation.set(0, lerp((k % 2 ? -1 : 1) * 0.16 * (1 - focus), 0, bookIn) + (1 - fly) * 1.2, lerp(0, (k - 2.5) * 0.03, bookIn));
    card.group.scale.setScalar(lerp(lerp(0.9, 1.04, focus), 0.9, bookIn));
    card.setOpacity(smooth(T_FLIP + 0.3 + k * 0.08, T_FLIP + 0.7 + k * 0.08, t) * lerp(0.55 + 0.45 * focus, 1, bookIn) * (1 - 0.9 * smooth(T_END - 0.2, T_END + 0.5, t)));
    card.halo.material.opacity = (0.15 + 0.55 * focus) * (1 - bookIn * 0.7) * fly;
  });
  bookGlow.material.opacity = 0.8 * smooth(T_BOOK + 0.6, T_BOOK + 1.4, t);
  bookGlow.scale.setScalar(3 + 4 * smooth(T_BOOK + 0.6, T_BOOK + 1.6, t));
  astro.mat.opacity = 0.2 + 0.1 * smooth(T_END, 13.5, t);
  dust.mat.uniforms.uOpacity.value = 0.5;
  nebula.mat.uniforms.uDim.value = 0.85;

  // ── HUD
  c0.set(smooth(0.3, 0.55, t) * (1 - smooth(2.85, 3.05, t)), 12 * (1 - easeOut((t - 0.3) / 0.4)));
  c1.set(smooth(T_SLAM, T_SLAM + 0.06, t) * (1 - smooth(6.15, 6.35, t)), 0, 0.5 * decay(t, T_SLAM, 14));
  c2.set(smooth(6.4, 6.6, t) * (1 - smooth(10.0, 10.2, t)), 12 * (1 - easeOut((t - 6.4) / 0.4)));
  c3.set(smooth(10.4, 10.6, t) * (1 - smooth(12.0, 12.2, t)), 0, 0.2 * decay(t, 10.4, 10));
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
  U.uFlash.value = clamp(0.15 * decay(t, T_SLAM, 30) + 0.35 * decay(t, 11.4, 16));
  U.uChroma.value = 0.0012 + 0.012 * decay(t, T_SLAM, 7);
  U.uGlitch.value = 0.45 * decay(t, T_SLAM, 12);
  U.uZoom.value = 0.12 * decay(t, T_SLAM, 8) + 0.08 * decay(t, 11.4, 6);
  U.uTint.value.set(0.12 * decay(t, T_SLAM, 5), 0.06 * decay(t, T_SLAM, 5), 0);
  U.uVig.value = 1.0 - 0.1 * smooth(T_END, 13, t);
  renderer.toneMappingExposure = 1.05;
});

window.__ready3d = (async () => {
  await document.fonts.ready;
  const sample = "사주는 여기까지 말해 줬죠 사주가 알려주지 않은 이야기 같은 나, 일곱 개의 다른 이야기 일곱 점술을 한 권의 책으로 낯선 점술관 사주 다음 장, 지금 열기 책 전체 9,900원 한 번 결제 만신의 방 오검의 방 베다의 방 데칸의 방 촐킨의 방 룬의 방 시빌라 신탁의 방 한국 사주 명리 켈트 나무 문자 인도 베다 점성술 이집트 데칸 마야 촐킨 달력 북유럽 룬 로마 시빌라 신탁 여덟 글자 곧게 선 큰 나무 갑목 태어난 날의 하늘 글자 나는 버티는 방패 므리가시라 마음을 읽는 이 4 태양군주 페후 케나즈 이사 봉인 풀린 항아리 丙寅甲戌辛巳庚午 ‘’";
  await Promise.all([`900 80px ${SERIF900}`, `700 80px ${SERIF900}`, `700 80px ${BATANG}`, `400 34px ${BATANG}`, `700 34px ${CINZEL}`].map((f) => document.fonts.load(f, sample + " SEVEN ORACLES ONE STORY Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ")));
  saju.draw();
  six.forEach(({ card }) => card.draw());
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
