// 광고 8안 「일곱 문의 점술관」(프로필 유입) 소리판 (2026-10-27). 외부 음원 없이 사인파·노이즈·간단한 잔향만으로 계산(씨앗 고정).
// 실행(저장소 루트): node marketing/strange-oracle/render/sound-ad8.js → ../out/ad8-profile-ko-sound.mp4 (영상은 ad8-profile-ko.mp4 그대로 복사)
// 시점은 scenes/ad8-profile.js T와 같다: 0 일곱 문 · 2.8~6.2 일곱 방이 하나씩(방마다 일격) · 6.2 같은 나를 · 9.4 프로필 격자(칸마다 톡) · 12.8 끝
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const VIDEO = "ad8-profile-ko";
const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N);
let seed = 2026102708;
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
function shimmer(t0, dur, amp) {
  for (let k = 0; k < 18; k++) bell(t0 + Math.abs(rnd()) * dur * 0.6, 1400 + Math.abs(rnd()) * 2200, amp / 4, 0.4 + Math.abs(rnd()) * 0.5, rnd() * 0.8);
}
// 바탕: A 단조 패드, 방 이름이 지나가면 넓어짐 → 끝 화면에서 밝게
function pad(open, endT) {
  const notes = [110, 130.81, 164.81, 220, 261.63, 329.63];
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
const SC = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

pad(2.8, 12.8);
// 0~2.8 일곱 문 불이 켜짐 + 질문
for (let k = 0; k < 7; k++) bell(0.15 + k * 0.16, SC[k] / 2, 0.11, 0.9, (k - 3) / 4);
kick(0.55, 120, 34, 1.0, 0.85); shimmer(0.55, 0.8, 0.4);
// 2.8~6.2 일곱 방: 방마다 짧은 일격 + 그 방 음
const STEP = (6.2 - 2.8) / 7;
whoosh(2.35, 0.45, 0.45);
for (let k = 0; k < 7; k++) { const t = 2.8 + k * STEP; kick(t + 0.03, 110, 45, 0.45, 0.55); bell(t + 0.04, SC[k], 0.14, 0.7, (k - 3) / 4); noise(t, 0.05, 0.25, 0.9, 0, 0.2); }
// 6.2 같은 나를, 일곱 문화가
whoosh(5.8, 0.4, 0.45); kick(6.4, 115, 34, 1.2, 0.85, 0.5); shimmer(6.4, 1.0, 0.55); bell(6.42, 329.63, 0.14, 1.8);
// 9.4 프로필 격자: 칸이 붙을 때마다 톡
whoosh(9.0, 0.45, 0.4); kick(9.55, 100, 40, 0.8, 0.6);
for (let k = 0; k < 6; k++) { const t = 9.75 + k * 0.14; noise(t, 0.03, 0.3, 0.85, (k % 3 - 1) * 0.4, 0.15); bell(t, 1318.5 + k * 110, 0.05, 0.25, (k % 3 - 1) * 0.4); }
for (let k = 0; k < 3; k++) bell(10.8 + k * 0.25, SC[3 + k], 0.1, 0.8, (k - 1) * 0.3);
// 12.8 끝: 화음
whoosh(12.2, 0.6, 0.4); kick(12.95, 100, 38, 1.2, 0.7, 0.6); shimmer(12.95, 1.0, 0.6);
bell(13.0, 110, 0.3, 2.6); bell(13.0, 164.81, 0.22, 2.4); bell(13.02, 220, 0.16, 2.2, 0.2); bell(13.7, 659.25, 0.12, 1.6, -0.2);

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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so-sound8-"));
const wav = path.join(tmp, "a.wav");
fs.writeFileSync(wav, buf);
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, `${VIDEO}.mp4`), "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, `${VIDEO}-sound.mp4`)], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg 실패");
console.log(`→ marketing/strange-oracle/out/${VIDEO}-sound.mp4`);
