// 3안 「한 권의 책」 3D 층 (2026-10-24). 시간표는 ad3-book.html과 같다:
//   A 0~4 일곱 방 메달 고리(나타남 0.15+k*0.1초, 빛남 0.6+k*0.42초) · 4~4.9 고리가 접혀 들어감
//   B 4.5~7.45 3D 책 표지(인장 5.6초) · C 7.45~8.25 표지가 경첩으로 열리며 빛, 7.7초부터 HTML 목차 종이 · 11.3 책 사라짐 · D 11.6~15 끝 화면
// 자막·목차·끝 화면 글자는 HTML 그대로 위에 있다.
import { THREE, createStage, addNebula, addStars, addDust, addAstrolabe, glowSprite, textTexture,
  ROOMS, roomColor, GOLD, smooth, easeOut, easeInOut, lerp, clamp } from "./mystic3d.js";

const canvas = document.querySelector("canvas.gl");
const stage = createStage(canvas, { fov: 44, fog: 0.012 });
const { scene, camera, renderer } = stage;

scene.add(new THREE.AmbientLight("#5b4a8a", 0.4));
scene.add(new THREE.HemisphereLight("#8a78d8", "#140a06", 0.5));
const key = new THREE.DirectionalLight("#ffdcae", 1.6);
key.position.set(-3, 5, 7);
scene.add(key);
const rim = new THREE.DirectionalLight("#9a7cff", 1.2);
rim.position.set(4, 2, -5);
scene.add(rim);

const nebula = addNebula(stage, { seed: 5.7 });
addStars(stage, { count: 5200 });
const dust = addDust(stage, { count: 300, box: [9, 12, 10], center: [0, 0, 1], opacity: 0.6 });
const astro = addAstrolabe(stage, { radius: 4.2, position: [0, 0.2, -12], opacity: 0.26 });

// ── 일곱 메달 (A)
const SIG = {
  saju: ["M20 3v9M13 12h14M14 12v5.5M26 12v5.5M20 12v13.5", "M10.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM22.5 21a3.5 3.5 0 0 1 7 0l.8 3h-8.6ZM16.5 29a3.5 3.5 0 0 1 7 0l.8 3h-8.6Z", "M15 33c-1 2.6 0 4.4-1 6M20 33v6M25 33c1 2.6 0 4.4 1 6"],
  ogham: ["M20 3V37M20 10H31M20 16H31M20 22H31M9 28H20M9 33H20"],
  star: ["M25 7a14 14 0 1 0 0 26a11 11 0 1 1 0-26Z"],
  decan: ["M20 5a15 15 0 1 1 0 30a15 15 0 1 1 0-30ZM20 5v4M35 20h-4M20 35v-4M5 20h4M9.4 9.4l2.8 2.8M30.6 9.4l-2.8 2.8M20 20L30 30"],
  tzolkin: ["M20 4a16 16 0 1 1 0 32a16 16 0 1 1 0-32ZM20 13a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5"],
  rune: ["M14 3V37M14 14L28 5M14 23L28 14"],
  sibyl: ["M20 4C24 10 26 13 26 16.5A6 6 0 0 1 14 16.5C14 13 16 10 20 4ZM20 11.5c1.4 2.3 2 3.8 2 5a2 2 0 0 1-4 0c0-1.2.6-2.7 2-5ZM20 22.5v3M14 26h12v10H14ZM10 36h20"],
};
const NAME = { saju: "만신", ogham: "오검", star: "별", decan: "데칸", tzolkin: "촐킨", rune: "룬", sibyl: "시빌라" };
const RING_R = 1.38;
const ring = new THREE.Group();
scene.add(ring);
const goldRim = new THREE.MeshStandardMaterial({ color: "#d8ad62", metalness: 1, roughness: 0.25, emissive: "#3b2508", emissiveIntensity: 0.6 });
const coinGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.08, 64);
const faces = [];
const medals = ROOMS.map((room, k) => {
  const col = roomColor(room, 0.62, 0.9);
  const css = `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
  const draw = (lit) => (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, `rgba(40,26,60,1)`);
    g.addColorStop(1, `rgba(16,11,30,1)`);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.save();
    x.translate(w / 2 - 80, h * 0.36 - 80);
    x.scale(4, 4);
    x.lineCap = "round";
    x.lineJoin = "round";
    x.lineWidth = 1.8;
    x.strokeStyle = lit > 0.5 ? css : "rgba(200,180,140,0.55)";
    x.shadowColor = css;
    x.shadowBlur = lit > 0.5 ? 8 : 0;
    for (const d of SIG[room]) x.stroke(new Path2D(d));
    x.restore();
    x.font = '700 112px "Gowun Batang"';
    x.textAlign = "center";
    x.fillStyle = lit > 0.5 ? "#f4ead8" : "rgba(230,220,200,0.55)";
    x.fillText(NAME[room], w / 2, h * 0.84);
  };
  const tex = textTexture(draw(0), 512, 512);
  faces.push(tex);
  const faceMat = new THREE.MeshStandardMaterial({ map: tex.tex, emissive: "#ffffff", emissiveMap: tex.tex, emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.5 });
  // 금 테두리 동전(원기둥) + 앞면 원판(글자가 바로 서도록 CircleGeometry)
  const rimMesh = new THREE.Mesh(coinGeo, goldRim);
  rimMesh.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.38, 64), faceMat);
  face.position.z = 0.042;
  const coin = new THREE.Group();
  coin.add(rimMesh, face);
  const holder = new THREE.Group();
  holder.add(coin);
  const halo = glowSprite(col, 2.0, 0);
  halo.position.z = -0.1;
  holder.add(halo);
  const light = new THREE.PointLight(col, 0, 3, 2);
  light.position.z = 0.6;
  holder.add(light);
  ring.add(holder);
  return { holder, coin, faceMat, halo, light, tex, draw, col, lit: -1 };
});
// 고리 선(금빛 원)
const ringLine = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.012, 8, 200), new THREE.MeshBasicMaterial({ color: "#e6c27a", transparent: true, opacity: 0.5 }));
ring.add(ringLine);

// ── 책 (B·C)
const BW = 1.8, BH = 2.5, BT = 0.36;
const book = new THREE.Group();
scene.add(book);
const coverTex = textTexture(() => {}, 720, 1000);
function drawCover() {
  coverTex.redraw((x, w, h) => {
    const g = x.createRadialGradient(w * 0.3, h * 0.2, 20, w * 0.5, h * 0.5, h * 0.75);
    g.addColorStop(0, "#5a2e22");
    g.addColorStop(1, "#24130f");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(0,0,0,0.35)";
    x.fillRect(0, 0, 44, h);
    x.strokeStyle = "#d3a45d";
    x.lineWidth = 8;
    x.strokeRect(70, 30, w - 100, h - 60);
    x.lineWidth = 2;
    x.strokeRect(88, 48, w - 136, h - 96);
    x.textAlign = "center";
    x.fillStyle = "#d9c49b";
    x.font = '500 36px "Cinzel"';
    x.fillText("THE BOOK OF YOU", w / 2 + 20, 360);
    x.fillStyle = "#f6eedf";
    x.font = '700 118px "Gowun Batang"';
    x.shadowColor = "rgba(0,0,0,0.6)";
    x.shadowBlur = 10;
    x.fillText("나의 이야기", w / 2 + 20, 500);
    x.shadowBlur = 0;
    x.fillStyle = "#e7cf9a";
    x.font = '400 46px "Gowun Batang"';
    x.fillText("일곱 점술로 엮은 한 권", w / 2 + 20, 590);
  });
}
const leather = new THREE.MeshStandardMaterial({ color: "#3a1c16", metalness: 0.25, roughness: 0.55 });
const coverMat = new THREE.MeshStandardMaterial({ map: coverTex.tex, metalness: 0.3, roughness: 0.48, emissive: "#ffffff", emissiveMap: coverTex.tex, emissiveIntensity: 0.18 });
const pageLines = textTexture((x, w, h) => {
  x.fillStyle = "#efe4cb";
  x.fillRect(0, 0, w, h);
  x.fillStyle = "rgba(120,90,60,0.25)";
  for (let i = 90; i < h - 60; i += 46) x.fillRect(70, i, w - 140, 3);
}, 512, 720);
const pageMat = new THREE.MeshStandardMaterial({ map: pageLines.tex, roughness: 0.9, emissive: "#fff2d0", emissiveIntensity: 0 });
const edgeTex = textTexture((x, w, h) => {
  x.fillStyle = "#e8dcc2";
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 3) {
    x.fillStyle = i % 6 ? "rgba(150,120,80,0.2)" : "rgba(120,90,60,0.3)";
    x.fillRect(i, 0, 1, h);
  }
}, 128, 32);
const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex.tex, roughness: 0.9 });
const back = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.05), leather);
back.position.z = -BT / 2;
const spine = new THREE.Mesh(new THREE.BoxGeometry(0.07, BH, BT + 0.05), leather);
spine.position.x = -BW / 2;
const block = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.08, BH - 0.08, BT - 0.05), [edgeMat, leather, edgeMat, edgeMat, pageMat, leather]);
block.position.x = 0.03;
// 앞표지: 책등 쪽 경첩으로 열린다
const hinge = new THREE.Group();
hinge.position.set(-BW / 2, 0, BT / 2);
const front = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.05), [leather, leather, leather, leather, coverMat, leather]);
front.position.x = BW / 2;
hinge.add(front);
// 붉은 인장
const sealTex = textTexture((x, w, h) => {
  const g = x.createRadialGradient(w * 0.38, h * 0.32, 4, w / 2, h / 2, w / 2);
  g.addColorStop(0, "#d4554a");
  g.addColorStop(1, "#8e2a24");
  x.fillStyle = g;
  x.beginPath();
  x.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
  x.fill();
  x.save();
  x.translate(w / 2 - 60, h / 2 - 60);
  x.scale(3, 3);
  x.fillStyle = "#f2deb0";
  x.fill(new Path2D("M20 6l3.4 9.6L33 20l-9.6 3.4L20 33l-3.4-9.6L7 20l9.6-3.4Z"));
  x.restore();
}, 256, 256);
const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 48), [new THREE.MeshStandardMaterial({ color: "#8e2a24", roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: sealTex.tex, roughness: 0.4, metalness: 0.1 }), new THREE.MeshStandardMaterial({ color: "#8e2a24" })]);
seal.rotation.x = Math.PI / 2;
seal.position.set(BW / 2 - 0.42, -BH / 2 + 0.46, 0.05);
front.add(seal);
book.add(back, spine, block, hinge);
// 펼칠 때 안쪽 빛
const inGlow = glowSprite(GOLD, 3.6, 0);
inGlow.position.z = BT / 2 + 0.05;
inGlow.material.depthTest = false;
inGlow.renderOrder = 4;
book.add(inGlow);
const inLight = new THREE.PointLight("#ffe2a8", 0, 8, 2);
inLight.position.set(0.2, 0, 1.4);
book.add(inLight);

// ── 시간표
const LOOK_Y = -0.36; // 고리·책 가운데가 HTML 기준 y 860px에 오도록
stage.on((t) => {
  // 카메라: 천천히 돌며 다가감
  const push = easeInOut((t - 7.3) / 1.4) * (1 - easeInOut((t - 11.2) / 1.2));
  const az = 0.12 * Math.sin(t * 0.35);
  const dist = lerp(8.5, 6.9, push);
  camera.position.set(Math.sin(az) * dist, 0.25 + 0.15 * Math.sin(t * 0.27), Math.cos(az) * dist);
  camera.lookAt(0, LOOK_Y, 0);

  // A: 메달 고리
  const out = easeInOut((t - 4.0) / 0.9);
  ring.visible = out < 1;
  ring.scale.setScalar(lerp(1, 0.2, out));
  ring.rotation.set(-0.95 + 0.08 * Math.sin(t * 0.5), 0, t * 0.12 + out * 0.87);
  medals.forEach((m, k) => {
    const a = -Math.PI / 2 + (k / 7) * Math.PI * 2; // HTML과 같은 자리(맨 위가 Ⅰ)
    m.holder.position.set(Math.cos(a) * RING_R, -Math.sin(a) * RING_R, 0);
    const appear = easeOut((t - 0.15 - k * 0.1) / 0.5);
    const lit = easeOut((t - 0.6 - k * 0.42) / 0.55);
    m.holder.scale.setScalar(Math.max(0.001, lerp(0.6, 1, appear) * (appear > 0 ? 1 : 0)));
    // 메달 앞면이 늘 카메라를 보게(고리가 기울어도)
    m.holder.quaternion.copy(ring.quaternion).invert().multiply(camera.quaternion);
    m.coin.rotation.z = 0.25 * Math.sin(t * 1.1 + k);
    const litStep = lit > 0.5 ? 1 : 0;
    if (litStep !== m.lit) {
      m.tex.redraw(m.draw(litStep));
      m.lit = litStep;
    }
    m.faceMat.emissiveIntensity = 0.25 + 0.6 * lit;
    m.halo.material.opacity = lit * 0.75 * (1 - out);
    m.light.intensity = lit * 4 * (1 - out);
  });
  ringLine.material.opacity = 0.5 * smooth(0.1, 0.9, t) * (1 - out);

  // B·C: 책
  const bin = easeOut((t - 4.5) / 0.9);
  const bout = smooth(11.2, 11.7, t);
  book.visible = t > 4.45 && bout < 1;
  book.scale.setScalar(Math.max(0.001, lerp(0.45, 1, bin) * (1 - bout)));
  book.position.set(0, -0.36 - 0.3 * (1 - bin), 0);
  const open = easeInOut((t - 7.45) / 0.8);
  book.rotation.set(0.06, lerp(0.32 * Math.sin(t * 0.55) - 0.12, 0, open), 0);
  hinge.rotation.y = -open * 1.75; // 약 100°
  seal.visible = t > 5.6;
  seal.scale.setScalar(t > 5.6 ? lerp(1.8, 1, easeOut((t - 5.6) / 0.45)) : 1);
  const burst = smooth(7.5, 8.0, t) * (1 - 0.5 * smooth(8.4, 9.5, t));
  inGlow.material.opacity = burst * 0.95;
  inGlow.scale.setScalar(3.6 + 2 * burst);
  inLight.intensity = burst * 22;
  pageMat.emissiveIntensity = burst * 0.35;

  // 천문 고리: 끝 화면에서 더 밝게
  const endUp = smooth(11.5, 12.5, t);
  astro.mat.opacity = 0.26 - 0.1 * endUp; // 끝 화면 로고 뒤에서는 더 옅게
  renderer.toneMappingExposure = 1.0 - 0.15 * smooth(7.7, 8.3, t) * (1 - endUp) + 0.05 * endUp;
  dust.mat.uniforms.uOpacity.value = 0.6;
  nebula.mat.uniforms.uDim.value = 1;
});

window.__ready3d = (async () => {
  await document.fonts.ready;
  await Promise.all(['700 118px "Gowun Batang"', '400 46px "Gowun Batang"', '700 112px "Gowun Batang"', '500 36px "Cinzel"'].map((f) => document.fonts.load(f, "나의 이야기 일곱 점술로 엮은 한 권 만신 오검 별 데칸 촐킨 룬 시빌라 THE BOOK OF YOU")));
  drawCover();
  medals.forEach((m) => {
    m.tex.redraw(m.draw(0));
    m.lit = 0;
  });
  stage.seek(0);
})();
window.__seek3d = (t) => stage.seek(t);
const t0 = performance.now();
(function loop() {
  if (document.documentElement.classList.contains("is-paused")) return;
  stage.seek(((performance.now() - t0) / 1000) % 15);
  requestAnimationFrame(loop);
})();
