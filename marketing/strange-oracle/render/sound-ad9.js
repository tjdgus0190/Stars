// 광고 9안 「일곱 점술이 말하는 2027」 소리판 (2026-11-12). 다른 광고(쿵·휙·종·단조 패드)와 겹치지 않게 새로 짰다:
//   오르골·첼레스타(배음 위주의 맑은 음, D 장조 선율) · 멀리서 터지는 새해 불꽃(오르는 휘파람 · 부드러운 퍽 · 타닥 불티) · 부드러운 합창 화음("아" 모음 결) · 자정의 시계 초침.
//   외부 음원 없이 스크립트가 계산(씨앗 고정). 실행(저장소 루트): node marketing/strange-oracle/render/sound-ad9.js → ../out/ad9-newyear-ko-sound.mp4
// 시점은 scenes/ad9-newyear.js T와 같다: 0.1 초침 · 1.0 2026→2027 · 1.55 자막 · 2.3부터 1.1초마다 불꽃(오르고 0.45초 뒤 터짐) · 10.15 별자리 · 10.85 가운데 2027 · 12.6 끝
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const VIDEO = "ad9-newyear-ko";
const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N);
let seed = 2027010100;
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
// 첼레스타·오르골: 정수배 배음, 높은 배음일수록 빨리 사라짐. 두 겹을 아주 조금 어긋나게(맑은 떨림)
function celesta(t0, f, amp, pan = 0, decay = 1.3) {
  const parts = [[1, 1], [2, 0.32], [3, 0.12], [4, 0.07], [6, 0.03]];
  for (let i = 0; i < decay * 4 * SR; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a] of parts) v += a * (Math.sin(2 * Math.PI * f * m * t) + 0.6 * Math.sin(2 * Math.PI * f * m * 1.0025 * t)) * Math.exp(-t * m * 1.1);
    put(S(t0) + i, v * amp * 0.6 * Math.min(1, t / 0.002) * Math.exp(-t / decay), pan, 0.45);
  }
}
// 합창 화음("아"): 배음마다 모음 꼴(700·1150Hz 근처)을 얹은 가산 합성, 느린 떨림. env(t) = 0~1
function choir(notes, env, amp) {
  const formant = (h) => Math.exp(-(((h - 700) / 260) ** 2)) + 0.6 * Math.exp(-(((h - 1150) / 300) ** 2)) + 0.25 * Math.exp(-(((h - 2600) / 500) ** 2));
  const voices = notes.map((f) => { const parts = []; for (let k = 1; k * f < 4000; k++) parts.push([k, formant(k * f) / Math.sqrt(k)]); return { f, parts }; });
  for (let i = 0; i < N; i++) {
    const t = i / SR, e = env(t);
    if (e <= 0) continue;
    let v = 0;
    voices.forEach(({ f, parts }, n) => {
      const vib = 1 + 0.0035 * Math.sin(2 * Math.PI * (5 + n * 0.3) * t + n);
      for (const [k, a] of parts) v += a * Math.sin(2 * Math.PI * f * k * vib * t + k * n);
    });
    put(i, v * amp * e * 0.04, 0.2 * Math.sin(2 * Math.PI * 0.11 * t), 0.5);
  }
}
// 시계 초침: 아주 짧은 나무+금속 딸깍
function tick(t0, amp, pan = 0) {
  for (let i = 0; i < 0.04 * SR; i++) {
    const t = i / SR;
    put(S(t0) + i, (Math.sin(2 * Math.PI * 3100 * t) * 0.6 + rnd() * 0.5) * amp * Math.exp(-t * 180), pan, 0.15);
  }
}
// 새해 불꽃: 오르는 휘파람(사인 미끄럼 + 숨소리) → 멀리서 부드러운 퍽 → 타닥 불티
function launch(t0, dur, amp, pan) {
  let ph = 0, lp = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, u = t / dur, f = 520 + 1100 * u * u;
    ph += (2 * Math.PI * f) / SR;
    lp += 0.25 * (rnd() - lp);
    const e = smooth(0, 0.25, u) * (1 - smooth(0.85, 1, u));
    put(S(t0) + i, (Math.sin(ph) * 0.35 + lp * 0.5) * amp * e, pan * (1 - u * 0.5), 0.3);
  }
}
function pop(t0, amp, pan) {
  let lp = 0;
  for (let i = 0; i < 0.9 * SR; i++) {
    const t = i / SR;
    lp += 0.05 * (rnd() - lp);
    const v = Math.sin(2 * Math.PI * (48 + 30 * Math.exp(-t * 20)) * t) * Math.exp(-t * 6) * 0.8 + lp * 2.2 * Math.exp(-t * 5);
    put(S(t0) + i, v * amp * Math.min(1, t / 0.012), pan, 0.6);
  }
}
function crackle(t0, dur, amp, pan) {
  let t = 0;
  while (t < dur) {
    t += 0.008 + Math.abs(rnd()) * 0.05 * (0.4 + t / dur);
    const a = amp * (0.3 + Math.abs(rnd()) * 0.7) * (1 - t / dur), p = Math.max(-1, Math.min(1, pan + rnd() * 0.5));
    const len = Math.floor((0.002 + Math.abs(rnd()) * 0.004) * SR);
    let prev = 0;
    for (let i = 0; i < len; i++) { const n = rnd(); put(S(t0 + t) + i, (n - prev) * a * (1 - i / len), p, 0.35); prev = n; }
  }
}
// D 장조 선율(일곱 점술마다 한 음씩 올라간다)
const MEL = [74, 76, 78, 81, 83, 86, 88].map(mtof); // D5 E5 F#5 A5 B5 D6 E6
const PAN = [0, 0.55, 0.65, 0.3, -0.3, -0.65, -0.55]; // 꼭짓점 자리와 맞춘 좌우

// 바탕 합창: 자정 동안 낮게 → 불꽃 동안 은은하게 → 별자리에서 넓게 → 끝에서 밝게
choir([mtof(50), mtof(57), mtof(62), mtof(66)], (t) => Math.min(1, t / 0.8) * (0.35 + 0.25 * smooth(1.2, 2.0, t)) * (1 - 0.5 * smooth(2.2, 2.8, t)) + 0.55 * smooth(9.9, 10.9, t) * (1 - smooth(12.2, 12.7, t)), 1);
choir([mtof(50), mtof(57), mtof(62), mtof(66), mtof(69)], (t) => smooth(12.4, 13.2, t) * Math.min(1, (DUR - t) / 1.2), 1.1);
// 0~1.0 자정: 초침 세 번 → 1.0 끝자리가 굴러감(첼레스타 미끄럼) → 1.35 빛 오름(화음)
[0.1, 0.4, 0.7].forEach((t, k) => tick(t, 0.32, k % 2 ? 0.15 : -0.15));
celesta(1.0, mtof(81), 0.22, 0, 0.6); celesta(1.08, mtof(86), 0.2, 0.1, 0.8);
[62, 66, 69, 74].forEach((m, k) => celesta(1.35 + k * 0.03, mtof(m), 0.18, (k - 1.5) * 0.2, 1.8));
// 1.55 자막: 오르골 세 음
celesta(1.6, mtof(78), 0.16, -0.2, 1.0); celesta(1.8, mtof(81), 0.16, 0.2, 1.0); celesta(2.0, mtof(86), 0.18, 0, 1.4);
// 2.3~ 불꽃 일곱 발: 휘파람 → 퍽 + 불티 + 그 점술의 음(아래 옥타브를 살짝 겹침)
for (let k = 0; k < 7; k++) {
  const Lt = 2.3 + k * 1.1, B = Lt + 0.45;
  launch(Lt, 0.45, 0.16, PAN[k]);
  pop(B, 0.42, PAN[k] * 0.6);
  crackle(B + 0.12, 1.0, 0.12, PAN[k]);
  celesta(B + 0.02, MEL[k], 0.3, PAN[k] * 0.5, 1.4);
  celesta(B + 0.04, MEL[k] / 2, 0.14, PAN[k] * 0.3, 1.2);
}
// 10.15 별자리: 별을 잇는 빠른 아르페지오 → 10.85 가운데 2027(화음)
for (let k = 0; k < 7; k++) celesta(10.15 + k * 0.1, MEL[k] * 2, 0.11, PAN[k] * 0.7, 0.9);
[62, 66, 69, 74, 78].forEach((m, k) => celesta(10.85 + k * 0.025, mtof(m), 0.16, (k - 2) * 0.2, 2.2));
// 12.6 끝: 오르골 선율(D-F#-A-D) + 마지막 불티 하나
[74, 78, 81, 86].forEach((m, k) => celesta(12.9 + k * 0.22, mtof(m), 0.2, (k - 1.5) * 0.25, 1.6));
crackle(13.0, 1.2, 0.05, 0);
celesta(13.9, mtof(90), 0.12, 0.3, 1.8);

// 잔향(슈뢰더) → 부드러운 제한 → WAV → 영상에 붙임(-14 LUFS)
function reverb(inp, combs, aps, fb = 0.8, damp = 0.25) {
  const out = new Float32Array(N);
  combs.forEach((d) => { const buf = new Float32Array(d); let idx = 0, lp = 0; for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * (1 - damp) + lp * damp; buf[idx] = inp[i] + lp * fb; out[i] += y / combs.length; idx = (idx + 1) % d; } });
  aps.forEach((d) => { const buf = new Float32Array(d); let idx = 0; for (let i = 0; i < N; i++) { const b = buf[idx], x = out[i]; buf[idx] = x + b * 0.5; out[i] = b - x * 0.5; idx = (idx + 1) % d; } });
  return out;
}
const RL = reverb(VL, [3114, 3234, 2982, 2844], [225, 556]), RR = reverb(VR, [3160, 3280, 3028, 2890], [248, 579]);
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh((L[i] + RL[i] * 0.55) * 1.2);
  R[i] = Math.tanh((R[i] + RR[i] * 0.55) * 1.2);
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so-sound9-"));
const wav = path.join(tmp, "a.wav");
fs.writeFileSync(wav, buf);
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, `${VIDEO}.mp4`), "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, `${VIDEO}-sound.mp4`)], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg 실패");
console.log(`→ marketing/strange-oracle/out/${VIDEO}-sound.mp4`);
