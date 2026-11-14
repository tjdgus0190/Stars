// 광고 10안 「일곱 안내자」 소리판 (2026-11-14). 9안의 부품(첼레스타·합창·잔향)을 쓰되 불꽃 대신 대화·두루마리·별가루 소리로:
//   ① 일곱 점술: 안내자가 바뀔 때마다 한 음씩 오르는 첼레스타 ② 면담: 보내는 말풍선(밝은 톡) · 답을 고르는 점(작은 딸깍) · 받는 말풍선(따뜻한 톡) · 역질문(두 음 오름)
//   ③ 오늘의 신탁: 두루마리 펼침(종이 숨소리) · 별가루 +5(반짝이는 아르페지오) · 날이 바뀜(첼레스타) · 끝 화면 합창.
//   외부 음원 없이 스크립트가 계산(씨앗 고정). 실행(저장소 루트): node marketing/strange-oracle/render/sound-ad10.js → ../out/ad10-guides-ko-sound.mp4
// 시점은 scenes/ad10-guides.js T와 같다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const VIDEO = "ad10-guides-ko";
const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000, DUR = 21, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N);
let seed = 2026111400;
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
// 말풍선 톡: 짧은 사인 두 겹(높이 f), 아주 짧은 꼬리
function blip(t0, f, amp, pan = 0) {
  for (let i = 0; i < 0.18 * SR; i++) {
    const t = i / SR, e = Math.min(1, t / 0.003) * Math.exp(-t * 26);
    put(S(t0) + i, (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t)) * amp * e, pan, 0.25);
  }
}
// 종이 숨소리(두루마리 펼침): 걸러 낸 잡음이 부풀었다 잦아듦
function paper(t0, dur, amp) {
  let lp = 0, hp = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, u = t / dur, n = rnd();
    lp += 0.35 * (n - lp); hp = lp - hp * 0.2;
    put(S(t0) + i, hp * amp * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 23 * t)), 0, 0.2);
  }
}
const MEL = [74, 76, 78, 81, 83, 86, 88].map(mtof); // D5 E5 F#5 A5 B5 D6 E6

// 바탕 합창: 첫 장면 낮게 → 기능 동안 은은하게 → 끝에서 밝게
choir([mtof(50), mtof(57), mtof(62), mtof(66)], (t) => Math.min(1, t / 0.8) * 0.5 * (1 - 0.4 * smooth(2.6, 3.4, t)) * (1 - smooth(18.0, 18.6, t)), 1);
choir([mtof(50), mtof(57), mtof(62), mtof(66), mtof(69)], (t) => smooth(18.4, 19.2, t) * Math.min(1, (DUR - t) / 1.2), 1.1);
// 0~2.75 첫 장면: 아치가 모일 때마다 첼레스타(가운데에서 바깥으로)
celesta(0.05, mtof(62), 0.2, 0, 1.6);
[1, 2, 3].forEach((n) => { celesta(0.15 + n * 0.2, mtof(62 + n * 4), 0.15, -0.4, 1.2); celesta(0.17 + n * 0.2, mtof(62 + n * 4 + 3), 0.13, 0.4, 1.2); });
celesta(0.95, mtof(78), 0.14, 0, 1.4);
// ① 일곱 점술: 2.95부터 0.66초마다 한 음씩 오른다(아래 옥타브 살짝)
for (let k = 0; k < 7; k++) { const t = 2.95 + k * 0.66; celesta(t, MEL[k], 0.26, (k - 3) * 0.18, 1.2); celesta(t + 0.02, MEL[k] / 2, 0.12, (k - 3) * 0.1, 1.0); }
// ② 면담: 카드 → 보내는 톡 → 답을 고르는 점 → 받는 톡 넷(마지막은 역질문 두 음)
celesta(7.9, mtof(69), 0.12, 0, 1.2);
blip(8.4, 1320, 0.22, 0.35);
for (let t = 8.95; t < 9.75; t += 0.3) tick(t, 0.1, -0.2);
[9.85, 10.55, 11.25].forEach((t, k) => blip(t, [880, 990, 880][k], 0.2, -0.3));
blip(12.05, 880, 0.2, -0.3); celesta(12.1, mtof(81), 0.14, -0.1, 1.0); celesta(12.3, mtof(86), 0.15, 0.1, 1.4);
// ③ 오늘의 신탁: 아치 → 두루마리 → 별가루 +5 → 날이 바뀜
celesta(13.85, mtof(74), 0.18, 0, 1.6);
paper(14.5, 0.7, 0.18);
celesta(14.95, mtof(78), 0.12, 0, 1.4);
[86, 90, 93, 98].forEach((m, k) => celesta(15.45 + k * 0.06, mtof(m), 0.12, (k - 1.5) * 0.3, 0.9));
crackle(15.5, 0.6, 0.04, 0.2);
celesta(16.75, mtof(76), 0.16, -0.2, 1.0); celesta(17.45, mtof(78), 0.16, 0.2, 1.0);
// 끝 화면: 아치 일곱 개 → 세 줄 → 행동 문구 화음
for (let k = 0; k < 7; k++) celesta(18.9 + k * 0.07, MEL[k] * 2, 0.08, (k - 3) * 0.2, 0.8);
[19.5, 19.72, 19.94].forEach((t, k) => celesta(t, mtof([74, 78, 81][k]), 0.14, (k - 1) * 0.3, 1.2));
[62, 66, 69, 74, 78].forEach((m, k) => celesta(20.3 + k * 0.025, mtof(m), 0.15, (k - 2) * 0.2, 2.0));

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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so-sound10-"));
const wav = path.join(tmp, "a.wav");
fs.writeFileSync(wav, buf);
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, `${VIDEO}.mp4`), "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, `${VIDEO}-sound.mp4`)], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg 실패");
console.log(`→ marketing/strange-oracle/out/${VIDEO}-sound.mp4`);
