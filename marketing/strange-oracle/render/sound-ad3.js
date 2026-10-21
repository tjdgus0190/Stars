// 광고 3안 「한 권의 책」 소리판 (2026-10-21). 외부 음원 없이 사인파·노이즈만으로 계산한다(난수 씨앗 고정 → 다시 돌려도 같은 소리).
// 실행(저장소 루트): node marketing/strange-oracle/render/sound-ad3.js  → ../out/ad3-book-ko-sound.mp4 (영상은 ad3-book-ko.mp4 그대로 복사)
// 시점은 scenes/ad3-book.css와 맞춘다: 문장 빛 0.6+0.42k초(7음) / 책 표지 4.5 / 도장 5.6 / 책 펼침 7.45 / 목차 줄 8+0.17n / 끝 화면 11.6·12.3
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000;
const DUR = 15;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 20261021;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

// 종소리: 기음 + 비화성 배음, 지수 감쇠. pan -1~1
function bell(t0, f, amp, decay, pan = 0) {
  const parts = [[1, 1], [2.01, 0.45], [2.76, 0.25], [5.4, 0.08]];
  const s0 = Math.floor(t0 * SR);
  const len = Math.min(N - s0, Math.floor(decay * 6 * SR));
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * (m - 1) * 0.8);
    v *= amp * env;
    L[s0 + i] += v * (1 - pan) * 0.5;
    R[s0 + i] += v * (1 + pan) * 0.5;
  }
}
// 바람·책장 소리: 거른 노이즈 덩어리
function swish(t0, dur, amp) {
  const s0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let i = 0; i < dur * SR && s0 + i < N; i++) {
    const t = i / SR;
    const env = Math.sin(Math.PI * Math.min(1, t / dur)) ** 2;
    lp += 0.08 * (rnd() - lp);
    const v = lp * amp * env;
    L[s0 + i] += v * 0.9;
    R[s0 + i] += v * 1.1;
  }
}
// 바탕 패드: A 단조 화음이 천천히 부풀었다 끝에서 밝아진다
function pad() {
  const notes = [110, 164.81, 220, 261.63];
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 2.5) * Math.min(1, (DUR - t) / 1.2) * (0.55 + 0.45 * Math.min(1, Math.max(0, (t - 7) / 5)));
    let v = 0;
    notes.forEach((f, k) => { v += Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * 0.17 * (k + 1) * t) * 0.6) / (k + 1.5); });
    v *= 0.08 * env;
    L[i] += v * (1 + 0.15 * Math.sin(2 * Math.PI * 0.11 * t));
    R[i] += v * (1 - 0.15 * Math.sin(2 * Math.PI * 0.11 * t));
  }
}

pad();
const scale = [440, 493.88, 523.25, 587.33, 659.25, 783.99, 880]; // A 단조 오름(문 7개)
scale.forEach((f, k) => bell(0.6 + k * 0.42, f, 0.22, 0.9, Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 7) * 0.7));
swish(4.1, 0.9, 0.5); // 문장이 모여드는 바람
bell(4.6, 220, 0.3, 1.6); // 책 표지
bell(5.6, 329.63, 0.25, 1.2); // 도장
swish(7.4, 0.7, 0.7); // 책장 넘김
for (let n = 0; n < 14; n++) bell(8.0 + n * 0.17, 1318.5 + (n % 3) * 120, 0.05, 0.25, n % 2 ? 0.3 : -0.3); // 목차 줄
bell(11.65, 220, 0.3, 2.2);
bell(11.65, 329.63, 0.22, 2.2);
bell(12.3, 659.25, 0.2, 2.0);

// 정규화(피크 0.9) → 16비트 WAV
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.9 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
const wav = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "so-sound3-")), "ad3.wav");
fs.writeFileSync(wav, buf);

// 영상은 다시 인코딩하지 않고, 소리는 -14 LUFS 쪽으로 맞춰 AAC 192k
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, "ad3-book-ko.mp4"), "-i", wav,
  "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, "ad3-book-ko-sound.mp4")], { stdio: "inherit" });
fs.rmSync(path.dirname(wav), { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg 실패");
console.log("→ marketing/strange-oracle/out/ad3-book-ko-sound.mp4");
