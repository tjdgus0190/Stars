// 배경만 3D로 바꾸는 판 (2026-10-24, 2안 「만신」). 장면 그림(소반·카드)은 HTML 그대로 두고, 맨 뒤 하늘만
// 깊이가 있는 성운·별·떠오르는 금빛 먼지·먼 천문 고리로 그린다. 카메라는 아주 천천히 다가가며 흔들린다.
import { THREE, createStage, addNebula, addStars, addDust, addAstrolabe, glowSprite, lerp, easeInOut } from "./mystic3d.js";

const canvas = document.querySelector("canvas.gl");
const dur = Number(document.querySelector(".stage").dataset.duration) || 15;
const warm = document.querySelector(".stage").dataset.room === "saju";
const stage = createStage(canvas, { fov: 46, fog: 0.01 });
const { scene, camera } = stage;
scene.add(new THREE.AmbientLight("#6a4a5a", 0.5));
const key = new THREE.DirectionalLight("#ffd2a0", 1.2);
key.position.set(-2, 4, 6);
scene.add(key);
addNebula(stage, warm ? { seed: 8.3, c1: [0.55, 0.13, 0.12], c2: [0.5, 0.28, 0.06] } : { seed: 4.4 });
if (warm) { const glow = glowSprite("#ff9a4a", 9, 0.35); glow.position.set(0, -0.6, -4); scene.add(glow); } // 소반 뒤 촛불빛
addStars(stage, { count: 4800 });
addDust(stage, { count: 320, box: [10, 14, 10], center: [0, 0, 0], color: warm ? "#ffc27a" : "#f3d48b", speed: 0.16, opacity: 0.55 });
const astro = addAstrolabe(stage, { radius: 4.6, position: [0, 1.2, -14], opacity: 0.22 });
stage.on((t) => {
  const k = easeInOut(t / dur);
  camera.position.set(0.35 * Math.sin(t * 0.3), 0.2 * Math.sin(t * 0.21), lerp(8, 6.6, k));
  camera.lookAt(0, 0.4, -10);
  astro.grp.rotation.z = t * 0.02;
});
window.__ready3d = (async () => {
  await document.fonts.ready;
  stage.seek(0);
})();
window.__seek3d = (t) => stage.seek(t);
const t0 = performance.now();
(function loop() {
  if (document.documentElement.classList.contains("is-paused")) return;
  stage.seek(((performance.now() - t0) / 1000) % dur);
  requestAnimationFrame(loop);
})();
