// 방 소개 릴스 7편 소리판 (2026-10-26). 외부 음원 없이 사인파·노이즈·간단한 잔향만으로 계산(방마다 씨앗 고정).
// 실행(저장소 루트): node marketing/strange-oracle/render/sound-reel.js <방|all> → ../out/reel-<방>-ko-sound.mp4 (영상은 reel-<방>-ko.mp4 그대로 복사)
// 소리만 미리 듣기: ... sound-reel.js <방> --wav <폴더> → <폴더>/reel-<방>.wav (영상 없이)
// 시점은 scenes/reel/reel.js 시간표와 같다: 0 첫 일격 · 2.4 둘째 일격 · 4.8 방 이름 · 7.2/10.6/14.0/17.2 이야기 · 20.4 다른 방 · 22.8 끝 (25초)
// 방마다 소리 결: 만신 장구·징·방울 / 오검 숲바람·하프 / 베다 탄푸라 드론·작은 북 / 데칸 사막바람·시스트럼 / 촐킨 나무북·흔들개 / 룬 바닷바람·큰 북·돌 / 시빌라 동굴 물방울·합창
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
const arg = process.argv[2];
if (!ROOMS.includes(arg) && arg !== "all") throw new Error(ROOMS.join(" | ") + " | all");
const WAVDIR = process.argv.includes("--wav") ? process.argv[process.argv.indexOf("--wav") + 1] : null;
const OUT = path.resolve(__dirname, "..", "out");
const SR = 48000, DUR = 25, N = SR * DUR;
const T = { hook0: 0, hook1: 2.4, title: 4.8, say: [7.2, 10.6, 14.0, 17.2], bridge: 20.4, end: 22.8 };

function make(room) {
  const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N);
  let seed = 20261026 + ROOMS.indexOf(room) * 7919;
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
  function bell(t0, f, amp, decay, pan = 0, parts = [[1, 1], [2.01, 0.45], [2.76, 0.25], [5.4, 0.08]], send = 0.5) {
    for (let i = 0; i < decay * 6 * SR; i++) {
      const t = i / SR;
      let v = 0;
      for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t * (m - 1) * 0.8);
      put(S(t0) + i, v * amp * Math.min(1, t / 0.004) * Math.exp(-t / decay), pan, send);
    }
  }
  // 징: 낮은 비화성 배음이 천천히 부풀었다 사라진다
  function gong(t0, f, amp, decay = 3) {
    const parts = [[1, 1], [1.48, 0.6], [2.13, 0.4], [2.9, 0.25], [4.1, 0.12]];
    for (let i = 0; i < decay * 3 * SR; i++) {
      const t = i / SR;
      let v = 0;
      parts.forEach(([m, a], k) => (v += a * Math.sin(2 * Math.PI * f * m * t * (1 + 0.004 * Math.exp(-t * 2) * k))));
      put(S(t0) + i, v * amp * Math.min(1, t / 0.03) * Math.exp(-t / decay), 0, 0.6);
    }
  }
  // 줄을 튕긴 소리(카플러스-스트롱)
  function pluck(t0, f, amp, pan = 0, decay = 0.996) {
    const d = Math.max(2, Math.round(SR / f)), buf = new Float32Array(d);
    for (let k = 0; k < d; k++) buf[k] = rnd();
    let idx = 0;
    for (let i = 0; i < SR * 2.5; i++) {
      const y = buf[idx], nx = buf[(idx + 1) % d];
      buf[idx] = (y + nx) * 0.5 * decay; idx = (idx + 1) % d;
      put(S(t0) + i, y * amp, pan, 0.45);
    }
  }
  // 나무·돌 두드림: 짧은 사인 + 딸깍
  function wood(t0, f, amp, pan = 0, decay = 0.06) {
    for (let i = 0; i < decay * 6 * SR; i++) {
      const t = i / SR;
      put(S(t0) + i, (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.7 * t) * Math.exp(-t * 60)) * amp * Math.exp(-t / decay), pan, 0.3);
    }
  }
  // 방울·시스트럼·흔들개: 높은 노이즈 알갱이 여러 개
  function rattle(t0, dur, amp, n = 10, pan = 0, f = 4000) {
    for (let k = 0; k < n; k++) {
      const t = t0 + (k / n) * dur + Math.abs(rnd()) * 0.01;
      bell(t, f * (1 + rnd() * 0.15), amp * 0.35, 0.05, pan + rnd() * 0.3, [[1, 1], [1.73, 0.6], [2.6, 0.3]], 0.25);
      noise(t, 0.03, amp * 0.5, 0.95, pan, 0.15);
    }
  }
  // 바람·파도: 천천히 흔들리는 거른 노이즈
  function wind(amp, rate = 0.13, bright = 0.03, from = 0, to = DUR) {
    let lp = 0, lp2 = 0;
    for (let i = S(from); i < S(to); i++) {
      const t = i / SR, k = bright * (1 + 0.8 * Math.sin(2 * Math.PI * rate * t));
      lp += k * (rnd() - lp); lp2 += k * (lp - lp2);
      const e = Math.min(1, (t - from) / 1.5) * Math.min(1, (to - t) / 1.2);
      put(i, lp2 * amp * 6 * e * (0.6 + 0.4 * Math.sin(2 * Math.PI * rate * 0.7 * t + 1)), 0.4 * Math.sin(2 * Math.PI * 0.05 * t), 0.2);
    }
  }
  // 바탕 패드(방 음계). bright: 배음 수, open: 방 이름에서 넓어짐, 끝 화면에서 밝아짐
  function pad(notes, amp = 0.06, vowel = false) {
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const e = Math.min(1, t / 1.5) * Math.min(1, (DUR - t) / 1.4) * (0.4 + 0.4 * smooth(T.title, T.title + 2, t) + 0.2 * smooth(T.end, T.end + 1, t));
      let v = 0;
      notes.forEach((f, k) => {
        const ph = 2 * Math.PI * f * t + Math.sin(2 * Math.PI * 0.17 * (k + 1) * t) * 0.6;
        v += (Math.sin(ph) + (vowel ? 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph) + 0.18 * Math.sin(5 * ph) : 0)) / (k + 1.6);
      });
      lp += 0.01 * (rnd() - lp);
      put(i, (v * amp + lp * 0.25) * e, 0.12 * Math.sin(2 * Math.PI * 0.1 * t), 0.25);
    }
  }
  // 드론(탄푸라처럼 배음이 넘실댐)
  function drone(f, amp, harmonics = 8) {
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const e = Math.min(1, t / 2) * Math.min(1, (DUR - t) / 1.4);
      let v = 0;
      for (let h = 1; h <= harmonics; h++) v += Math.sin(2 * Math.PI * f * h * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * (0.23 + h * 0.07) * t + h)) / h;
      put(i, v * amp * e, 0, 0.2);
    }
  }
  // 공통 뼈대: 일격마다 북+바람, 이야기마다 방 소리 한 번, 다른 방에서 일곱 음, 끝에서 화음
  const ending = (root) => {
    whoosh(T.end - 0.9, 0.9, 0.45);
    kick(T.end, 100, 38, 1.2, 0.7, 0.6);
    [1, 1.5, 2, 3].forEach((m, k) => bell(T.end + k * 0.02, root * m, 0.22 / (k + 1), 2.4, (k - 1.5) / 3));
  };
  const sevens = (scale) => scale.forEach((f, k) => bell(T.bridge + 0.15 + k * 0.17, f, 0.12, 0.8, (k - 3) / 4));

  if (room === "saju") {
    // 무당 굿판: 장구 덩·덕, 징, 방울. 박자가 몰아친다
    const root = 146.83; // D
    pad([73.42, 110, 146.83, 174.61, 220], 0.05);
    const deong = (t, a = 1) => { kick(t, 150, 55, 0.5, 0.9 * a); noise(t, 0.05, 0.4 * a, 0.6, -0.3, 0.3); };
    const deok = (t, a = 1) => { wood(t, 420, 0.35 * a, 0.35, 0.04); noise(t, 0.04, 0.35 * a, 0.95, 0.4, 0.2); };
    // 첫 일격·둘째 일격: 덩! 징!
    deong(0.02, 1.2); rattle(0.02, 0.35, 0.45, 12, 0.2); gong(0.05, root / 2, 0.5, 2.4);
    whoosh(T.hook1 - 0.5, 0.5, 0.5); deong(T.hook1, 1.3); deok(T.hook1 + 0.12); rattle(T.hook1, 0.3, 0.5, 10, -0.2);
    // 방 이름: 징 크게 + 장구 굴림
    whoosh(T.title - 0.6, 0.6, 0.6);
    gong(T.title, root / 2, 0.8, 3.2); deong(T.title, 1.4); rattle(T.title, 0.6, 0.55, 18);
    // 이야기 내내 굿거리 장단(덩 기덕 쿵 더러러러 쿵 기덕 쿵 더러러러)을 빠르게
    for (let bar = 0; bar < 6; bar++) {
      const b = T.say[0] + bar * 2.2;
      if (b > T.bridge - 0.4) break;
      deong(b, 0.55); deok(b + 0.55, 0.5); deok(b + 0.7, 0.4); kick(b + 1.1, 120, 60, 0.3, 0.35);
      for (let k = 0; k < 4; k++) deok(b + 1.45 + k * 0.07, 0.25);
      deok(b + 1.85, 0.45);
    }
    T.say.forEach((t, k) => { deong(t, 1.1); rattle(t, 0.3, 0.38, 9, k % 2 ? 0.3 : -0.3); bell(t + 0.02, [587.33, 659.25, 880, 1174.66][k], 0.12, 0.7); });
    gong(T.say[3], root / 2, 0.45, 2.2);
    whoosh(T.bridge - 0.5, 0.5, 0.5); deong(T.bridge, 1.2); rattle(T.bridge, 0.5, 0.45, 14);
    sevens([293.66, 349.23, 392, 440, 523.25, 587.33, 698.46]);
    ending(root); gong(T.end, root / 2, 0.5, 2.6);
  } else if (room === "ogham") {
    // 숲: 바람과 새 소리 없이 나뭇잎 바람 + 하프 튕김(켈트 도리안)
    const sc = [196, 220, 233.08, 261.63, 293.66, 329.63, 349.23, 392, 440, 523.25];
    pad([98, 146.83, 196, 246.94, 293.66], 0.05);
    wind(0.35, 0.09, 0.04);
    kick(0.02, 90, 40, 0.9, 0.7); pluck(0.02, 196, 0.5); pluck(0.18, 293.66, 0.35, 0.3);
    whoosh(T.hook1 - 0.5, 0.5, 0.35); kick(T.hook1, 90, 40, 0.8, 0.6); wood(T.hook1, 300, 0.5); wood(T.hook1 + 0.16, 360, 0.35, 0.3); // 돌에 새기는 소리
    whoosh(T.title - 0.6, 0.6, 0.45); kick(T.title, 100, 38, 1.2, 0.8, 0.5);
    [196, 293.66, 392, 493.88, 587.33].forEach((f, k) => pluck(T.title + k * 0.09, f, 0.3, (k - 2) / 3));
    T.say.forEach((t, k) => {
      for (let j = 0; j < 4; j++) pluck(t + j * 0.13, sc[(k * 2 + j * 2) % sc.length], 0.22, (j - 1.5) / 3);
      for (let j = 0; j < 3; j++) wood(t + 1.4 + j * 0.12, 520 - j * 40, 0.12, 0.4); // 획 긋는 소리
    });
    whoosh(T.bridge - 0.5, 0.6, 0.4, 0, false); kick(T.bridge, 90, 40, 0.8, 0.5);
    sevens([392, 440, 493.88, 587.33, 659.25, 783.99, 880]);
    ending(196); pluck(T.end, 98, 0.4); pluck(T.end + 0.12, 146.83, 0.3);
  } else if (room === "star") {
    // 인도 밤하늘: 탄푸라 드론(사·파), 작은 북 똑딱, 숫자 셀 때 맑은 종
    drone(130.81, 0.035); drone(196, 0.02, 6);
    pad([130.81, 196, 261.63], 0.03);
    kick(0.02, 110, 45, 0.8, 0.6); bell(0.02, 1046.5, 0.12, 1.2);
    whoosh(T.hook1 - 0.5, 0.5, 0.35); kick(T.hook1, 110, 45, 0.6, 0.5);
    [0, 0.35, 0.7].forEach((d, k) => bell(T.hook1 + 0.4 + d, [783.99, 880, 1046.5][k], 0.13, 0.7, (k - 1) / 2)); // 하나, 둘, 셋
    whoosh(T.title - 0.6, 0.6, 0.45); kick(T.title, 100, 38, 1.2, 0.8, 0.5); bell(T.title, 523.25, 0.22, 2.2); bell(T.title + 0.03, 783.99, 0.14, 2);
    // 타블라 느낌: 높은 '나'(울림) + 낮은 '게'(미끄러짐)
    const na = (t, a = 1) => bell(t, 600, 0.12 * a, 0.18, 0.2, [[1, 1], [2.3, 0.4], [3.1, 0.2]], 0.2);
    const ge = (t, a = 1) => kick(t, 140, 80, 0.35, 0.35 * a, 0.1);
    for (let t = T.say[0]; t < T.bridge - 0.3; t += 0.85) { ge(t); na(t + 0.21, 0.7); na(t + 0.42, 0.5); ge(t + 0.64, 0.6); }
    T.say.forEach((t, k) => bell(t, [659.25, 783.99, 880, 1046.5][k], 0.16, 1.1, k % 2 ? 0.3 : -0.3));
    whoosh(T.bridge - 0.5, 0.5, 0.4); kick(T.bridge, 100, 40, 0.8, 0.5);
    sevens([523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77]);
    ending(130.81);
  } else if (room === "decan") {
    // 이집트 밤: 사막 바람, 낮은 드론, 시스트럼 짤랑, 별시계 똑딱
    wind(0.3, 0.07, 0.025);
    drone(73.42, 0.03, 5);
    pad([73.42, 110, 146.83, 155.56, 220], 0.045); // D 프리지안 빛
    kick(0.02, 100, 38, 1.1, 0.8); rattle(0.05, 0.4, 0.35, 10, 0, 5200);
    whoosh(T.hook1 - 0.6, 0.6, 0.45); kick(T.hook1, 110, 36, 1.2, 0.9, 0.5); gong(T.hook1, 73.42, 0.35, 2.5); // 4천 년 전
    whoosh(T.title - 0.6, 0.6, 0.5); kick(T.title, 100, 38, 1.2, 0.8, 0.5); rattle(T.title, 0.8, 0.45, 16, 0, 5200);
    bell(T.title, 293.66, 0.2, 2.2); bell(T.title + 0.03, 440, 0.14, 2);
    for (let t = T.say[0]; t < T.bridge - 0.3; t += 0.5) wood(t, 1500, 0.06, 0.3, 0.02); // 별시계 바늘
    T.say.forEach((t, k) => { rattle(t, 0.45, 0.3, 9, k % 2 ? 0.3 : -0.3, 5200); bell(t, [293.66, 311.13, 369.99, 440][k], 0.15, 1.2); });
    whoosh(T.bridge - 0.5, 0.5, 0.4); kick(T.bridge, 100, 40, 0.8, 0.5);
    sevens([293.66, 311.13, 369.99, 392, 440, 466.16, 587.33]);
    ending(146.83);
  } else if (room === "tzolkin") {
    // 마야 밀림 돌 제단: 나무북(테포나스틀리) 두 음, 흔들개, 두 바퀴 맞물리는 딸깍
    pad([87.31, 130.81, 174.61, 220, 261.63], 0.045);
    wind(0.18, 0.11, 0.05);
    const teponaztli = (t, hi, a = 1) => wood(t, hi ? 330 : 220, 0.45 * a, hi ? 0.25 : -0.25, 0.12);
    kick(0.02, 100, 40, 0.9, 0.7); teponaztli(0.02, 0); teponaztli(0.2, 1);
    whoosh(T.hook1 - 0.5, 0.5, 0.4); kick(T.hook1, 100, 40, 0.8, 0.7);
    for (let k = 0; k < 8; k++) wood(T.hook1 + 0.3 + k * 0.17, k % 2 ? 900 : 700, 0.12, k % 2 ? 0.4 : -0.4, 0.03); // 톱니 맞물림
    whoosh(T.title - 0.6, 0.6, 0.45); kick(T.title, 100, 38, 1.2, 0.8, 0.5); teponaztli(T.title, 0, 1.3); teponaztli(T.title + 0.15, 1, 1.1);
    bell(T.title, 349.23, 0.18, 2); bell(T.title + 0.03, 523.25, 0.12, 1.8);
    for (let t = T.say[0], k = 0; t < T.bridge - 0.3; t += 0.6, k++) { teponaztli(t, k % 3 === 2, 0.45); if (k % 2) rattle(t + 0.3, 0.2, 0.12, 5, 0.3, 3200); }
    T.say.forEach((t, k) => { teponaztli(t, 0, 0.9); teponaztli(t + 0.15, 1, 0.8); bell(t + 0.02, [523.25, 587.33, 698.46, 783.99][k], 0.13, 1); });
    whoosh(T.bridge - 0.5, 0.5, 0.4); kick(T.bridge, 100, 40, 0.8, 0.5);
    sevens([349.23, 392, 440, 523.25, 587.33, 698.46, 783.99]);
    ending(174.61);
  } else if (room === "rune") {
    // 북해 바닷가: 파도 바람, 큰 북, 돌 부딪히는 소리. 말수 적게
    wind(0.45, 0.06, 0.02);
    pad([55, 82.41, 110, 130.81, 164.81], 0.045);
    const stone = (t, a = 1, pan = 0) => { wood(t, 180, 0.5 * a, pan, 0.05); noise(t, 0.06, 0.4 * a, 0.7, pan, 0.4); };
    kick(0.02, 80, 32, 1.4, 1.0, 0.6); [0.6, 0.95, 1.3].forEach((d, k) => stone(d, 0.9, (k - 1) * 0.5)); // 돌 세 개
    whoosh(T.hook1 - 0.5, 0.5, 0.4); [0, 0.55, 1.1].forEach((d, k) => kick(T.hook1 + d, 85, 32, 0.9, 0.55 + k * 0.2, 0.5)); // 지나온 길. 지금. 다가올 것.
    whoosh(T.title - 0.6, 0.6, 0.55); kick(T.title, 75, 30, 1.6, 1.0, 0.6); gong(T.title, 55, 0.4, 2.6);
    for (let t = T.say[0]; t < T.bridge - 0.3; t += 1.1) { kick(t, 70, 34, 0.7, 0.45, 0.5); kick(t + 0.55, 70, 34, 0.5, 0.25, 0.4); }
    T.say.forEach((t, k) => bell(t, [220, 246.94, 261.63, 329.63][k], 0.13, 1.3, 0, [[1, 1], [2.4, 0.3], [3.9, 0.1]]));
    [0, 0.4, 0.8].forEach((d, k) => stone(T.say[2] + 0.2 + d, 0.8, (k - 1) * 0.5)); // 세 개를 뽑는다
    stone(T.say[3] + 0.3, 0.7, -0.4); stone(T.say[3] + 1.2, 0.8, 0.4);
    whoosh(T.bridge - 0.5, 0.5, 0.45); kick(T.bridge, 80, 34, 0.9, 0.6);
    sevens([220, 246.94, 261.63, 293.66, 329.63, 392, 440]);
    ending(110);
  } else if (room === "sibyl") {
    // 쿠마이 동굴: 물방울, 촛불 숨, 합창 같은 모음 패드, 두루마리 펼침
    pad([110, 164.81, 220, 261.63, 329.63], 0.04, true);
    wind(0.15, 0.05, 0.015);
    const drip = (t, f, a = 1) => { for (let i = 0; i < 0.12 * SR; i++) { const u = i / SR, ff = f * (1 + 2.5 * u * 8); put(S(t) + i, Math.sin(2 * Math.PI * ff * u) * Math.exp(-u * 40) * 0.25 * a, rnd() * 0.5, 0.9); } };
    for (let k = 0; k < 14; k++) drip(Math.abs(rnd()) * 24 + 0.5, 900 + Math.abs(rnd()) * 900, 0.6);
    kick(0.02, 90, 36, 1.2, 0.8, 0.6); bell(0.05, 220, 0.18, 2.4);
    whoosh(T.hook1 - 0.6, 0.6, 0.4); kick(T.hook1, 90, 36, 1, 0.7, 0.6); bell(T.hook1, 261.63, 0.15, 2.2);
    whoosh(T.title - 0.7, 0.7, 0.5); kick(T.title, 85, 34, 1.4, 0.85, 0.7); gong(T.title, 110, 0.3, 3);
    bell(T.title + 0.05, 659.25, 0.14, 2.4, 0.2);
    T.say.forEach((t, k) => bell(t, [440, 493.88, 523.25, 659.25][k], 0.13, 1.6, k % 2 ? 0.3 : -0.3));
    noise(T.say[1] + 1.3, 0.9, 0.18, 0.15, 0.2, 0.4, 0.3, 2); // 두루마리 뽑기
    whoosh(T.say[2] - 0.3, 0.7, 0.35, 0, false); // 두루마리 펼침
    kick(T.say[2] + 0.1, 90, 40, 0.9, 0.5, 0.6); bell(T.say[2] + 0.12, 880, 0.12, 2, 0, undefined, 0.8);
    whoosh(T.bridge - 0.5, 0.5, 0.4); kick(T.bridge, 85, 36, 0.9, 0.5, 0.6);
    sevens([440, 493.88, 523.25, 587.33, 659.25, 783.99, 880]);
    ending(110);
  }

  // 잔향(슈뢰더) → 부드러운 제한 → WAV → 영상에 붙임(-14 LUFS)
  function reverb(inp, combs, aps, fb = 0.8, damp = 0.25) {
    const out = new Float32Array(N);
    combs.forEach((d) => { const buf = new Float32Array(d); let idx = 0, lp = 0; for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * (1 - damp) + lp * damp; buf[idx] = inp[i] + lp * fb; out[i] += y / combs.length; idx = (idx + 1) % d; } });
    aps.forEach((d) => { const buf = new Float32Array(d); let idx = 0; for (let i = 0; i < N; i++) { const b = buf[idx], x = out[i]; buf[idx] = x + b * 0.5; out[i] = b - x * 0.5; idx = (idx + 1) % d; } });
    return out;
  }
  const big = room === "sibyl" || room === "saju" ? 1.25 : 1;
  const RL = reverb(VL, [3114, 3234, 2982, 2844].map((d) => Math.round(d * big)), [225, 556]), RR = reverb(VR, [3160, 3280, 3028, 2890].map((d) => Math.round(d * big)), [248, 579]);
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
  if (WAVDIR) { fs.writeFileSync(path.join(WAVDIR, `reel-${room}.wav`), buf); console.log(`→ ${WAVDIR}/reel-${room}.wav`); return; }
  const VIDEO = `reel-${room}-ko`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so-soundreel-"));
  const wav = path.join(tmp, "a.wav");
  fs.writeFileSync(wav, buf);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(OUT, `${VIDEO}.mp4`), "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), "-movflags", "+faststart", path.join(OUT, `${VIDEO}-sound.mp4`)], { stdio: "inherit" });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) throw new Error("ffmpeg 실패");
  console.log(`→ marketing/strange-oracle/out/${VIDEO}-sound.mp4`);
}

(arg === "all" ? ROOMS : [arg]).forEach(make);
