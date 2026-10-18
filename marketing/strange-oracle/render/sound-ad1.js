// 광고 1안 「일곱 문」 15초 소리판 — 전부 직접 합성(외부 음원·샘플·음악 파일 없음)
// developer, 2026-10-18. 시점 기준: ../storyboard.md 1안 표 "소리 시점" 칸.
//
// 실행(저장소 루트, ffmpeg 필요, 설치할 패키지 없음):
//   node marketing/strange-oracle/render/sound-ad1.js          # wav + 소리 붙인 mp4
//   node marketing/strange-oracle/render/sound-ad1.js --raw    # 정규화 전 wav만(임시 폴더)
//
// 1) 이 파일이 PCM(48kHz 스테레오, float)을 직접 계산해 임시 폴더에 32-bit float WAV로 쓴다.
// 2) 앞보기 리미터로 피크를 살짝 정리한 뒤 ffmpeg loudnorm 2-pass(linear, -14 LUFS / -1.5 dBTP, ebur128로 재보정)로
//    ../out/ad1-seven-doors-ko.wav(24-bit) 를 만든다.
// 3) ../out/ad1-seven-doors-ko.mp4 의 영상 스트림을 그대로 복사(-c:v copy)하고 AAC 192k 48kHz를 붙여
//    ../out/ad1-seven-doors-ko-sound.mp4 를 만든다. 무음 원본은 건드리지 않는다.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SR = 48000;
const DUR = 15.0;
const N = Math.round(SR * DUR);
const OUT = path.join(__dirname, '..', 'out');
const L = new Float64Array(N);
const R = new Float64Array(N);
// 잔향으로 보내는 버스(종·노크·책장)
const RL = new Float64Array(N);
const RR = new Float64Array(N);

// ── 결정적 난수(같은 결과가 다시 나오게) ──
let seed = 0x5eed1234;
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; }
function noise() { return rnd() * 2 - 1; }

// ── RBJ 바이쿼드 필터 ──
function biquad(type, f0, q) {
  const w = 2 * Math.PI * f0 / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; } // bp (0 dB peak)
  a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
  const k = { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  return function (x) {
    const y = k.b0 * x + k.b1 * k.x1 + k.b2 * k.x2 - k.a1 * k.y1 - k.a2 * k.y2;
    k.x2 = k.x1; k.x1 = x; k.y2 = k.y1; k.y1 = y; return y;
  };
}
// 계수를 매 샘플 바꾸는 상태 변수 필터(스윕용)
function svf() {
  let lo = 0, bp = 0;
  return function (x, f, q) {
    const g = 2 * Math.sin(Math.PI * Math.min(f, SR / 6) / SR);
    const hp = x - lo - bp / q; bp += g * hp; lo += g * bp; return { lo, bp, hp };
  };
}

function idx(t) { return Math.round(t * SR); }
function put(i, l, r, send) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
  if (send) { RL[i] += l * send; RR[i] += r * send; }
}
function panGains(p) { const a = (p + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; } // -1 왼쪽 ~ +1 오른쪽

// ── 1. 바탕 패드: A 도리안(A·E·A·C·D·F#) 사인+약한 삼각파, 느린 LFO, 아주 약한 바람 ──
function padEnv(t) {
  // 0초 페이드 인(1.8초) → 유지 → D(10.0~13.0)에서 부풀었다가 E 직전 정리 → 14.0~15.0 페이드 아웃
  let g = Math.min(1, t / 1.8); g = g * g * (3 - 2 * g);
  let swell = 0;
  if (t >= 10.0 && t < 13.0) {
    const u = (t - 10.0) / 3.0; // 0..1, 0.55 지점이 가장 큼
    swell = u < 0.55 ? Math.sin((u / 0.55) * Math.PI / 2) : Math.cos(((u - 0.55) / 0.45) * Math.PI / 2);
    swell = swell * swell;
  }
  let base = 1 + 0.6 * swell;
  if (t >= 13.0) base = 0.75; // E: 정리된 작은 바탕
  if (t > 12.6 && t < 13.0) base = Math.max(base, 0.75 + 0.25 * (13.0 - t) / 0.4);
  let out = 1;
  if (t > 14.0) { const v = Math.max(0, (15.0 - t) / 1.0); out = v * v; }
  return g * base * out;
}
function renderPad() {
  // [주파수, 크기, 위상속도(LFO Hz), 팬]
  const voices = [
    [110.00, 0.30, 0.071, -0.2], [110.35, 0.22, 0.053, 0.25],  // A2 (좌우 살짝 어긋나 맥놀이)
    [164.81, 0.20, 0.089, 0.15], [220.00, 0.16, 0.061, -0.3],  // E3, A3
    [261.63, 0.10, 0.097, 0.35],                              // C4 (단조 빛깔)
    [293.66, 0.05, 0.043, -0.4], [369.99, 0.035, 0.037, 0.4],  // D4, F#4 (도리안 빛, 아주 옅게)
    [440.00, 0.04, 0.083, 0.0], [659.26, 0.022, 0.067, -0.1],  // A4·E5: 휴대폰 스피커에서도 바탕이 남게
  ];
  const dswell = [ // D 장면에서만 살짝 올라오는 위쪽 음(C5·E5)
    [523.25, 0.03, -0.25], [659.26, 0.025, 0.3],
  ];
  const wind = biquad('bp', 520, 0.7), wind2 = biquad('lp', 1400, 0.7);
  for (let i = 0; i < N; i++) {
    const t = i / SR, e = padEnv(t);
    let l = 0, r = 0;
    for (const [f, a, lfo, p] of voices) {
      const ph = 2 * Math.PI * f * t;
      // 사인 + 약한 3배음(삼각파 맛)
      const s = Math.sin(ph) - Math.sin(3 * ph) / 9 * 0.6;
      const m = 0.75 + 0.25 * Math.sin(2 * Math.PI * lfo * t + f);
      const [gl, gr] = panGains(p);
      l += s * a * m * gl; r += s * a * m * gr;
    }
    if (t >= 10.0 && t < 13.0) {
      const u = (t - 10.0) / 3.0, w = Math.sin(Math.PI * u) ** 2;
      for (const [f, a, p] of dswell) {
        const s = Math.sin(2 * Math.PI * f * t) * a * w * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.5 * t));
        const [gl, gr] = panGains(p); l += s * gl; r += s * gr;
      }
    }
    // 바람: 띠 통과 노이즈, 느리게 오르내림
    const wv = wind2(wind(noise())) * 0.05 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.13 * t));
    l += wv * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.07 * t)); r += wv * (0.8 + 0.2 * Math.cos(2 * Math.PI * 0.09 * t));
    L[i] += l * e * 0.28; R[i] += r * e * 0.28;
  }
}

// ── 2. 노크: 나무문 한 번(저역 사인 피치 내림 + 몸통 공명 + 띠 통과 노이즈 감쇠) ──
function knock(t0, gain, send) {
  const i0 = idx(t0), len = idx(0.45);
  const bpA = biquad('bp', 900, 1.6), bpB = biquad('bp', 2200, 2.0), hp = biquad('hp', 200, 0.7);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const att = Math.min(1, t / 0.0015);
    const thump = Math.sin /* 170→95Hz로 내려가는 몸통 */(2 * Math.PI * (95 * t + 75 * 0.012 * (1 - Math.exp(-t / 0.012)))) * Math.exp(-t / 0.045);
    const wood = Math.sin(2 * Math.PI * 310 * t) * Math.exp(-t / 0.03) * 0.5
               + Math.sin(2 * Math.PI * 640 * t + 1) * Math.exp(-t / 0.018) * 0.35
               + Math.sin(2 * Math.PI * 1170 * t + 2) * Math.exp(-t / 0.010) * 0.2; // 휴대폰 스피커 대역
    const n = noise(), click = (bpA(n) * 1.2 + bpB(n) * 0.6) * Math.exp(-t / 0.012);
    const s = hp((thump * 0.9 + wood + click * 1.4) * att) * gain;
    put(i0 + j, s, s * 0.96, send);
  }
}

// ── 3. 종/싱잉볼: 배음 사인 + 지수 감쇠, 방마다 결이 조금 다르다 ──
function bell(t0, f, opt) {
  const { gain = 0.3, pan = 0, decay = 1.6, partials, send = 0.35, beat = 0.8 } = opt;
  const i0 = idx(t0), len = Math.min(N - i0, idx(decay * 4.5));
  const [gl, gr] = panGains(pan);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const att = Math.min(1, t / 0.003);
    let s = 0;
    for (const [ratio, amp, dk] of partials) {
      const fr = f * ratio;
      if (fr > SR / 2.2) continue;
      // 첫 배음은 아주 느린 맥놀이(싱잉볼처럼)
      const am = ratio === 1 ? 1 + 0.15 * Math.sin(2 * Math.PI * beat * t) : 1;
      s += Math.sin(2 * Math.PI * fr * t + ratio) * amp * Math.exp(-t / (decay * dk)) * am;
    }
    s *= att * gain;
    put(i0 + j, s * gl, s * gr, send);
  }
}

// ── 4. 책장 넘김: 고역 필터 노이즈 스윕 + 종이 떨림 ──
function pageTurn(t0, gain) {
  const i0 = idx(t0), dur = 0.55, len = idx(dur + 0.1);
  const f = svf(), hp = biquad('hp', 900, 0.7);
  for (let j = 0; j < len; j++) {
    const t = j / SR, u = Math.min(1, t / dur);
    // 첫 15ms 안에 바로 들리게(시점 맞춤) → 가운데서 부풂 → 끝에서 빠르게 사라짐
    const env = Math.min(1, t / 0.015) * (0.6 + 0.4 * Math.sin(Math.PI * u)) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.02));
    const flutter = 0.6 + 0.4 * Math.abs(Math.sin(2 * Math.PI * (18 + 30 * u) * t));
    const fc = 1800 + 5200 * u;                               // 1.8k → 7kHz로 쓸어 올림
    const o = f(noise(), fc, 1.4);
    const s = hp(o.bp * 0.9 + o.hp * 0.25) * env * flutter * gain;
    const p = -0.3 + 0.6 * u;                                 // 왼쪽에서 오른쪽으로 넘어감
    const [gl, gr] = panGains(p);
    put(i0 + j, s * gl, s * gr, 0.25);
  }
  // 넘김 끝의 작은 종이 닿는 소리
  const k0 = i0 + idx(dur * 0.92), bp = biquad('bp', 3000, 1.2);
  for (let j = 0; j < idx(0.06); j++) {
    const t = j / SR, s = bp(noise()) * Math.exp(-t / 0.008) * gain * 0.8;
    put(k0 + j, s * 0.8, s, 0.25);
  }
}

// ── 5. 잔향(Schroeder: 빗살 4개 + 올패스 2개, 좌우 다른 길이) ──
function reverb(inp, delays, fb, damp) {
  const out = new Float64Array(N);
  for (const d of delays.combs) {
    const buf = new Float64Array(d); let p = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[p]; lp = y * (1 - damp) + lp * damp;
      buf[p] = inp[i] + lp * fb; p = (p + 1) % d; out[i] += y * 0.25;
    }
  }
  for (const d of delays.aps) {
    const buf = new Float64Array(d); let p = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[p], x = out[i], y = -x * 0.5 + b; buf[p] = x + b * 0.5; p = (p + 1) % d; out[i] = y;
    }
  }
  return out;
}

// ── 이벤트 배치(storyboard 1안 "소리 시점") ──
const EVENTS = [];
function ev(name, t) { EVENTS.push({ name, t, frame: t * 30 }); }

// A: 0.12초 노크 1회
knock(0.12, 0.42, 0.3); ev('A 노크', 0.12);

// B: 1.6 + 0.7k (k=0~6), A 단조 오음계로 차례로 올라감. 방마다 배음비·감쇠를 조금씩 다르게.
const DOOR = [
  // 방, 음, 배음[비, 크기, 감쇠배], 감쇠(초), 팬
  ['Ⅰ 만신(놋 방울)', 440.00, [[1, 1, 1], [2.0, 0.35, 0.6], [3.01, 0.22, 0.4], [4.2, 0.12, 0.25]], 1.3, -0.35],
  ['Ⅱ 오검(나무 결)', 523.25, [[1, 1, 1], [3.0, 0.25, 0.35], [5.0, 0.08, 0.2]], 0.9, -0.12],
  ['Ⅲ 별(유리)',     587.33, [[1, 1, 1], [2.0, 0.2, 0.8], [4.0, 0.12, 0.5], [6.0, 0.05, 0.3]], 1.6, 0.12],
  ['Ⅳ 데칸(싱잉볼)', 659.26, [[1, 1, 1], [2.71, 0.4, 0.55], [5.15, 0.15, 0.3]], 1.8, 0.35],
  ['Ⅴ 촐킨(옥)',     783.99, [[1, 1, 1], [2.32, 0.3, 0.5], [4.25, 0.12, 0.3]], 1.2, -0.25],
  ['Ⅵ 룬(철)',       880.00, [[1, 1, 1], [2.76, 0.35, 0.5], [5.4, 0.18, 0.3], [8.93, 0.06, 0.15]], 1.4, 0.0],
  ['Ⅶ 시빌라(청동)', 1046.50, [[1, 1, 1], [2.0, 0.3, 0.7], [2.76, 0.25, 0.5], [5.4, 0.1, 0.3]], 2.0, 0.25],
];
DOOR.forEach(([name, f, partials, decay, pan], k) => {
  const t = 1.6 + 0.7 * k;
  bell(t, f, { gain: 0.16 - k * 0.008, pan, decay, partials, send: 0.4, beat: 0.6 + 0.1 * k });
  // 한 옥타브 아래 아주 옅은 몸통(종이 가볍게만 들리지 않게)
  bell(t, f / 2, { gain: 0.035, pan, decay: decay * 0.8, partials: [[1, 1, 1]], send: 0.3 });
  ev('B 문 ' + name, t);
});

// C: 6.5 책장 넘김, 7.6~9.1 장마다(0.25초 간격 7번) 작고 맑은 음
pageTurn(6.5, 0.18); ev('C 책장 넘김', 6.5);
const CH = [1318.51, 1567.98, 1760.00, 2093.00, 2349.32, 2637.02, 3135.96]; // E6 G6 A6 C7 D7 E7 G7 (오음계)
CH.forEach((f, k) => {
  const t = 7.6 + 0.25 * k;
  const last = k === 6;
  bell(t, f, { gain: last ? 0.085 : 0.07, pan: -0.3 + 0.1 * k, decay: last ? 1.4 : 0.55,
    partials: [[1, 1, 1], [2.0, 0.15, 0.4], [3.0, 0.05, 0.25]], send: 0.45 });
  if (last) bell(t, 880, { gain: 0.05, pan: 0, decay: 1.8, partials: [[1, 1, 1], [2.0, 0.3, 0.6], [3.0, 0.1, 0.4]], send: 0.5 }); // 9.1 7/7 책 둘레 빛
  ev('C 장 ' + (k + 1) + '/7', t);
});

// D: 10.0~13.0 낮은 패드 부풂(padEnv 안에서) — 이벤트 표에만 적는다
ev('D 패드 부풂 시작', 10.0); ev('D 패드 정리 끝', 13.0);

// E: 14.5 노크 1회로 닫힘 + 여운
knock(14.5, 0.4, 0.45); ev('E 노크(닫힘)', 14.5);
bell(14.5, 220, { gain: 0.05, pan: 0, decay: 0.9, partials: [[1, 1, 1], [2.0, 0.25, 0.5]], send: 0.5 }); // 낮은 여운

renderPad();

// 잔향 더하기
const rvL = reverb(RL, { combs: [1557, 1617, 1491, 1422].map(d => Math.round(d * 2.2)), aps: [225 * 2, 556 * 2] }, 0.8, 0.35);
const rvR = reverb(RR, { combs: [1580, 1640, 1514, 1445].map(d => Math.round(d * 2.2)), aps: [248 * 2, 579 * 2] }, 0.8, 0.35);
for (let i = 0; i < N; i++) { L[i] += rvL[i] * 0.55; R[i] += rvR[i] * 0.55; }

// 끝 마무리: 마지막 30ms는 0으로 닫고, 처음 5ms 페이드 인(딸깍 소리 방지)
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let g = 1;
  if (t > DUR - 0.6) { const v = (DUR - t) / 0.6; g = v * v; }
  if (t < 0.005) g *= t / 0.005;
  L[i] *= g; R[i] *= g;
}
// 저역 정리(30Hz 아래 제거)
const hL = biquad('hp', 30, 0.7), hR = biquad('hp', 30, 0.7);
for (let i = 0; i < N; i++) { L[i] = hL(L[i]); R[i] = hR(R[i]); }
const L0 = Float64Array.from(L), R0 = Float64Array.from(R);

// 앞보기 피크 리미터(5ms 앞보기, 즉시 누르고 120ms에 풀림). 노크·책장 첫머리만 살짝 눌러
// loudnorm이 압축 없이(linear) 한 번의 볼륨만으로 -14 LUFS / -1.5 dBTP에 닿게 한다.
function limit(ceil) {
  const la = idx(0.005), rel = Math.exp(-1 / (SR * 0.12));
  const need = new Float64Array(N);
  for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(L0[i]), Math.abs(R0[i])); need[i] = p > ceil ? ceil / p : 1; }
  // 앞보기: 앞으로 la 샘플 안의 최소 이득
  const want = new Float64Array(N); const q = []; // 단조 덱
  for (let i = N - 1; i >= 0; i--) {
    while (q.length && need[q[q.length - 1]] >= need[i]) q.pop();
    q.push(i); while (q[0] > i + la) q.shift();
    want[i] = need[q[0]];
  }
  let g = 1, gmin = 1, tmin = 0, busy = 0;
  for (let i = 0; i < N; i++) {
    g = want[i] < g ? want[i] : want[i] + (g - want[i]) * rel;
    if (g < gmin) { gmin = g; tmin = i / SR; }
    if (g < 0.989) busy++; // 0.1dB 넘게 누른 샘플
    L[i] = L0[i] * g; R[i] = R0[i] * g;
  }
  limit.info = '최대 ' + (20 * Math.log10(gmin)).toFixed(2) + ' dB(' + tmin.toFixed(2) + '초), 0.1dB 넘게 누른 시간 ' + (busy / SR).toFixed(2) + '초';
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const pre = 0.5 / peak; for (let i = 0; i < N; i++) { L[i] *= pre; R[i] *= pre; }
}

// ── WAV(32-bit float) 쓰기 ──
function writeWavFloat(file) {
  const data = Buffer.alloc(N * 8), h = Buffer.alloc(44);
  for (let i = 0; i < N; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'so-sound-ad1-'));
const raw = path.join(tmp, 'raw.wav');
if (!process.argv.includes('--raw')) process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true })); // 실패해도 임시 파일 지움
const ff = process.env.FFMPEG || 'ffmpeg';
const TARGET = 'I=-14:TP=-1.5:LRA=11';
function measure() { // loudnorm 1차 측정. ffmpeg는 결과를 stderr로 낸다
  const res = spawnSync(ff, ['-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=' + TARGET + ':print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = (res.stderr || '').match(/\{[\s\S]*?"target_offset"[\s\S]*?\}/);
  if (!m) { console.error(res.stderr); throw new Error('loudnorm 1차 측정 실패'); }
  return JSON.parse(m[0]);
}
// 피크-라우드니스 차(TP - I)가 12.3 dB 이하가 될 때까지 리미터 문턱을 낮춘다(최대 6번)
let P0 = 0; for (let i = 0; i < N; i++) P0 = Math.max(P0, Math.abs(L0[i]), Math.abs(R0[i]));
let ceil = P0, j;
for (let tries = 0; ; tries++) {
  limit(ceil); writeWavFloat(raw);
  if (process.argv.includes('--raw')) break;
  j = measure();
  const plr = Number(j.input_tp) - Number(j.input_i);
  console.log('측정 ' + (tries + 1) + ': I ' + j.input_i + ' TP ' + j.input_tp + ' (차 ' + plr.toFixed(2) + ' dB) / 리미터 ' + limit.info);
  if (plr <= 12.3 || tries >= 5) break;
  ceil *= Math.pow(10, -(plr - 12.3 + 0.2) / 20);
}

console.log('소리 시점(초 / 프레임 30fps):');
for (const e of EVENTS) console.log('  ' + e.t.toFixed(2).padStart(5) + 's  f' + e.frame.toFixed(1).padStart(5) + '  ' + e.name);

if (process.argv.includes('--raw')) { console.log('raw:', raw); process.exit(0); }

// ── loudnorm 2차(linear) ──
// loudnorm의 linear 결과는 이 소리에서 목표보다 약 0.6 LU 크게 나온다. 그래서 2차 결과를 ebur128로 다시 재고,
// 어긋난 만큼 목표 I만 고쳐 2차를 다시 돈다(최대 3번, ±0.2 LU 안이면 멈춤). 압축(dynamic)은 쓰지 않는다.
const wav = path.join(OUT, 'ad1-seven-doors-ko.wav');
function ebur(file) {
  const r = spawnSync(ff, ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const sum = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  return { I: Number((sum.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]), TP: Number((sum.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1]) };
}
let tI = -14;
for (let k = 0; k < 3; k++) {
  const af2 = 'loudnorm=I=' + tI.toFixed(2) + ':TP=-1.5:LRA=11:measured_I=' + j.input_i + ':measured_TP=' + j.input_tp + ':measured_LRA=' + j.input_lra +
    ':measured_thresh=' + j.input_thresh + ':linear=true:print_format=json';
  const r2 = spawnSync(ff, ['-hide_banner', '-nostats', '-y', '-i', raw, '-af', af2, '-ar', String(SR), '-c:a', 'pcm_s24le', wav], { encoding: 'utf8' });
  if (r2.status !== 0) { console.error(r2.stderr); throw new Error('loudnorm 2차 실패'); }
  const m2 = r2.stderr.match(/\{[\s\S]*?"normalization_type"[\s\S]*?\}/);
  const type = m2 ? JSON.parse(m2[0]).normalization_type : '?';
  const e = ebur(wav);
  console.log('loudnorm 2차 ' + (k + 1) + ': 목표 I ' + tI.toFixed(2) + ' → 측정 I ' + e.I + ' LUFS, true peak ' + e.TP + ' dBTP, ' + type);
  if (type !== 'linear') throw new Error('loudnorm이 linear로 돌지 않았다');
  if (Math.abs(e.I + 14) <= 0.2) break;
  tI -= (e.I + 14);
}

// ── 영상 복사 + AAC ──
const vid = path.join(OUT, 'ad1-seven-doors-ko.mp4');
const mp4 = path.join(OUT, 'ad1-seven-doors-ko-sound.mp4');
const r3 = spawnSync(ff, ['-hide_banner', '-y', '-i', vid, '-i', wav, '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', String(SR), '-ac', '2', '-t', String(DUR), '-movflags', '+faststart', mp4], { encoding: 'utf8' });
if (r3.status !== 0) { console.error(r3.stderr); throw new Error('mp4 합치기 실패'); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wav:', wav);
console.log('mp4:', mp4);
