// 광고 4안 「들켰죠」 소리판 (2026-10-24). 외부 음원 없이 사인파·노이즈·간단한 잔향만으로 계산한다(난수 씨앗 고정 → 다시 돌려도 같은 소리).
// 실행(저장소 루트): node marketing/strange-oracle/render/sound-ad4.js  → ../out/ad4-busted-3d-ko-sound.mp4 (영상은 ad4-busted-3d-ko.mp4 그대로 복사)
// 시점은 scenes/gl/ad4-3d.js와 같은 값: 심장 0.1·0.42·6.95·7.22 / 글리치 0.22·1.72 / 꽂힘 2.05·3.85·5.65 / 들켰죠 7.6 / 깨짐 8.15 /
//   구멍 통과 8.45~9.8 / 문장 불붙음 9.45+0.11k / 자막 10.3 / 끝 화면 11.7·12.4
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000;
const DUR = 15;
const N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N); // 마른 소리
const VL = new Float32Array(N), VR = new Float32Array(N); // 잔향으로 보낼 소리
let seed = 20261024;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const S = (t) => Math.floor(t * SR);

function put(i, v, pan, send) {
  if (i < 0 || i >= N) return;
  const l = v * (1 - pan) * 0.5, r = v * (1 + pan) * 0.5;
  L[i] += l;
  R[i] += r;
  if (send) {
    VL[i] += l * send;
    VR[i] += r * send;
  }
}
// 낮은 쿵: 주파수가 떨어지는 사인(킥) + 약한 배음
function kick(t0, f0, f1, dur, amp, send = 0.3) {
  let ph = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * 18);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / (dur * 0.35));
    const v = (Math.sin(ph) + 0.25 * Math.tanh(3 * Math.sin(ph))) * amp * env;
    put(S(t0) + i, v, 0, send);
  }
}
// 노이즈 덩어리: 밝기(lp 계수)·길이·감쇠
function noise(t0, dur, amp, bright = 0.5, pan = 0, send = 0.3, attack = 0.001, curve = 4) {
  let lp = 0, hp = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp((-t / dur) * curve);
    const x = rnd();
    lp += bright * (x - lp);
    hp = lp - hp * 0.0;
    put(S(t0) + i, hp * amp * env, pan, send);
  }
}
// 휙: 거른 노이즈가 점점 커지고 밝아지다 꽂힘 직전에 멈춤
function whoosh(t0, dur, amp, pan = 0) {
  let lp = 0, lp2 = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, u = t / dur;
    const env = Math.pow(u, 2.2) * (u < 0.97 ? 1 : (1 - u) / 0.03);
    const k = 0.02 + 0.5 * u * u;
    lp += k * (rnd() - lp);
    lp2 += k * (lp - lp2);
    put(S(t0) + i, (lp - lp2 * 0.6) * amp * env * 3, pan * (1 - u), 0.25);
  }
}
// 유리: 높은 비화성 부분음 여럿이 아주 빨리 감쇠
function glass(t0, amp, n = 9, pan = 0, spread = 0.6, send = 0.5) {
  for (let k = 0; k < n; k++) {
    const f = 2600 + Math.abs(rnd()) * 6500, d = 0.04 + Math.abs(rnd()) * 0.22, a = amp * (0.4 + Math.abs(rnd()) * 0.6) / Math.sqrt(n);
    const p = Math.max(-1, Math.min(1, pan + rnd() * spread)), dt = Math.abs(rnd()) * 0.012;
    for (let i = 0; i < d * 5 * SR; i++) {
      const t = i / SR;
      put(S(t0 + dt) + i, Math.sin(2 * Math.PI * f * t) * a * Math.exp(-t / d) * Math.min(1, t / 0.0005), p, send);
    }
  }
}
// 금속 울림(거울 틀): 비화성 부분음, 길게
function clang(t0, f, amp, decay, pan = 0) {
  const parts = [[1, 1], [2.32, 0.6], [3.91, 0.35], [5.43, 0.2], [6.97, 0.12]];
  for (let i = 0; i < decay * 5 * SR; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp((-t * m) / (decay * 1.5));
    put(S(t0) + i, v * amp * Math.exp(-t / decay) * Math.min(1, t / 0.001), pan, 0.6);
  }
}
// 종(불붙는 문장·끝 화면)
function bell(t0, f, amp, decay, pan = 0) {
  const parts = [[1, 1], [2.01, 0.45], [2.76, 0.25], [5.4, 0.08]];
  for (let i = 0; i < decay * 6 * SR; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * (m - 1) * 0.8);
    put(S(t0) + i, v * amp * Math.min(1, t / 0.004) * Math.exp(-t / decay), pan, 0.5);
  }
}
// 디지털 글리치: 계단 소리(비트 깎음) 짧게 여러 토막
function glitch(t0, dur, amp) {
  let hold = 0, cnt = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    if (cnt-- <= 0) {
      hold = Math.round(rnd() * 3) / 3;
      cnt = 40 + Math.floor(Math.abs(rnd()) * 400);
    }
    const gate = Math.sin(2 * Math.PI * 23 * t) > -0.2 ? 1 : 0;
    put(S(t0) + i, hold * amp * gate * (1 - t / dur), rnd() * 0.3, 0.1);
  }
}
// 심장: 낮은 두 번 쿵
function heart(t0, amp) {
  kick(t0, 90, 42, 0.35, amp, 0.15);
  kick(t0 + 0.17, 80, 40, 0.3, amp * 0.6, 0.15);
}
// 바탕: 낮은 웅웅(긴장) → 숨 멈춤에 빠짐 → 깨진 뒤 A 단조 패드로 풀림
function bed() {
  let ph1 = 0, ph2 = 0, lp = 0;
  const pad = [110, 130.81, 164.81, 220, 261.63, 329.63];
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const ten = Math.min(1, t / 1.5) * (0.6 + 0.4 * Math.min(1, Math.max(0, (t - 2) / 5)));
    const hold = 1 - 0.85 * smooth(6.85, 7.3, t) * (1 - smooth(7.58, 7.62, t)); // 숨 멈춤
    const outD = 1 - smooth(8.1, 8.6, t);
    ph1 += (2 * Math.PI * 41.2) / SR;
    ph2 += (2 * Math.PI * 41.2 * 1.007) / SR;
    lp += 0.01 * (rnd() - lp);
    let v = (Math.sin(ph1) + Math.sin(ph2) * 0.8 + 0.35 * Math.tanh(2 * Math.sin(ph1 * 2))) * 0.09 + lp * 0.6;
    v *= ten * hold * outD;
    // 패드
    const padE = smooth(9.25, 10.8, t) * (1 - smooth(14.2, 15, t)) * (0.7 + 0.3 * smooth(11.6, 12.4, t));
    let pv = 0;
    pad.forEach((f, k) => (pv += Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * 0.2 * (k + 1) * t) * 0.7) / (k + 1.6)));
    v += pv * 0.07 * padE;
    put(i, v, 0.12 * Math.sin(2 * Math.PI * 0.1 * t), 0.2);
  }
}
function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ── 이벤트 배치 (ad4-3d.js 시각표)
bed();
heart(0.1, 0.55);
heart(6.95, 0.5);
glitch(0.22, 0.12, 0.18);
glitch(1.72, 0.16, 0.2);
const HITS = [2.05, 3.85, 5.65];
const PAN = [-0.35, 0.35, -0.3]; // 금이 생기는 쪽(왼·오·왼)
HITS.forEach((t, k) => {
  whoosh(t - 0.42, 0.42, 0.55, PAN[k] * 2);
  kick(t, 120, 34, 0.9, 0.95);
  noise(t, 0.07, 0.75, 0.9, PAN[k], 0.4);
  glass(t, 0.55, 12, PAN[k], 0.4);
  clang(t, 182 + k * 17, 0.09, 0.9, PAN[k] * 0.5);
  glitch(t, 0.06, 0.12);
});
// 들켰죠
whoosh(7.6 - 0.5, 0.5, 0.75);
kick(7.6, 140, 30, 1.4, 1.1);
noise(7.6, 0.1, 0.9, 0.85, 0, 0.5);
glass(7.6, 0.6, 16, 0, 0.8);
clang(7.6, 146.8, 0.13, 1.4);
// 금이 번지는 소리: 잘게 튀는 딸깍이 점점 촘촘하게
for (let k = 0; k < 70; k++) {
  const u = Math.pow(k / 70, 0.7);
  const t = 7.66 + u * 0.47;
  glass(t, 0.12 + 0.18 * u, 2, rnd() * 0.8, 0.2, 0.3);
  noise(t, 0.008, 0.25 * (0.4 + u), 0.95, rnd() * 0.8, 0.1);
}
// 깨짐
kick(8.15, 160, 26, 2.2, 1.25, 0.6);
noise(8.15, 0.35, 1.0, 0.75, 0, 0.7, 0.001, 3);
noise(8.15, 1.6, 0.25, 0.25, 0, 0.8, 0.02, 3); // 낮은 우르릉
for (let k = 0; k < 110; k++) {
  const t = 8.15 + Math.pow(Math.abs(rnd()), 1.6) * 1.6;
  glass(t, 0.38 * Math.exp(-(t - 8.15) * 1.1), 3, rnd(), 0.4, 0.55);
}
// 구멍 통과: 바람
(function wind() {
  let lp = 0, lp2 = 0;
  const t0 = 8.4, dur = 1.6;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, u = t / dur;
    const env = Math.sin(Math.PI * u) ** 1.5;
    const k = 0.03 + 0.25 * Math.sin(Math.PI * u);
    lp += k * (rnd() - lp);
    lp2 += k * (lp - lp2);
    put(S(t0) + i, (lp - lp2) * 1.6 * env, Math.sin(u * 6) * 0.5, 0.3);
  }
})();
// 일곱 문장이 불붙음: A 단조 오음계 오르막
const SC = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
SC.forEach((f, k) => {
  const t = 9.3 + 0.15 + k * 0.11;
  bell(t, f, 0.16, 0.9, Math.cos(Math.PI / 2 + (k / 7) * Math.PI * 2) * 0.7);
  noise(t, 0.04, 0.12, 0.6, 0, 0.3);
});
// "결제하면, 듣기 싫은 말까지 전부"
kick(10.3, 100, 38, 0.6, 0.6, 0.4);
glitch(10.3, 0.08, 0.14);
// 끝 화면
bell(11.7, 110, 0.32, 2.8);
bell(11.7, 164.81, 0.24, 2.6);
bell(11.72, 220, 0.18, 2.4, 0.2);
bell(12.25, 1318.5, 0.06, 1.2, -0.3);
kick(12.4, 90, 40, 0.5, 0.35, 0.3);
bell(12.4, 659.25, 0.12, 1.6, 0.25);

// ── 잔향: 슈뢰더(빗살 4 + 통과 2), 좌우 길이 다르게
function reverb(inp, combs, aps, fb = 0.8, damp = 0.25) {
  const out = new Float32Array(N);
  combs.forEach((d) => {
    const buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * (1 - damp) + lp * damp;
      buf[idx] = inp[i] + lp * fb;
      out[i] += y / combs.length;
      idx = (idx + 1) % d;
    }
  });
  aps.forEach((d) => {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx], x = out[i];
      buf[idx] = x + b * 0.5;
      out[i] = b - x * 0.5;
      idx = (idx + 1) % d;
    }
  });
  return out;
}
const RL = reverb(VL, [1557, 1617, 1491, 1422].map((d) => d * 2), [225, 556]);
const RR = reverb(VR, [1580, 1640, 1514, 1445].map((d) => d * 2), [248, 579]);
for (let i = 0; i < N; i++) {
  L[i] += RL[i] * 0.55;
  R[i] += RR[i] * 0.55;
}

// 부드러운 제한(tanh) 뒤 정규화 → 16비트 WAV
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.2);
  R[i] = Math.tanh(R[i] * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so-sound4-"));
const wav = path.join(tmp, "ad4.wav");
fs.writeFileSync(wav, buf);
if (process.argv.includes("--wav")) {
  fs.copyFileSync(wav, path.join(OUT, "ad4-busted-3d-ko.wav"));
  console.log("→ marketing/strange-oracle/out/ad4-busted-3d-ko.wav");
}
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, "ad4-busted-3d-ko.mp4"), "-i", wav,
  "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, "ad4-busted-3d-ko-sound.mp4")], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg 실패");
console.log("→ marketing/strange-oracle/out/ad4-busted-3d-ko-sound.mp4");
