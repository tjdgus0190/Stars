// 전설 릴스 「문 너머의 기록」 소리판 (2026-11-12). 광고들(쿵·휙·종·오르골)과 다른 결로 편마다 짠다. 외부 음원 없음(씨앗 고정).
//   rune 「세 여인이 새기는 운명」: 숲 바람 · E 도리아 현악 지속음 · 세 여인이 켜질 때 낮은/가운데/높은 종 · 나무에 글자를 새기는 끌 소리 셋
//     · "신들조차 바꿀 수 없었다" 묵직한 한 방 → 고요 → 샘물이 흘러 나무에 닿는 물소리 → 잎이 켜지며 종 아르페지오와 장조 화음 · 질문의 셋에 뜯는 소리
// 실행(저장소 루트): node marketing/strange-oracle/render/sound-legend.js rune → ../out/legend-rune-ko-sound.mp4
// 시점은 scenes/legend/legend-<편>.js의 T와 같다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const EP = process.argv[2] || "rune";
const TT = {
  rune: { b1: 2.9, b2: 5.2, w1: 7.6, w2: 9.6, w3: 11.6, b6: 13.8, b7: 16.4, b8: 18.8, b9: 21.0, pour: 21.4, b10: 23.4, b11: 25.8, q: 28.4, brand: 30.2, dur: 32 },
};
if (!TT[EP]) throw new Error(`알 수 없는 편: ${EP} (rune)`);
const T = TT[EP];
const VIDEO = `legend-${EP}-ko`;
const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000, DUR = T.dur, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N);
let seed = 2410000003;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const S = (t) => Math.floor(t * SR);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function put(i, v, pan, send) {
  if (i < 0 || i >= N) return;
  const l = v * (1 - pan) * 0.5, r = v * (1 + pan) * 0.5;
  L[i] += l; R[i] += r;
  if (send) { VL[i] += l * send; VR[i] += r * send; }
}

// ── 낮은 현악 지속음: 톱니파 몇 겹을 낮은 통과 필터로 둥글게. env(t)로 세기, chord(t)로 음
function strings(env, chord, amp) {
  const ph = new Float64Array(12);
  let lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, e = env(t);
    if (e <= 0.0005) { lpL *= 0.999; lpR *= 0.999; continue; }
    const notes = chord(t);
    let vl = 0, vr = 0;
    notes.forEach((m, k) => {
      for (let d = 0; d < 2; d++) {
        const j = k * 2 + d, f = mtof(m) * (d ? 1.004 : 0.996) * (1 + 0.002 * Math.sin(2 * Math.PI * (4.6 + k * 0.3) * t));
        ph[j] = (ph[j] + f / SR) % 1;
        const saw = ph[j] * 2 - 1;
        if (d) vr += saw; else vl += saw;
      }
    });
    const a = 0.03 + 0.05 * e;
    lpL += (vl - lpL) * a; lpR += (vr - lpR) * a;
    put(i, 0, 0, 0);
    L[i] += lpL * e * amp; R[i] += lpR * e * amp;
    VL[i] += lpL * e * amp * 0.5; VR[i] += lpR * e * amp * 0.5;
  }
}
// ── 화롯불: 낮은 바람 소리 + 무작위 타닥(씨앗 고정). level(t)
function fire(level) {
  let lp = 0, lp2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, lv = level(t);
    const n = rnd();
    lp += (n - lp) * 0.02; lp2 += (lp - lp2) * 0.05;
    const roar = lp2 * 3.2 * lv;
    L[i] += roar * 0.9; R[i] += roar * 0.9;
    if (Math.abs(rnd()) > 1 - 0.00035 * (0.4 + lv)) crack(i, 0.06 + Math.abs(rnd()) * 0.12 * (0.5 + lv), rnd() * 0.8);
  }
}
function crack(i0, amp, pan) {
  const len = Math.floor(SR * (0.004 + Math.abs(rnd()) * 0.01));
  let hp = 0, prev = 0;
  for (let i = 0; i < len; i++) { const n = rnd(); hp = n - prev; prev = n; put(i0 + i, hp * amp * Math.exp(-i / (len * 0.3)), pan, 0.2); }
}
// ── 바람(휙): 띠 통과 잡음이 위로 쓸려 올라감
function whoosh(t0, dur, amp, pan0, pan1) {
  let b1 = 0, b2 = 0;
  for (let i = 0; i < dur * SR; i++) {
    const x = i / (dur * SR), f = 300 + 2600 * x * x;
    const w = 2 * Math.sin(Math.PI * f / SR);
    const n = rnd();
    b1 += w * (n - b1 - b2 * 0.6); b2 += w * b1;
    put(S(t0) + i, b2 * amp * Math.sin(Math.PI * x) ** 1.5, pan0 + (pan1 - pan0) * x, 0.4);
  }
}
// ── 불길이 치솟음(숨 들이켜듯 낮은 굉음)
function flare(t0, dur, amp) {
  let lp = 0, lp2 = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, n = rnd();
    lp += (n - lp) * 0.06; lp2 += (lp - lp2) * 0.08;
    const e = Math.min(1, t / 0.06) * Math.exp(-t / (dur * 0.35));
    put(S(t0) + i, (lp2 * 5 + Math.sin(2 * Math.PI * 48 * t) * 0.3) * e * amp, rnd() * 0.15, 0.5);
  }
}
// ── 묵직한 한 방: 낮은 사인 하강 + 잡음 머리
function boom(t0, amp, f0 = 70) {
  let ph = 0;
  for (let i = 0; i < 2.5 * SR; i++) {
    const t = i / SR, f = f0 * (1 + 1.2 * Math.exp(-t * 18));
    ph += (2 * Math.PI * f) / SR;
    const head = t < 0.03 ? rnd() * (1 - t / 0.03) * 0.6 : 0;
    put(S(t0) + i, (Math.sin(ph) * Math.exp(-t / 0.7) + head) * amp, 0, 0.35);
  }
}
// ── 심장처럼 낮은 두드림
function thump(t0, amp) { let ph = 0; for (let i = 0; i < 0.35 * SR; i++) { const t = i / SR; ph += (2 * Math.PI * (55 + 40 * Math.exp(-t * 30))) / SR; put(S(t0) + i, Math.sin(ph) * Math.exp(-t / 0.09) * amp, 0, 0.1); } }
// ── 동전: 비배음 금속 울림 몇 개
function coin(t0, amp, pan) {
  const parts = [[2800, 1], [4100, 0.6], [6250, 0.4], [7900, 0.25]];
  for (let i = 0; i < 0.6 * SR; i++) { const t = i / SR; let v = 0; parts.forEach(([f, a], k) => { v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * (8 + k * 4)); }); put(S(t0) + i, v * amp * 0.4, pan, 0.4); }
}
// ── 맑은 종(시빌라): 종 배음(1, 2.0, 2.76, 5.4)
function bell(t0, f, amp, pan) {
  const parts = [[1, 1], [2.0, 0.5], [2.76, 0.35], [5.4, 0.15], [0.5, 0.25]];
  for (let i = 0; i < 4 * SR; i++) { const t = i / SR; let v = 0; parts.forEach(([m, a]) => { v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * (0.8 + m * 0.6)); }); put(S(t0) + i, v * amp * Math.min(1, t / 0.003), pan, 0.7); }
}
// ── 뜯는 소리(카플러스-스트롱)
function pluck(t0, f, amp, pan) {
  const p = Math.round(SR / f), buf = new Float32Array(p);
  for (let k = 0; k < p; k++) buf[k] = rnd();
  for (let i = 0, idx = 0; i < 2 * SR; i++) { const nx = (idx + 1) % p, v = buf[idx]; buf[idx] = 0.497 * (v + buf[nx]); idx = nx; put(S(t0) + i, v * amp, pan, 0.5); }
}
// ── 오르는 긴장(높아지는 잡음 + 올라가는 음)
function riser(t0, t1, amp) {
  let b1 = 0, b2 = 0, ph = 0;
  for (let i = S(t0); i < S(t1); i++) {
    const x = (i - S(t0)) / (S(t1) - S(t0)), f = 500 + 3500 * x * x, w = 2 * Math.sin(Math.PI * f / SR), n = rnd();
    b1 += w * (n - b1 - b2 * 0.5); b2 += w * b1;
    ph += (2 * Math.PI * (110 * Math.pow(2, x * 1.5))) / SR;
    put(i, (b2 * 0.6 + Math.sin(ph) * 0.25) * amp * x * x, 0, 0.3);
  }
}

// ── 바람: 아주 낮은 잡음이 천천히 숨 쉬듯. level(t)
function wind(level) {
  let a = 0, b = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, lv = level(t), n = rnd();
    const w = 0.004 + 0.01 * (0.5 + 0.5 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1));
    a += (n - a) * w; b += (a - b) * 0.2;
    L[i] += b * 1.3 * lv; R[i] += (a * 1.3 - b * 0.4) * lv * 0.8;
  }
}
// ── 물: 흐르는 소리(띠 통과 잡음 + 방울 소리)
function water(t0, dur, amp) {
  let b1 = 0, b2 = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, x = t / dur, f = 900 + 500 * Math.sin(t * 23) + 300 * Math.sin(t * 57), w = 2 * Math.sin(Math.PI * f / SR), n = rnd();
    b1 += w * (n - b1 - b2 * 0.3); b2 += w * b1;
    put(S(t0) + i, b2 * amp * Math.sin(Math.PI * Math.min(1, x * 1.4)) ** 0.7, Math.sin(t * 3) * 0.3, 0.4);
    if (Math.abs(rnd()) > 0.9993) drop(S(t0) + i, amp * 0.6, rnd() * 0.6);
  }
}
function drop(i0, amp, pan) { let ph = 0; for (let i = 0; i < 0.08 * SR; i++) { const t = i / SR, f = 700 + 1800 * (t / 0.08); ph += (2 * Math.PI * f) / SR; put(i0 + i, Math.sin(ph) * Math.exp(-t / 0.02) * amp, pan, 0.5); } }
// ── 끌로 나무에 새기는 소리: 나무 두드림(짧은 낮은 울림) + 긁는 잡음
function chisel(t0, amp, pan) {
  let ph = 0;
  for (let i = 0; i < 0.25 * SR; i++) { const t = i / SR; ph += (2 * Math.PI * (180 + 60 * Math.exp(-t * 40))) / SR; put(S(t0) + i, (Math.sin(ph) * 0.8 + Math.sin(ph * 2.7) * 0.3) * Math.exp(-t / 0.05) * amp, pan, 0.3); }
  let hp = 0, prev = 0;
  for (let i = 0; i < 0.3 * SR; i++) { const t = i / SR, n = rnd(); hp = n - prev; prev = n; put(S(t0 + 0.05) + i, hp * amp * 0.35 * Math.sin(Math.PI * t / 0.3), pan, 0.2); }
}

// ── 배치 (rune)
// 지속음: E 도리아(E2·B2·D3·F#3), 신도 못 바꾼다에서 어둡게(C), 고요, 물이 닿으면 E 장조로 밝게, 질문은 열린 화음
const chord = (t) => (t < T.b7 ? [40, 47, 50, 54] : t < T.b9 ? [36, 43, 52, 55] : t < T.q ? [40, 47, 56, 59] : [40, 47, 54, 59]);
strings((t) => (0.4 + 0.2 * smooth(T.b1, T.b1 + 1.5, t) + 0.3 * smooth(T.b6, T.b7, t)) * (1 - 0.75 * smooth(T.b8, T.b8 + 0.8, t) * (1 - smooth(T.pour + 0.6, T.pour + 1.6, t))) * (1 - 0.4 * smooth(T.q, T.q + 1.5, t)) * (1 - smooth(DUR - 0.8, DUR, t)) * Math.min(1, t / 0.05 + 0.4), chord, 0.055);
wind((t) => (0.5 + 0.4 * smooth(T.b1, T.b1 + 1, t) * (1 - smooth(T.b1 + 2, T.b2 + 1, t)) + 0.4 * smooth(T.b8, T.b8 + 1, t) * (1 - smooth(T.pour, T.pour + 1, t))) * (1 - smooth(DUR - 0.8, DUR, t)));

boom(0.02, 0.45, 58); chisel(0.05, 0.5, 0); bell(0.12, mtof(83), 0.06, 0.1);
whoosh(T.b1 - 0.2, 1.6, 0.3, -0.3, 0.3); boom(T.b1 + 0.3, 0.35, 45);
[[T.w1, 52, -0.5], [T.w2, 59, 0], [T.w3, 64, 0.5]].forEach(([t, m, pan]) => { bell(t + 0.05, mtof(m), 0.12, pan); pluck(t + 0.05, mtof(m - 12), 0.25, pan); });
bell(T.b6 + 0.3, mtof(83), 0.07, 0);
[1, 2, 3].forEach((k) => { chisel(T.b6 + 0.1 + k * 0.5, 0.7, (k - 2) * 0.3); bell(T.b6 + 0.4 + k * 0.5, mtof([76, 79, 83][k - 1]), 0.05, (k - 2) * 0.3); });
boom(T.b7 + 0.35, 0.85, 48);
for (let t = T.b8 + 0.3, k = 0; k < 4; t += 0.7, k++) drop(S(t), 0.2, (k % 2 ? 0.3 : -0.3));
water(T.pour - 0.1, 2.2, 0.5);
[0, 0.12].forEach((d, k) => drop(S(T.pour + 0.85 + d), 0.4, k ? 0.3 : -0.3));
boom(T.pour + 0.9, 0.5, 52);
[64, 68, 71, 76, 80, 83, 88].forEach((m, k) => bell(T.pour + 1.0 + k * 0.17, mtof(m), 0.06, Math.sin(k * 1.7) * 0.6));
bell(T.b11 + 0.5, mtof(76), 0.07, -0.2); bell(T.b11 + 0.9, mtof(83), 0.05, 0.2);
[52, 59, 64].forEach((m, k) => pluck(T.q + 0.5 + k * 0.18, mtof(m + 12), 0.35, (k - 1) * 0.4));
bell(T.brand, mtof(88), 0.06, 0);

// ── 잔향(슈뢰더) → 부드러운 제한 → WAV → 영상에 붙임(-14 LUFS)
function reverb(inp, combs, aps, fb = 0.82, damp = 0.3) {
  const out = new Float32Array(N);
  combs.forEach((d) => { const buf = new Float32Array(d); let idx = 0, lp = 0; for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * (1 - damp) + lp * damp; buf[idx] = inp[i] + lp * fb; out[i] += y / combs.length; idx = (idx + 1) % d; } });
  aps.forEach((d) => { const buf = new Float32Array(d); let idx = 0; for (let i = 0; i < N; i++) { const b = buf[idx], x = out[i]; buf[idx] = x + b * 0.5; out[i] = b - x * 0.5; idx = (idx + 1) % d; } });
  return out;
}
const RL = reverb(VL, [3414, 3534, 3282, 3144], [225, 556]), RR = reverb(VR, [3460, 3580, 3328, 3190], [248, 579]);
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh((L[i] + RL[i] * 0.6) * 1.3);
  R[i] = Math.tanh((R[i] + RR[i] * 0.6) * 1.3);
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so-sound-lg-"));
const wav = path.join(tmp, "a.wav");
fs.writeFileSync(wav, buf);
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, `${VIDEO}.mp4`), "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, `${VIDEO}-sound.mp4`)], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg 실패");
console.log(`→ marketing/strange-oracle/out/${VIDEO}-sound.mp4`);
