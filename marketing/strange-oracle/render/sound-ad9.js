// 광고 9안 「새해 첫 장」 소리판 (2026-11-12). 다른 광고(쿵·휙·반짝임·단조 패드)와 결을 완전히 바꿨다:
//   뜯는 현(카플러스-스트롱, 가야금 결의 평조 오음계) · 풍경(바람 종) · 종이 넘기는 소리 · 나무 도장 소리 · 해돋이의 느린 현 화음 · 잔잔한 파도.
//   외부 음원 없이 스크립트가 계산(씨앗 고정). 실행(저장소 루트): node marketing/strange-oracle/render/sound-ad9.js → ../out/ad9-newyear-ko-sound.mp4
// 시점은 scenes/ad9-newyear.js T와 같다: 0.25 붓 제목 · 1.45 달력 넘김 · 2.2 丁未 도장 · 3.0 해돋이 · 6.2 열두 장(6.65부터 0.13초마다) · 8.75 낙관 · 10.4 일곱 낙관 · 12.6 끝
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const VIDEO = "ad9-newyear-ko";
const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N);
let seed = 2026111219;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const S = (t) => Math.floor(t * SR);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function put(i, v, pan, send) {
  if (i < 0 || i >= N) return;
  const l = v * (1 - pan) * 0.5, r = v * (1 + pan) * 0.5;
  L[i] += l; R[i] += r;
  if (send) { VL[i] += l * send; VR[i] += r * send; }
}
// 뜯는 현(카플러스-스트롱): 손톱으로 뜯은 듯 밝게 시작해 부드럽게 사그라진다. bend = 뜯은 뒤 살짝 눌러 올리는 농현(반음의 몇 분의 일)
function pluck(t0, f, amp, pan = 0, decay = 0.996, bend = 0) {
  const len = Math.round(SR / f);
  const buf = new Float32Array(len + 2);
  let lp = 0;
  for (let i = 0; i < buf.length; i++) { lp += 0.6 * (rnd() - lp); buf[i] = lp; }
  let idx = 0, prev = 0;
  const total = Math.floor(3.2 * SR);
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const d = len * (1 - bend * smooth(0.12, 0.45, t)); // 지연 길이를 조금 줄여 음을 올린다
    const di = Math.max(2, Math.min(len, Math.floor(d)));
    const a = buf[idx % di], b = buf[(idx + 1) % di];
    const y = (a + b) * 0.5 * decay;
    buf[idx % di] = y * 0.7 + prev * 0.3;
    prev = y;
    idx++;
    put(S(t0) + i, a * amp * Math.min(1, t / 0.003), pan, 0.35);
  }
}
// 풍경: 맑고 길게 남는 금속 부분음(배음이 아닌 비율)
function chime(t0, f, amp, pan = 0, decay = 2.2) {
  const parts = [[1, 1], [2.76, 0.5], [5.4, 0.28], [8.93, 0.12]];
  for (let i = 0; i < decay * 3 * SR; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * f * m * t + m) * Math.exp(-t * m * 0.6);
    put(S(t0) + i, v * amp * Math.min(1, t / 0.002) * Math.exp(-t / decay), pan, 0.6);
  }
}
// 종이 넘기는 소리: 띠를 좁힌 노이즈가 사락 — 길이 dur, 가운데가 조금 부풀었다 끝에 탁
function paper(t0, dur, amp, pan = 0) {
  let a = 0, b = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, u = t / dur;
    const n = rnd();
    a += 0.35 * (n - a); b += 0.08 * (a - b);
    const env = Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 0.7 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 9 * t) ** 2);
    put(S(t0) + i, (a - b) * amp * env * 2.2, pan + 0.3 * (u - 0.5), 0.25);
  }
  tock(t0 + dur * 0.92, 420, amp * 0.25, pan);
}
// 나무 도장·목탁 결: 짧은 공명 두 개 + 아주 작은 딸깍
function tock(t0, f, amp, pan = 0) {
  for (let i = 0; i < 0.35 * SR; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 28) + 0.5 * Math.sin(2 * Math.PI * f * 2.3 * t) * Math.exp(-t * 45) + 0.6 * Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 22);
    put(S(t0) + i, v * amp * Math.min(1, t / 0.0008), pan, 0.3);
  }
  for (let i = 0; i < 0.006 * SR; i++) put(S(t0) + i, rnd() * amp * 0.5 * (1 - i / (0.006 * SR)), pan, 0.1);
}
// 해돋이: 느리게 차오르는 현 화음(사인 여러 겹, 아주 느린 떨림)
function swell(t0, t1, notes, amp) {
  for (let i = S(t0); i < S(t1); i++) {
    const t = i / SR, u = (t - t0) / (t1 - t0);
    const e = smooth(0, 0.45, u) * (1 - smooth(0.75, 1, u));
    let v = 0;
    notes.forEach((f, k) => (v += (Math.sin(2 * Math.PI * f * t * (1 + 0.002 * Math.sin(2 * Math.PI * 4.5 * t))) + 0.3 * Math.sin(4 * Math.PI * f * t)) / (k + 1.2)));
    put(i, v * amp * e, 0.15 * Math.sin(2 * Math.PI * 0.2 * t), 0.4);
  }
}
// 바탕: 아주 옅은 방 공기 → 해돋이 동안 잔잔한 파도
function air() {
  let a = 0, b = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    a += 0.02 * (rnd() - a); b += 0.004 * (rnd() - b);
    const wave = smooth(2.8, 3.6, t) * (1 - smooth(5.9, 6.5, t)) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 0.33 * t - 1.2) ** 2);
    const e = Math.min(1, t / 0.5) * Math.min(1, (DUR - t) / 0.8);
    put(i, (a * 0.05 + b * 0.6 * wave * 2.2) * e, 0.2 * Math.sin(2 * Math.PI * 0.07 * t), 0.15);
  }
}
// 평조 오음계(D E G A B) — 뜯는 현의 음
const P = [146.83, 164.81, 196, 220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33, 659.25, 783.99];

air();
// 0 바람에 풍경 세 번 → 0.25 붓 제목에 맞춰 현 세 음(농현)
chime(0.05, 1567.98, 0.06, -0.4); chime(0.42, 1975.53, 0.045, 0.35); chime(0.8, 1760, 0.04, -0.1);
pluck(0.3, P[5], 0.5, -0.2, 0.996, 0.04); pluck(0.62, P[7], 0.45, 0.1); pluck(0.95, P[8], 0.5, 0.25, 0.997, 0.05);
// 1.45 달력 한 장 넘김 → 2.2 丁未 도장
paper(1.45, 0.72, 0.5, 0.1);
pluck(2.0, P[3], 0.4, -0.2); tock(2.22, 640, 0.45, 0.1); pluck(2.3, P[10], 0.35, 0.2, 0.997, 0.03);
// 3.0 해돋이: 느린 현 화음이 차오르고, 해가 오르는 동안 높은 현이 천천히
swell(2.9, 6.4, [146.83, 220, 293.66, 369.99, 440], 0.09);
[[3.45, 8], [3.95, 9], [4.45, 10], [5.0, 11], [5.6, 12]].forEach(([t, k], i) => pluck(t, P[k], 0.32, i % 2 ? 0.3 : -0.3, 0.997, i === 4 ? 0.04 : 0));
chime(4.5, 2349.32, 0.035, 0.4);
// 6.2 열두 장: 한 장 놓일 때마다 종이 소리 + 현이 계단을 오르내림
for (let k = 0; k < 12; k++) {
  const t = 6.65 + k * 0.13;
  paper(t - 0.02, 0.14, 0.18, (k % 3 - 1) * 0.4);
  pluck(t, P[[3, 4, 5, 6, 7, 6, 5, 6, 7, 8, 9, 10][k]], 0.22, (k % 3 - 1) * 0.35);
}
// 8.75 빛나는 달 낙관 셋(밝은 나무 소리 + 높은 현) → 9.9 쉼 둘(낮은 나무 소리)
[0, 1, 2].forEach((k) => { tock(8.75 + k * 0.36, 720, 0.5, (k - 1) * 0.3); pluck(8.8 + k * 0.36, P[8 + k * 2], 0.3, (k - 1) * 0.3, 0.997, 0.03); });
[0, 1].forEach((k) => tock(9.9 + k * 0.22, 380, 0.35, k ? 0.3 : -0.3));
// 10.4 일곱 낙관: 도장마다 나무 소리, 음이 한 칸씩
paper(10.15, 0.3, 0.25, 0);
for (let k = 0; k < 7; k++) { tock(10.95 + k * 0.17, 520 + k * 40, 0.32, (k - 3) / 4); pluck(10.97 + k * 0.17, P[5 + k], 0.2, (k - 3) / 4); }
// 12.6 연하장: 현 아르페지오가 내려와 화음으로 + 풍경
chime(12.6, 1567.98, 0.05, -0.3); chime(12.9, 2093, 0.04, 0.3);
[10, 9, 8, 7, 5].forEach((k, i) => pluck(12.75 + i * 0.11, P[k], 0.36, (i - 2) * 0.2, 0.997));
pluck(13.4, P[0], 0.5, 0, 0.998, 0.03); pluck(13.42, P[3], 0.4, -0.2, 0.998); pluck(13.44, P[5], 0.4, 0.2, 0.998);
tock(13.92, 700, 0.42, 0); // 「처음 고르는 두 방은 무료」 도장
chime(14.3, 2637, 0.03, -0.4);

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
