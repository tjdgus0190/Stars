// 광고 9안 「새해의 문」 소리판 (2026-11-12). 외부 음원 없이 사인파·노이즈·간단한 잔향만으로 계산(씨앗 고정). 7안 소리판의 부품을 그대로 쓰고 새해답게 밝은 장조로.
// 실행(저장소 루트): node marketing/strange-oracle/render/sound-ad9.js → ../out/ad9-newyear-ko-sound.mp4 (영상은 ad9-newyear-ko.mp4 그대로 복사)
// 시점은 scenes/ad9-newyear.js T와 같다: 0.35 질문 · 2.6 일곱 문(3.1부터 0.42초마다 한 문) · 6.4 큰 문 · 6.95 열림 · 7.55 빨려 들어감 · 8.15 새벽빛 · 8.75 열두 달 · 10.3 빛나는 달 · 12.2 끝
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const VIDEO = "ad9-newyear-ko";
const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N);
let seed = 2026111209;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const S = (t) => Math.floor(t * SR);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function put(i, v, pan, send) {
  if (i < 0 || i >= N) return;
  const l = v * (1 - pan) * 0.5, r = v * (1 + pan) * 0.5;
  L[i] += l; R[i] += r;
  if (send) { VL[i] += l * send; VR[i] += r * send; }
}
function kick(t0, f0, f1, dur, amp, send = 0.3) {
  let ph = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t * 18);
    ph += (2 * Math.PI * f) / SR;
    put(S(t0) + i, (Math.sin(ph) + 0.25 * Math.tanh(3 * Math.sin(ph))) * amp * Math.min(1, t / 0.002) * Math.exp(-t / (dur * 0.35)), 0, send);
  }
}
function noise(t0, dur, amp, bright = 0.5, pan = 0, send = 0.3, attack = 0.001, curve = 4) {
  let lp = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    lp += bright * (rnd() - lp);
    put(S(t0) + i, lp * amp * Math.min(1, t / attack) * Math.exp((-t / dur) * curve), pan, send);
  }
}
function whoosh(t0, dur, amp, pan = 0, rise = true) {
  let lp = 0, lp2 = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, u = t / dur, e = rise ? Math.pow(u, 2) * (u < 0.95 ? 1 : (1 - u) / 0.05) : Math.sin(Math.PI * u) ** 1.5;
    const k = 0.02 + 0.45 * (rise ? u * u : Math.sin(Math.PI * u));
    lp += k * (rnd() - lp); lp2 += k * (lp - lp2);
    put(S(t0) + i, (lp - lp2 * 0.6) * amp * e * 3, pan, 0.3);
  }
}
function bell(t0, f, amp, decay, pan = 0) {
  const parts = [[1, 1], [2.01, 0.45], [2.76, 0.25], [5.4, 0.08]];
  for (let i = 0; i < decay * 6 * SR; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * (m - 1) * 0.8);
    put(S(t0) + i, v * amp * Math.min(1, t / 0.004) * Math.exp(-t / decay), pan, 0.5);
  }
}
function glitch(t0, dur, amp) {
  let hold = 0, cnt = 0;
  for (let i = 0; i < dur * SR; i++) {
    if (cnt-- <= 0) { hold = Math.round(rnd() * 3) / 3; cnt = 40 + Math.floor(Math.abs(rnd()) * 400); }
    put(S(t0) + i, hold * amp * (1 - i / (dur * SR)), rnd() * 0.3, 0.1);
  }
}
function shimmer(t0, dur, amp) {
  for (let k = 0; k < 18; k++) bell(t0 + Math.abs(rnd()) * dur * 0.6, 1400 + Math.abs(rnd()) * 2200, amp / 4, 0.4 + Math.abs(rnd()) * 0.5, rnd() * 0.8);
}
// 바탕: D 장조 패드(새벽처럼 아래에서 차오름), 문이 켜지면 넓어지고 끝 화면에서 밝게
function pad(open, endT) {
  const notes = [73.42, 110, 146.83, 185, 220, 293.66];
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 1.2) * Math.min(1, (DUR - t) / 1.0) * (0.45 + 0.4 * smooth(open, open + 2, t) + 0.15 * smooth(endT, endT + 1, t));
    let v = 0;
    notes.forEach((f, k) => (v += Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * 0.18 * (k + 1) * t) * 0.6) / (k + 1.6)));
    lp += 0.01 * (rnd() - lp);
    put(i, (v * 0.06 + lp * 0.3) * e, 0.12 * Math.sin(2 * Math.PI * 0.1 * t), 0.2);
  }
}
// 새벽 장조 오음계 (D E F# A B)
const SC = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51];

pad(2.6, 12.2);
// 0 새벽: 낮게 차오르는 바람 → 0.35 질문 쿵 + 반짝임
whoosh(0.0, 0.45, 0.25, 0, true); kick(0.5, 110, 36, 1.0, 0.75); shimmer(0.5, 0.9, 0.4); bell(0.52, 293.66, 0.14, 1.6);
// 2.6 일곱 문: 휙 → 쿵, 문마다 종이 한 칸씩 올라간다
whoosh(2.2, 0.5, 0.4); kick(2.8, 100, 36, 0.9, 0.6);
for (let k = 0; k < 7; k++) { bell(3.1 + k * 0.42, SC[k] / 2, 0.13, 1.0, (k - 3) / 4); noise(3.1 + k * 0.42, 0.05, 0.08, 0.6, (k - 3) / 4, 0.2); }
// 6.4 큰 문(낮은 종) → 6.95 두 짝이 열림(바람 소리) → 7.55 빨려 들어감(올라가는 휙) → 8.15 새벽빛(부드러운 쿵 + 반짝임)
bell(6.45, 146.83, 0.16, 1.4);
noise(6.95, 0.6, 0.12, 0.15, 0, 0.4, 0.15, 2);
whoosh(7.45, 0.75, 0.6, 0, true);
kick(8.2, 90, 34, 1.3, 0.7, 0.6); shimmer(8.15, 1.3, 0.7); bell(8.2, 587.33, 0.12, 1.8); bell(8.22, 739.99, 0.1, 1.6, 0.2);
// 8.75 열두 달: 쿵 + 칸마다 톡
kick(8.95, 100, 38, 0.9, 0.55);
for (let m = 0; m < 12; m++) noise(9.1 + m * 0.07, 0.02, 0.16, 0.9, m % 2 ? 0.3 : -0.3, 0.1);
// 10.3 빛나는 달: 높은 종 네 번
for (let k = 0; k < 4; k++) bell(10.3 + k * 0.28, SC[k + 2], 0.12, 1.1, k % 2 ? 0.3 : -0.3);
// 12.2 끝: 장조 화음
whoosh(11.7, 0.5, 0.35); kick(12.35, 100, 38, 1.2, 0.65, 0.6); shimmer(12.35, 1.0, 0.55);
bell(12.4, 146.83, 0.28, 2.6); bell(12.4, 220, 0.2, 2.4); bell(12.42, 293.66, 0.16, 2.2, 0.2); bell(12.44, 369.99, 0.12, 2.0, -0.2); bell(13.1, 1174.66, 0.1, 1.6, -0.2);

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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so-sound56-"));
const wav = path.join(tmp, "a.wav");
fs.writeFileSync(wav, buf);
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, `${VIDEO}.mp4`), "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, `${VIDEO}-sound.mp4`)], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg 실패");
console.log(`→ marketing/strange-oracle/out/${VIDEO}-sound.mp4`);
