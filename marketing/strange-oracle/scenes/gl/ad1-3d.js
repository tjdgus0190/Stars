// 1안 「일곱 문」 3D 층 (2026-10-24). 시간표는 ad1-seven-doors.html과 같다:
//   A 0~1.5 첫 문(만신)이 열림 · B 1.5~6.5 둥근 방의 일곱 문이 차례로 열림(방 이름 1.6+k*0.7초) · C 6.5~9.85 책이 떠오르고 일곱 빛이 모임(장 표시 7.6+k*0.25초, 7/7 9.1초)
//   D 9.95~12.95 결과 카드(HTML) 뒤 배경 · E 12.95~15 위로 올라가 천문 고리
// 자막·방 이름·결과 카드·끝 화면은 HTML 그대로 위에 있다.
import { THREE, createStage, addNebula, addStars, addDust, addAstrolabe, addFloor, glowSprite, archShape, archPath, halfLeafShape, textTexture,
  ROOMS, roomColor, GOLD, smooth, easeOut, easeInOut, lerp, clamp } from "./mystic3d.js";

const canvas = document.querySelector("canvas.gl");
const stage = createStage(canvas, { fov: 50, fog: 0.026 });
const { scene, camera, renderer } = stage;

// 빛
scene.add(new THREE.AmbientLight("#5b4a8a", 0.35));
scene.add(new THREE.HemisphereLight("#7a68c8", "#120a06", 0.55));
const key = new THREE.DirectionalLight("#ffd9a0", 1.3);
key.position.set(2, 9, 4);
scene.add(key);

const nebula = addNebula(stage, { seed: 2.4 });
addStars(stage, { count: 5200 });
const dust = addDust(stage, { count: 340, box: [15, 7, 15], center: [0, 2.6, 0], opacity: 0.62 });
const ASTRO_Y = 17;
const astro = addAstrolabe(stage, { radius: 3.4, position: [0, ASTRO_Y, 0], opacity: 0.6 });
astro.grp.rotation.x = -Math.PI / 2;
const floor = addFloor(stage, { radius: 9.5 });

// ── 일곱 문
const R = 7.2;
const DW = 1.9, DH = 3.2, IW = 1.4, IH = 2.85;
const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];
const bronze = new THREE.MeshStandardMaterial({ color: "#b98a4c", metalness: 0.88, roughness: 0.32, emissive: "#2a1606", emissiveIntensity: 0.4 });
const goldMat = new THREE.MeshStandardMaterial({ color: "#e7c47a", metalness: 1, roughness: 0.22, emissive: "#3b2a0c", emissiveIntensity: 0.5 });
const stone = new THREE.MeshStandardMaterial({ color: "#2a2340", metalness: 0.1, roughness: 0.85 });
const frameGeo = (() => {
  const s = archShape(DW, DH);
  s.holes.push(archPath(IW, IH));
  return new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 48 });
})();
const leafGeoL = new THREE.ExtrudeGeometry(halfLeafShape(IW / 2, IH, false), { depth: 0.09, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
const leafGeoR = new THREE.ExtrudeGeometry(halfLeafShape(IW / 2, IH, true), { depth: 0.09, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
const gateGeo = new THREE.ShapeGeometry(archShape(IW, IH), 32);
const studGeo = new THREE.SphereGeometry(0.028, 10, 8);
const ringGeo = new THREE.TorusGeometry(0.16, 0.025, 10, 40);

const plates = [];
const doors = ROOMS.map((room, k) => {
  const th = (k / 7) * Math.PI * 2;
  const g = new THREE.Group();
  g.position.set(Math.sin(th) * R, 0, -Math.cos(th) * R);
  g.rotation.y = -th;
  const col = roomColor(room, 0.6, 0.9);
  const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(roomColor(room).getHSL({}).h, 0.35, 0.12), metalness: 0.25, roughness: 0.55, emissive: col, emissiveIntensity: 0 });
  // 틀
  const frame = new THREE.Mesh(frameGeo, bronze);
  frame.position.z = -0.18;
  g.add(frame);
  // 문 안쪽 빛(가산)
  const gateMat = new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color("#fff3d6"), 0.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const gate = new THREE.Mesh(gateGeo, gateMat);
  gate.position.z = -0.12;
  g.add(gate);
  // 문짝 둘 (경첩이 바깥쪽)
  const mkLeaf = (geo, x, right) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, 0.0);
    const leaf = new THREE.Mesh(geo, wood);
    pivot.add(leaf);
    // 금 장식: 고리 하나 + 징 두 줄
    const sx = right ? -1 : 1;
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.position.set(sx * (IW / 2 - 0.16), 1.35, 0.12);
    pivot.add(ring);
    const studs = new THREE.InstancedMesh(studGeo, goldMat, 12);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 12; i++) {
      const row = i < 6 ? 0.45 : 2.0;
      m.makeTranslation(sx * (0.1 + (i % 6) * 0.1), row, 0.11);
      studs.setMatrixAt(i, m);
    }
    pivot.add(studs);
    g.add(pivot);
    return pivot;
  };
  const left = mkLeaf(leafGeoL, -IW / 2, false);
  const right = mkLeaf(leafGeoR, IW / 2, true);
  // 뒤쪽 큰 빛과 앞쪽 방 색 조명
  const halo = glowSprite(col, 5.2, 0);
  halo.position.set(0, 1.5, -0.6);
  g.add(halo);
  const light = new THREE.PointLight(col, 0, 9, 2);
  light.position.set(0, 1.4, 1.4);
  g.add(light);
  // 문 위 숫자 판
  const drawNum = (x, w, h) => {
    x.font = '700 150px "Cinzel"';
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.shadowColor = "rgba(255,210,120,0.9)";
    x.shadowBlur = 24;
    x.fillStyle = "#f1d48e";
    x.fillText(ROMAN[k], w / 2, h / 2 + 8);
  };
  const plate = textTexture(drawNum, 256, 256);
  plates.push(() => plate.redraw(drawNum)); // 글꼴을 받은 뒤 다시 그림
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: plate.tex, transparent: true, depthWrite: false }));
  num.position.set(0, DH + 0.42, 0.05);
  g.add(num);
  const numMat = num.material;
  scene.add(g);
  return { g, left, right, gateMat, halo, light, wood, col, th, numMat };
});

// 문 사이 기둥
for (let k = 0; k < 7; k++) {
  const a = ((k + 0.5) / 7) * Math.PI * 2;
  const p = new THREE.Group();
  p.position.set(Math.sin(a) * (R + 0.2), 0, -Math.cos(a) * (R + 0.2));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.6, 24), stone);
  shaft.position.y = 2.3;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.22, 24), goldMat);
  cap.position.y = 4.65;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.22, 24), goldMat);
  base.position.y = 0.11;
  p.add(shaft, cap, base);
  scene.add(p);
}

// ── 책 (C)
const BW = 1.25, BH = 1.66, BT = 0.3;
const book = new THREE.Group();
const cover = textTexture(() => {}, 640, 850);
function drawCover(n, gold) {
  cover.redraw((x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#4a2418");
    g.addColorStop(1, "#1d1430");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "#c89a55";
    x.lineWidth = 10;
    x.strokeRect(26, 26, w - 52, h - 52);
    x.lineWidth = 3;
    x.strokeRect(46, 46, w - 92, h - 92);
    x.fillStyle = "#cdb88f";
    x.font = '500 34px "Cinzel"';
    x.textAlign = "center";
    x.fillText("MY STORY", w / 2, 150);
    x.font = '700 92px "Gowun Batang"';
    x.fillStyle = "#f0d08a";
    x.shadowColor = "rgba(255,200,110,0.7)";
    x.shadowBlur = 18;
    x.fillText("나의 이야기", w / 2, 270);
    x.shadowBlur = 0;
    const g2 = x.createLinearGradient(w / 2 - 110, 0, w / 2 + 110, 0);
    g2.addColorStop(0, "rgba(200,154,85,0)");
    g2.addColorStop(0.5, "#c89a55");
    g2.addColorStop(1, "rgba(200,154,85,0)");
    x.fillStyle = g2;
    x.fillRect(w / 2 - 110, 305, 220, 3);
    // 장 표시 일곱 (아치)
    for (let k = 0; k < 7; k++) {
      const cx = w / 2 + (k - 3) * 68, top = 560, mw = 46, mh = 64;
      x.beginPath();
      x.moveTo(cx - mw / 2, top + mh);
      x.lineTo(cx - mw / 2, top + mw / 2);
      x.arc(cx, top + mw / 2, mw / 2, Math.PI, 0);
      x.lineTo(cx + mw / 2, top + mh);
      x.closePath();
      if (k < n) {
        const c = roomColor(ROOMS[k], 0.62, 0.9);
        x.fillStyle = `rgb(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0})`;
        x.shadowColor = x.fillStyle;
        x.shadowBlur = 20;
        x.fill();
        x.shadowBlur = 0;
      }
      x.strokeStyle = "#b89a6a";
      x.lineWidth = 3;
      x.stroke();
    }
    x.font = '700 56px "Cinzel"';
    x.fillStyle = gold ? "#f3d27e" : "#efe6d8";
    if (gold) {
      x.shadowColor = "rgba(255,210,120,0.9)";
      x.shadowBlur = 26;
    }
    x.fillText(`${n}/7`, w / 2, 735);
    x.shadowBlur = 0;
  });
}
const coverMat = new THREE.MeshStandardMaterial({ map: cover.tex, metalness: 0.35, roughness: 0.5, emissive: "#ffffff", emissiveMap: cover.tex, emissiveIntensity: 0.32 });
const leather = new THREE.MeshStandardMaterial({ color: "#2b1830", metalness: 0.3, roughness: 0.6 });
const pagesTex = textTexture((x, w, h) => {
  x.fillStyle = "#e8dcc2";
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < h; i += 3) {
    x.fillStyle = i % 6 ? "rgba(150,120,80,0.18)" : "rgba(120,90,60,0.28)";
    x.fillRect(0, i, w, 1);
  }
}, 64, 256);
const pagesMat = new THREE.MeshStandardMaterial({ map: pagesTex.tex, roughness: 0.9 });
// 앞표지·뒤표지·책등·종이 덩어리
const front = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.045), [leather, leather, leather, leather, coverMat, leather]);
front.position.z = BT / 2;
const back = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.045), leather);
back.position.z = -BT / 2;
const spine = new THREE.Mesh(new THREE.BoxGeometry(0.05, BH, BT + 0.045), leather);
spine.position.x = -BW / 2;
const pages = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.07, BH - 0.06, BT - 0.04), [pagesMat, leather, pagesMat, pagesMat, leather, leather]);
pages.position.x = 0.02;
book.add(front, back, spine, pages);
const bookGlow = glowSprite(GOLD, 4.2, 0);
bookGlow.position.z = -0.4;
bookGlow.material.depthTest = false; // 바닥에 잘려 직선 경계가 생기지 않게
bookGlow.renderOrder = 5;
book.add(bookGlow);
const bookLight = new THREE.PointLight("#ffd79a", 0, 7, 2);
bookLight.position.set(0, 0.4, 1.6);
book.add(bookLight);
book.visible = false;
scene.add(book);
drawCover(0, false);
let coverState = "";

// 문 → 책 빛줄기 일곱
const beams = doors.map((d) => {
  const mat = new THREE.MeshBasicMaterial({ color: d.col.clone().lerp(new THREE.Color("#ffffff"), 0.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1, true), mat);
  const head = glowSprite(d.col, 0.9, 0);
  scene.add(m, head);
  return { m, mat, head, d };
});

// ── 시간표
const BOOK_POS = new THREE.Vector3(0, 1.95, 0);
const doorCenter = (d) => new THREE.Vector3(Math.sin(d.th) * (R - 0.3), 1.45, -Math.cos(d.th) * (R - 0.3));
const tmp = new THREE.Vector3();
function yawAt(t) {
  if (t < 1.6) return 0;
  const k = Math.min(6, Math.floor((t - 1.6) / 0.7));
  const local = t - 1.6 - 0.7 * k;
  const step = (2 * Math.PI) / 7;
  const from = (k - 1) * step, to = k * step;
  return k === 0 ? 0 : lerp(from, to, easeInOut(local / 0.34));
}
const dirOf = (yaw) => new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));

stage.on((t) => {
  // 문 열림·빛
  doors.forEach((d, k) => {
    const t0 = k === 0 ? 0.25 : 1.6 + 0.7 * k;
    const open = easeInOut((t - t0) / (k === 0 ? 1.05 : 0.55));
    d.left.rotation.y = open * 1.2;
    d.right.rotation.y = -open * 1.2;
    const peak = smooth(t0, t0 + 0.45, t);
    const settle = k === 0 ? 0 : smooth(t0 + 0.7, t0 + 1.3, t);
    let lit = peak * (1 - 0.4 * settle);
    if (t > 6.5) lit = Math.max(lit, 0.6) * (1 + 0.6 * smooth(9.0, 9.3, t) * (1 - smooth(9.4, 10.2, t)));
    d.gateMat.opacity = lit * 0.62;
    d.halo.material.opacity = lit * 0.55;
    d.light.intensity = lit * 26;
    d.wood.emissiveIntensity = lit * 0.12;
    d.numMat.opacity = 1 - smooth(1.3, 1.7, t); // 숫자 판은 첫 장면만(뒤로는 HTML 방 이름이 숫자를 보여 줌)
    floor.mat.uniforms.uLit.value[k] = lit;
  });

  // 카메라
  let pos, look;
  if (t < 1.5) {
    pos = new THREE.Vector3(0.15 * Math.sin(t * 0.8), 1.25 + 0.05 * Math.sin(t * 1.1), lerp(-0.6, -1.7, easeOut(t / 1.5)));
    look = new THREE.Vector3(0, 2.15, -R);
  } else if (t < 6.5) {
    const back = easeInOut((t - 1.45) / 0.5);
    const yaw = yawAt(t + 0.22); // 방 이름이 뜨기 조금 전에 돌기 시작
    const behind = dirOf(yaw).multiplyScalar(-3.2); // 바라보는 문의 반대쪽으로 물러섬 → 문이 자막(위 300)과 방 이름(1134) 사이에 든다
    pos = new THREE.Vector3(lerp(0, behind.x, back), 1.25 + 0.04 * Math.sin(t * 1.3), lerp(-1.7, behind.z, back));
    look = new THREE.Vector3(0, 0, 0).add(dirOf(yaw).multiplyScalar(R)).setY(lerp(2.15, 0.85, back) + 0.04 * Math.sin(t * 0.9));
  } else {
    const yaw6 = (6 / 7) * Math.PI * 2;
    const k = easeInOut((t - 6.5) / 0.9);
    const phi = yaw6 + Math.PI + (t - 6.5) * 0.16;
    const rad = lerp(3.2, 5.1, k);
    let y = lerp(1.25, 3.2, k);
    pos = new THREE.Vector3(Math.sin(phi) * rad, y, -Math.cos(phi) * rad);
    const fwd = new THREE.Vector3(0, 0.85, 0).add(dirOf(yaw6).multiplyScalar(R));
    look = fwd.lerp(BOOK_POS, k);
    // E: 위로 올라가 천문 고리를 올려다봄
    const up = easeInOut((t - 12.9) / 1.9);
    if (up > 0) {
      pos.y = lerp(y, 4.4, up);
      pos.multiplyScalar(1).setX(pos.x * (1 - 0.35 * up)).setZ(pos.z * (1 - 0.35 * up));
      look = look.clone().lerp(new THREE.Vector3(0, ASTRO_Y, 0), up);
    }
  }
  camera.position.copy(pos);
  camera.lookAt(look);

  // 책
  const bin = easeOut((t - 6.75) / 0.6);
  book.visible = t > 6.7;
  if (book.visible) {
    const out = smooth(12.9, 13.6, t);
    book.scale.setScalar(Math.max(0.001, bin * (1 - out)));
    book.position.copy(BOOK_POS).setY(BOOK_POS.y - 0.5 * (1 - bin) + 0.06 * Math.sin(t * 1.4));
    book.lookAt(tmp.copy(camera.position).setY(BOOK_POS.y + 0.3));
    book.rotateY(0.28 * Math.sin(t * 0.7) - 0.18);
    const n = ROOMS.filter((_, k) => t >= 7.6 + k * 0.25 + 0.12).length;
    const gold = t >= 9.1;
    const st = `${n}${gold}`;
    if (st !== coverState) {
      drawCover(n, gold);
      coverState = st;
    }
    const flash = smooth(9.05, 9.3, t) * (1 - 0.35 * smooth(9.4, 10.4, t));
    bookGlow.material.opacity = 0.25 * bin + 0.9 * flash;
    bookGlow.scale.setScalar(4.2 + 2.2 * flash);
    bookLight.intensity = 6 * bin + 18 * flash;
  }
  // 빛줄기: 문 k → 책, 7.6+k*0.25초에 출발(0.3초 비행) 뒤 옅게 남음
  beams.forEach((b, k) => {
    const t0 = 7.45 + k * 0.25;
    const p = clamp((t - t0) / 0.3);
    const fade = 1 - smooth(9.6, 10.4, t);
    const on = t >= t0 && t < 10.4;
    b.m.visible = on;
    b.head.visible = on && p < 1;
    if (!on) return;
    const a = doorCenter(b.d), c = book.getWorldPosition(new THREE.Vector3());
    const tip = a.clone().lerp(c, p);
    const mid = a.clone().add(tip).multiplyScalar(0.5);
    const len = a.distanceTo(tip);
    b.m.position.copy(mid);
    b.m.scale.set(1, Math.max(0.001, len), 1);
    b.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(a).normalize());
    b.mat.opacity = (p < 1 ? 0.9 : 0.35) * fade;
    b.head.position.copy(tip);
    b.head.material.opacity = 1;
  });

  // 노출: D(결과 카드) 동안 배경을 낮춘다
  const dim = smooth(9.9, 10.3, t) * (1 - smooth(12.85, 13.4, t));
  renderer.toneMappingExposure = lerp(1.0, 0.55, dim) + 0.15 * smooth(13.2, 14.5, t);
  nebula.mat.uniforms.uDim.value = lerp(1.0, 0.7, dim);
  dust.mat.uniforms.uOpacity.value = 0.62 * (1 - 0.5 * dim);
});

// 시작: 글꼴(캔버스 글자)을 받은 뒤 첫 장면
window.__ready3d = (async () => {
  await document.fonts.ready;
  await Promise.all(['700 150px "Cinzel"', '500 34px "Cinzel"', '700 92px "Gowun Batang"'].map((f) => document.fonts.load(f, "나의 이야기 ⅠⅡⅢⅣⅤⅥⅦ MY STORY 0/7")));
  plates.forEach((f) => f());
  drawCover(0, false);
  stage.seek(0);
})();
window.__seek3d = (t) => stage.seek(t);
// 브라우저에서 미리보기(렌더가 아닐 때): 실제 시간으로 돌린다
const t0 = performance.now();
(function loop() {
  if (document.documentElement.classList.contains("is-paused")) return;
  stage.seek(((performance.now() - t0) / 1000) % 15);
  requestAnimationFrame(loop);
})();
