// 공유 카드 생성기 (모든 제품 공용)
// 결과를 스토리 비율(1080x1920) 이미지로 그리고, 모바일에선 공유 시트, PC에선 다운로드로 내보낸다.
//
// 사용법:
//   <script src="../../common/share-card.js"></script>
//   const canvas = await ShareCard.render({ eyebrow, glyph, title, subtitle, lines, footer, theme, fonts });
//   ShareCard.share(canvas, "result.png", "공유 문구");
// 선택 옵션(2026-09-25 추가, 안 넘기면 예전과 똑같이 그린다): art, stones, progress, lead, titleSize,
//   titleColor, titleGlow, hook, badges, footerY.
// 2026-09-28 추가(역시 선택): bark, sundial, dayGlyph, laurel(그림 블록), parchment(양피지 띠 글자). 자세한 설명은 docs/common.md
// 2026-09-28 6단계 추가(역시 선택): frame:"keepsake"(금선 두 겹 + 모서리 인장), topBadge, pair, keyword, roomGrid, closeLine (유료 소장판 카드)
// 2026-09-30 10단계 추가(역시 선택): footerUrl — footer 아래 서비스 주소 한 줄(표시용 글자). share()의 넷째 인자 url(선택)
// 2026-09-29 9단계 추가(역시 선택): guideSignature: { name, line } — 흐름의 마지막 줄에 안내자 서명 1줄. 안 넘기면 예전과 똑같이 그린다
(function () {
  const W = 1080;
  const H = 1920;

  const DEFAULT_THEME = {
    bgTop: "#0b0a1f",
    bgBottom: "#241640",
    accent: "#e8c872",
    text: "#f3eee2",
    muted: "#a79fc0",
  };

  // 띄어쓰기 단위로 줄을 나눈다. 한 단어가 폭보다 길 때만 글자 단위로 자른다.
  function wrap(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    const fits = (s) => ctx.measureText(s).width <= maxWidth;
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (fits(next)) { line = next; continue; }
      if (line) lines.push(line);
      line = "";
      for (const ch of word) {
        if (!fits(line + ch) && line) { lines.push(line); line = ""; }
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawStars(ctx, seed) {
    let s = seed || 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 140; i++) {
      ctx.globalAlpha = 0.2 + rand() * 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(rand() * W, rand() * H, rand() * 1.8 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 아치(위가 반원인 문) 모양 경로
  function archPath(ctx, x, y, w, h) {
    const r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  // ── 블록 그리기 함수들: (ctx, top, t, fonts) → 블록 높이만큼 그린다
  // 돌 여러 개 가로 배치. stones: [{ path: "SVG path d (viewBox 40x60)", label }]
  function stonesBlock(stones, fonts) {
    const sw = 240, sh = 290, gapX = 40, lift = 20;
    const labelH = stones.some((s) => s.label) ? 70 : 0;
    return {
      height: sh + lift + labelH,
      draw(ctx, top, t) {
        const n = stones.length;
        const x0 = (W - (n * sw + (n - 1) * gapX)) / 2;
        stones.forEach((s, i) => {
          const x = x0 + i * (sw + gapX);
          const y = top + lift - (n === 3 && i === 1 ? lift : 0);
          const g = ctx.createLinearGradient(x, y, x + sw, y + sh);
          g.addColorStop(0, "#5b6477");
          g.addColorStop(1, "#262b38");
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 30;
          ctx.shadowOffsetY = 12;
          roundRect(ctx, x, y, sw, sh, 110);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.restore();
          if (s.path && typeof Path2D === "function") {
            // 룬 획 (viewBox 40x60 → 높이 150px)
            const scale = 150 / 60;
            ctx.save();
            ctx.translate(x + sw / 2 - 20 * scale, y + sh / 2 - 30 * scale);
            ctx.scale(scale, scale);
            ctx.strokeStyle = t.accent;
            ctx.lineWidth = 4.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowColor = t.accent;
            ctx.shadowBlur = 30;
            ctx.stroke(new Path2D(s.path));
            ctx.restore();
          }
          if (s.label) {
            ctx.save();
            ctx.fillStyle = t.muted;
            ctx.font = `500 30px ${fonts.latin}`;
            ctx.textAlign = "center";
            ctx.fillText(s.label, x + sw / 2, top + sh + lift + 50);
            ctx.restore();
          }
        });
      },
    };
  }

  // 아치 진행 행. progress: { done: [true,false,...] 또는 채운 번호 배열(1부터), total, label }
  function progressBlock(p, fonts) {
    const total = p.total || 6;
    const done = Array.isArray(p.done) && typeof p.done[0] === "number"
      ? Array.from({ length: total }, (_, i) => p.done.includes(i + 1))
      : Array.from({ length: total }, (_, i) => Boolean(p.done && p.done[i]));
    const aw = 110, ah = 150, gapX = 24;
    const labelH = p.label ? 110 : 0;
    return {
      height: ah + labelH,
      draw(ctx, top, t) {
        const x0 = (W - (total * aw + (total - 1) * gapX)) / 2;
        for (let i = 0; i < total; i++) {
          const x = x0 + i * (aw + gapX);
          ctx.save();
          archPath(ctx, x, top, aw, ah);
          if (done[i]) {
            ctx.fillStyle = t.accent;
            ctx.shadowColor = t.accent;
            ctx.shadowBlur = 30;
            ctx.fill();
          } else {
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = t.muted;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          ctx.restore();
          ctx.save();
          ctx.textAlign = "center";
          ctx.font = `700 44px ${fonts.latin}`;
          ctx.fillStyle = done[i] ? t.bgTop : t.muted;
          ctx.fillText(String(i + 1), x + aw / 2, top + ah - 34);
          ctx.restore();
        }
        if (p.label) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.font = `700 64px ${fonts.serif}`;
          ctx.fillStyle = t.text;
          ctx.fillText(p.label, W / 2, top + ah + 90);
          ctx.restore();
        }
      },
    };
  }

  // 알약(테두리 둥근 상자) 한 줄
  function badgeBlock(text, fonts, size) {
    const fs = size || 32;
    return {
      height: fs + 44,
      draw(ctx, top, t) {
        ctx.save();
        ctx.font = `500 ${fs}px ${fonts.serif}`;
        const w = Math.min(W - 220, ctx.measureText(text).width + 72);
        const h = fs + 36;
        roundRect(ctx, (W - w) / 2, top, w, h, h / 2);
        ctx.strokeStyle = t.accent;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = t.accent;
        ctx.textAlign = "center";
        ctx.fillText(text, W / 2, top + h / 2 + fs * 0.36);
        ctx.restore();
      },
    };
  }

  // ── (2026-09-28 추가) 그림 블록 4종 + 양피지 띠. 모두 선택 옵션이고, 안 넘기면 그리지 않는다.
  // 그림 아래 라벨(선택): label = 글자, labelColor = "accent"면 강조색(기본 muted). Cinzel 34px
  const LABEL_H = 70;
  function drawLabel(ctx, o, y, t, fonts) {
    if (!o.label) return;
    ctx.save();
    ctx.font = `500 34px ${fonts.latin}`;
    ctx.fillStyle = o.labelColor === "accent" ? t.accent : t.muted;
    ctx.textAlign = "center";
    ctx.fillText(o.label, W / 2, y + 50);
    ctx.restore();
  }
  // 반투명 색 ("#rrggbb" + 알파)
  const alpha = (hex, a) => {
    const n = parseInt(String(hex).replace("#", ""), 16);
    return Number.isNaN(n) ? hex : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // 흰 자작나무 껍질 조각(200x400) + 그 위에 새긴 획. bark: { path: "SVG path d (viewBox 40x80)", label, labelColor, ink }
  function barkBlock(o, fonts) {
    const bw = 200, bh = 400;
    return {
      height: bh + (o.label ? LABEL_H : 0),
      draw(ctx, top, t) {
        const x = (W - bw) / 2;
        ctx.save();
        ctx.shadowColor = alpha(t.accent, 0.45);
        ctx.shadowBlur = 60;
        roundRect(ctx, x, top, bw, bh, 70);
        const g = ctx.createLinearGradient(x, 0, x + bw, 0);
        g.addColorStop(0, "#8a8474");
        g.addColorStop(0.2, "#e4e0d4");
        g.addColorStop(0.5, "#f6f3ea");
        g.addColorStop(0.78, "#e2ddcf");
        g.addColorStop(1, "#827b6a");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        // 껍질눈(가로로 짧은 검은 줄)
        ctx.save();
        ctx.fillStyle = "rgba(40,34,26,0.7)";
        [[0.26, 0.12, 36], [0.7, 0.26, 46], [0.36, 0.42, 26], [0.76, 0.57, 40], [0.22, 0.7, 30], [0.62, 0.84, 50], [0.4, 0.94, 22]].forEach(([fx, fy, w]) => {
          ctx.beginPath();
          ctx.ellipse(x + bw * fx, top + bh * fy, w / 2, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
        if (o.path && typeof Path2D === "function") {
          const s = bh / 80; // viewBox 40x80 → 200x400
          ctx.save();
          ctx.translate(x, top);
          ctx.scale(s, s);
          ctx.strokeStyle = o.ink || "#3a2a1a";
          ctx.lineWidth = 14 / s;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = t.accent;
          ctx.shadowBlur = 24;
          ctx.stroke(new Path2D(o.path));
          ctx.restore();
        }
        drawLabel(ctx, o, top + bh, t, fonts);
      },
    };
  }

  // 해시계(지름 400): 테두리·36칸·12궁 경계·그림자·금빛 집 칸·해. sundial: { index: 0~35, label, labelColor }
  // 칸 n은 위(12시)에서 시계 방향으로 n×10°~n×10+10°
  function sundialBlock(o, fonts) {
    const R = 200;
    return {
      height: 2 * R + (o.label ? LABEL_H : 0),
      draw(ctx, top, t) {
        const cx = W / 2, cy = top + R;
        const rad = (deg) => ((deg - 90) * Math.PI) / 180;
        const at = (deg, r) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
        ctx.save();
        const disc = ctx.createRadialGradient(cx, cy, 20, cx, cy, R);
        disc.addColorStop(0, alpha(t.accent, 0.22));
        disc.addColorStop(1, alpha(t.accent, 0.06));
        ctx.fillStyle = disc;
        ctx.beginPath();
        ctx.arc(cx, cy, R - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 4;
        ctx.stroke();
        // 집 칸
        const home = (((Number(o.index) || 0) % 36) + 36) % 36;
        ctx.beginPath();
        ctx.arc(cx, cy, 186, rad(home * 10), rad(home * 10 + 10));
        ctx.arc(cx, cy, 136, rad(home * 10 + 10), rad(home * 10), true);
        ctx.closePath();
        ctx.fillStyle = alpha(t.accent, 0.75);
        ctx.shadowColor = t.accent;
        ctx.shadowBlur = 30;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 고리 두 개 + 칸 구분선(12궁 경계는 길게)
        ctx.strokeStyle = alpha(t.accent, 0.7);
        ctx.lineWidth = 2;
        [186, 136].forEach((r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); });
        for (let i = 0; i < 36; i++) {
          const long = i % 3 === 0;
          const [x1, y1] = at(i * 10, long ? 112 : 136);
          const [x2, y2] = at(i * 10, long ? 196 : 186);
          ctx.lineWidth = long ? 3 : 1.5;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        // 그림자(가운데 → 집 칸)와 반대편의 해
        const mid = home * 10 + 5;
        const [tx, ty] = at(mid, 176);
        const [lx, ly] = at(mid - 90, 12);
        const [rx, ry] = at(mid + 90, 12);
        ctx.fillStyle = "rgba(10,6,20,0.72)";
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = t.accent; ctx.shadowBlur = 24;
        ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.fill();
        const [sx, sy] = at(mid + 180, 212);
        ctx.fillStyle = t.accent;
        ctx.shadowBlur = 40;
        ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        drawLabel(ctx, o, top + 2 * R, t, fonts);
      },
    };
  }

  // 마야 막대·점 숫자(높이 150) + 문양 이름 카르투슈(340x110). dayGlyph: { number: 1~13, sign: "AJAW", numberColor, label, labelColor }
  function dayGlyphBlock(o, fonts) {
    const nh = 150, cw = 340, ch = 110, gap = 30;
    return {
      height: nh + gap + ch + (o.label ? LABEL_H : 0),
      draw(ctx, top, t) {
        const n = Math.max(1, Math.min(13, Number(o.number) || 1));
        const bars = Math.floor(n / 5), dots = n % 5;
        const barW = 220, barH = 34, dotR = 20, rowGap = 16;
        const rows = (dots ? 1 : 0) + bars;
        const stackH = (dots ? dotR * 2 : 0) + bars * barH + (rows - 1) * rowGap;
        let y = top + nh - stackH;
        const color = o.numberColor || "#ebc573";
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 30;
        if (dots) {
          const step = 56, x0 = W / 2 - ((dots - 1) * step) / 2;
          for (let i = 0; i < dots; i++) { ctx.beginPath(); ctx.arc(x0 + i * step, y + dotR, dotR, 0, Math.PI * 2); ctx.fill(); }
          y += dotR * 2 + rowGap;
        }
        for (let i = 0; i < bars; i++) { roundRect(ctx, (W - barW) / 2, y, barW, barH, barH / 2); ctx.fill(); y += barH + rowGap; }
        ctx.restore();
        const cy = top + nh + gap;
        ctx.save();
        roundRect(ctx, (W - cw) / 2, cy, cw, ch, 36);
        ctx.fillStyle = alpha(t.accent, 0.14);
        ctx.fill();
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.font = `700 56px ${fonts.latin}`;
        ctx.fillStyle = t.text;
        ctx.textAlign = "center";
        ctx.fillText(o.sign || "", W / 2, cy + ch / 2 + 20, cw - 40);
        ctx.restore();
        drawLabel(ctx, o, cy + ch, t, fonts);
      },
    };
  }

  // 월계관(지름 380) + 가운데 로마 숫자(Cinzel 110px, 강조색). laurel: { numeral: "XIV", leafColor, label, labelColor }
  function laurelBlock(o, fonts) {
    const R = 165, size = 380;
    return {
      height: size + (o.label ? LABEL_H : 0),
      draw(ctx, top, t) {
        const cx = W / 2, cy = top + size / 2;
        const leaf = o.leafColor || "#8fb58a";
        ctx.save();
        ctx.strokeStyle = leaf;
        ctx.fillStyle = leaf;
        ctx.lineWidth = 4;
        // 캔버스 각도: 0 = 오른쪽, 90° = 아래. 왼쪽 가지 105°→250°, 오른쪽 가지 75°→-70°
        [[105, 250], [75, -70]].forEach(([a0, a1]) => {
          const r0 = (a0 * Math.PI) / 180, r1 = (a1 * Math.PI) / 180;
          ctx.beginPath();
          ctx.arc(cx, cy, R, r0, r1, a1 < a0);
          ctx.stroke();
          const steps = 8;
          for (let k = 0; k < steps; k++) {
            const a = r0 + ((r1 - r0) * (k + 0.5)) / steps;
            const px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
            const tangent = a + (a1 < a0 ? -Math.PI / 2 : Math.PI / 2);
            [-0.55, 0.55].forEach((side) => {
              ctx.save();
              ctx.translate(px, py);
              ctx.rotate(tangent + side);
              ctx.beginPath();
              ctx.ellipse(0, -18, 9, 22, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            });
          }
        });
        ctx.restore();
        ctx.save();
        ctx.font = `700 110px ${fonts.latin}`;
        ctx.fillStyle = t.accent;
        ctx.shadowColor = t.accent;
        ctx.shadowBlur = 40;
        ctx.textAlign = "center";
        ctx.fillText(o.numeral || "", cx, cy + 38, 2 * R - 60);
        ctx.restore();
        drawLabel(ctx, o, top + size, t, fonts);
      },
    };
  }

  // 양피지 띠(900x300) 위 글자. parchment: { text, color(기본 #4a2a14), size(기본 46), maxLines(기본 4) }
  function parchmentBlock(o, fonts) {
    const pw = 900, ph = 300;
    return {
      height: ph,
      draw(ctx, top) {
        const x = (W - pw) / 2;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        roundRect(ctx, x, top, pw, ph, 18);
        const g = ctx.createLinearGradient(x, 0, x + pw, 0);
        g.addColorStop(0, "#c9b184");
        g.addColorStop(0.08, "#efe2c4");
        g.addColorStop(0.92, "#ecdcba");
        g.addColorStop(1, "#c4a978");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        const size = o.size || 46, lh = Math.round(size * 1.45);
        ctx.save();
        ctx.font = `500 ${size}px ${fonts.serif}`;
        const lines = wrap(ctx, o.text || "", pw - 120).slice(0, o.maxLines || 4);
        ctx.fillStyle = o.color || "#4a2a14";
        ctx.textAlign = "center";
        let y = top + (ph - lines.length * lh) / 2 + lh * 0.72;
        for (const l of lines) { ctx.fillText(l, W / 2, y); y += lh; }
        ctx.restore();
      },
    };
  }

  // ── (2026-09-28 6단계 추가) 유료 소장판(keepsake) 블록. 모두 선택 옵션이고, 안 넘기면 그리지 않는다.
  // 원형 쌍 한 줄: pair: { left, right, mark: "×" } 또는 { text } (상대가 없을 때 한 문장). 56px, 가운데 기호는 강조색 latin 글꼴
  function pairBlock(p, fonts) {
    const size = 56;
    return {
      height: 84,
      draw(ctx, top, t) {
        ctx.save();
        const y = top + 62;
        ctx.font = `500 ${size}px ${fonts.serif}`;
        if (p.text) {
          ctx.fillStyle = t.text;
          ctx.textAlign = "center";
          ctx.fillText(p.text, W / 2, y);
          ctx.restore();
          return;
        }
        ctx.textAlign = "left";
        const mark = ` ${p.mark || "×"} `;
        const wl = ctx.measureText(p.left || "").width;
        const wr = ctx.measureText(p.right || "").width;
        ctx.font = `500 ${size}px ${fonts.latin}`;
        const wm = ctx.measureText(mark).width;
        let x = (W - (wl + wm + wr)) / 2;
        ctx.font = `500 ${size}px ${fonts.serif}`;
        ctx.fillStyle = t.text;
        ctx.fillText(p.left || "", x, y);
        x += wl;
        ctx.font = `500 ${size}px ${fonts.latin}`;
        ctx.fillStyle = t.accent;
        ctx.fillText(mark, x, y);
        x += wm;
        ctx.font = `500 ${size}px ${fonts.serif}`;
        ctx.fillStyle = t.text;
        ctx.fillText(p.right || "", x, y);
        ctx.restore();
      },
    };
  }
  // (9단계) 안내자 서명: "{line}" — {name}. 따옴표·문장은 muted, "— 이름"만 강조색, lineH 48
  // 최대 폭 820px를 넘으면 26px까지 줄인다. 그래도 넘치면 줄이지 않는다(말줄임 금지) — 문장을 줄이도록 문구 담당에게 되돌릴 것
  function signatureBlock(sig, fonts) {
    return {
      height: 64,
      draw(ctx, top, t) {
        ctx.save();
        const quoted = `“${sig.line || ""}”`;
        const dash = "  — ";
        const name = sig.name || "";
        let size = 30;
        ctx.font = `500 ${size}px ${fonts.serif}`;
        let w = ctx.measureText(quoted + dash + name).width;
        if (w > 820) {
          size = 26;
          ctx.font = `500 ${size}px ${fonts.serif}`;
          w = ctx.measureText(quoted + dash + name).width;
        }
        const y = top + 48;
        ctx.textAlign = "left";
        const wq = ctx.measureText(quoted).width;
        const wd = ctx.measureText(dash).width;
        let x = (W - w) / 2;
        ctx.fillStyle = t.muted;
        ctx.fillText(quoted, x, y);
        x += wq;
        ctx.fillText(dash, x, y);
        x += wd;
        ctx.fillStyle = t.accent;
        ctx.fillText(name, x, y);
        ctx.restore();
      },
    };
  }
  // 방 문양 칸(3열, 칸 120px). roomGrid: { cells: [{ path: "SVG 경로 d", vw: 40, vh: 60, fill: false, color: "#rrggbb", done: true }] }
  // done이면 방 색 글리프(획, fill:true면 채움), 아니면 흐린 테두리만
  function roomGridBlock(g) {
    const cell = 120, gapX = 36, gapY = 28, cols = 3;
    const cells = g.cells || [];
    const rows = Math.ceil(cells.length / cols);
    return {
      height: rows * cell + Math.max(0, rows - 1) * gapY,
      draw(ctx, top, t) {
        const left = (W - (cols * cell + (cols - 1) * gapX)) / 2;
        cells.forEach((c, i) => {
          const x = left + (i % cols) * (cell + gapX);
          const y = top + Math.floor(i / cols) * (cell + gapY);
          ctx.save();
          roundRect(ctx, x, y, cell, cell, 18);
          ctx.strokeStyle = c.done ? alpha(c.color || t.accent, 0.8) : alpha(t.muted, 0.35);
          ctx.lineWidth = 2;
          ctx.stroke();
          if (c.done && c.path) {
            const vw = c.vw || 40, vh = c.vh || 40;
            const k = Math.min((cell - 40) / vw, (cell - 40) / vh);
            ctx.translate(x + (cell - vw * k) / 2, y + (cell - vh * k) / 2);
            ctx.scale(k, k);
            const p = new Path2D(c.path);
            ctx.shadowColor = c.color || t.accent;
            ctx.shadowBlur = 18;
            if (c.fill) {
              ctx.fillStyle = c.color || t.accent;
              ctx.fill(p);
            } else {
              ctx.strokeStyle = c.color || t.accent;
              ctx.lineWidth = 6 / k;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.stroke(p);
            }
          }
          ctx.restore();
        });
      },
    };
  }
  // 최대 maxLines줄, 넘으면 마지막 줄 말줄임
  function clampLines(ctx, text, width, maxLines) {
    const lines = wrap(ctx, text, width);
    if (lines.length <= maxLines) return lines;
    const out = lines.slice(0, maxLines);
    let last = out[maxLines - 1];
    while (last && ctx.measureText(last + "…").width > width) last = last.slice(0, -1);
    out[maxLines - 1] = last + "…";
    return out;
  }
  // 소장판 틀: 기존 이중 테두리 안쪽에 금선 두 겹 + 네 모서리 밀랍 인장(지름 72px, 갈라진 모습)
  function keepsakeFrame(ctx, t) {
    ctx.save();
    ctx.strokeStyle = t.accent;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, W - 160, H - 160);
    ctx.strokeRect(90, 90, W - 180, H - 180);
    ctx.globalAlpha = 1;
    const wax = t.wax || "#7c2a22";
    const rim = t.waxRim || "#9a3a2c";
    for (const [cx, cy] of [[85, 85], [W - 85, 85], [85, H - 85], [W - 85, H - 85]]) {
      const r = 36;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const rr = r * (k % 2 ? 0.9 : 1);
        if (k) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(rr, 0);
      }
      ctx.closePath();
      ctx.fillStyle = wax;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
        const rr = k % 2 ? r * 0.16 : r * 0.44;
        if (k) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = t.accent;
      ctx.fill();
      // 갈라진 금
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r);
      ctx.lineTo(r * 0.08, -r * 0.3);
      ctx.lineTo(-r * 0.1, r * 0.2);
      ctx.lineTo(r * 0.15, r);
      ctx.strokeStyle = t.bgTop;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  async function render(opts) {
    const t = Object.assign({}, DEFAULT_THEME, opts.theme);
    const serif = opts.fonts?.serif || "serif";
    const glyphFont = opts.fonts?.glyph || serif;
    const fonts = { serif, glyph: glyphFont, latin: opts.fonts?.latin || serif };
    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, t.bgTop);
    bg.addColorStop(1, t.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    drawStars(ctx, opts.seed);

    // 테두리 장식
    ctx.strokeStyle = t.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeRect(60, 60, W - 120, H - 120);
    ctx.globalAlpha = 1;
    if (opts.frame === "keepsake") keepsakeFrame(ctx, t);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // 먼저 줄 목록과 높이를 계산한 뒤, 본문 전체를 안전 영역 가운데에 놓는다.
    // 스토리 화면 위아래(약 250px)는 인스타그램 UI에 가려진다.
    // footerY를 넘기면 아래 안전선을 그 위로 올린다(제품 이름이 본문과 겹치지 않게).
    const SAFE_TOP = 260;
    // (10단계) footerUrl: footer 아래 주소 한 줄. 44자를 넘으면 24px, 그래도 가로 900px를 넘으면 그리지 않는다(이때 footer 자리도 그대로).
    // 그릴 때는 footer 줄을 40px 올려 주소 줄 아래 끝이 원래 footer 자리(안전 영역)를 넘지 않게 한다
    const sans = opts.fonts?.sans || "system-ui, -apple-system, 'Segoe UI', sans-serif";
    let urlLine = null;
    if (opts.footer && opts.footerUrl) {
      const text = String(opts.footerUrl);
      const size = [...text].length > 44 ? 24 : 28;
      ctx.save();
      ctx.font = `400 ${size}px ${sans}`;
      try { ctx.letterSpacing = "0.02em"; } catch (e) { /* 지원하지 않는 브라우저 */ }
      if (ctx.measureText(text).width <= 900) urlLine = { text, size };
      ctx.restore();
    }
    const SAFE_BOTTOM = (opts.footerY ? Math.min(H - 320, opts.footerY - 90) : H - 320) - (urlLine ? 40 : 0);
    const rows = []; // { text, font, color, lineH, glow } | { gap } | { block }
    const add = (text, font, color, lineH, glow) => rows.push({ text, font, color, lineH, glow });
    const gap = (h) => rows.push({ gap: h });
    const block = (b) => rows.push({ block: b });

    if (opts.eyebrow) { add(opts.eyebrow, `500 38px ${serif}`, t.muted, 60); gap(30); }
    if (opts.glyph) {
      const big = opts.glyph.length <= 3;
      add(opts.glyph, `${big ? 260 : 150}px ${glyphFont}`, t.accent, big ? 280 : 180, true);
      gap(50);
    }
    // 제품이 직접 그리는 그림: { height, draw(ctx, { x: 가운데, y: 위, w: 폭, theme }) }
    if (opts.art) {
      block({ height: opts.art.height, draw: (c, top, th) => opts.art.draw(c, { x: W / 2, y: top, w: W, theme: th }) });
      gap(40);
    }
    // (2026-09-28) 방별 그림 블록. 여러 개를 넘기면 이 순서대로 쌓인다
    if (opts.bark) { block(barkBlock(opts.bark, fonts)); gap(40); }
    if (opts.sundial) { block(sundialBlock(opts.sundial, fonts)); gap(40); }
    if (opts.dayGlyph) { block(dayGlyphBlock(opts.dayGlyph, fonts)); gap(40); }
    if (opts.laurel) { block(laurelBlock(opts.laurel, fonts)); gap(40); }
    if (opts.stones?.length) { block(stonesBlock(opts.stones, fonts)); gap(50); }
    if (opts.progress) { block(progressBlock(opts.progress, fonts)); gap(60); }
    if (opts.lead) { add(opts.lead, `500 40px ${serif}`, t.muted, 64); gap(20); }
    if (opts.topBadge) { block(badgeBlock(opts.topBadge, fonts)); gap(40); }

    const titleSize = opts.titleSize || 92;
    ctx.font = `700 ${titleSize}px ${serif}`;
    const titleColor = opts.titleColor === "accent" ? t.accent : t.text;
    for (const l of wrap(ctx, opts.title || "", W - 220)) add(l, ctx.font, titleColor, Math.round(titleSize * 1.26), opts.titleGlow);
    if (opts.subtitle) {
      gap(10);
      ctx.font = `500 50px ${serif}`;
      for (const l of wrap(ctx, opts.subtitle, W - 220)) add(l, ctx.font, t.accent, 70);
    }
    // (6단계 소장판) 쌍 → 키워드 한 줄 → 방 문양 칸 → 닫는 한 문장. 모두 선택
    if (opts.pair) { gap(24); block(pairBlock(opts.pair, fonts)); }
    if (opts.keyword) {
      gap(20);
      ctx.font = `500 40px ${serif}`;
      for (const l of clampLines(ctx, opts.keyword, W - 260, 1)) add(l, ctx.font, t.accent, 60);
    }
    if (opts.roomGrid) { gap(60); block(roomGridBlock(opts.roomGrid)); gap(20); }
    if (opts.closeLine) {
      const size = opts.closeLine.size || 44;
      gap(40);
      ctx.font = `500 ${size}px ${serif}`;
      const col = opts.closeLine.color === "accent" ? t.accent : t.text;
      for (const l of clampLines(ctx, opts.closeLine.text || "", W - 260, opts.closeLine.maxLines || 2)) add(l, ctx.font, col, Math.round(size * 1.5));
    }
    gap(60);
    ctx.font = `400 46px ${serif}`;
    for (const para of opts.lines || []) {
      for (const l of wrap(ctx, para, W - 260)) add(l, ctx.font, t.text, 70);
      gap(30);
    }
    if (opts.parchment) { block(parchmentBlock(opts.parchment, fonts)); gap(40); }
    if (opts.hook) {
      gap(20);
      ctx.font = `500 40px ${serif}`;
      for (const l of wrap(ctx, opts.hook, W - 260)) add(l, ctx.font, t.accent, 62);
      gap(30);
    }
    for (const b of opts.badges || []) { block(badgeBlock(b, fonts)); gap(24); }
    // (9단계) 안내자 서명: 흐름의 마지막 줄. guideSignature: { name, line }. 없으면 지금과 동일하게 그린다
    if (opts.guideSignature) { gap(12); block(signatureBlock(opts.guideSignature, fonts)); }

    const heightOf = (r) => r.gap || r.lineH || r.block.height;
    let total = rows.reduce((s, r) => s + heightOf(r), 0);
    while (total > SAFE_BOTTOM - SAFE_TOP && rows.length) total -= heightOf(rows.pop()); // 넘치면 뒤쪽 줄을 버린다
    let y = SAFE_TOP + Math.max(0, (SAFE_BOTTOM - SAFE_TOP - total) / 2);

    for (const r of rows) {
      if (r.gap) { y += r.gap; continue; }
      if (r.block) {
        ctx.save();
        r.block.draw(ctx, y, t);
        ctx.restore();
        y += r.block.height;
        continue;
      }
      y += r.lineH;
      ctx.save();
      ctx.font = r.font;
      ctx.fillStyle = r.color;
      if (r.glow) { ctx.shadowColor = t.accent; ctx.shadowBlur = 50; }
      ctx.fillText(r.text, W / 2, y - r.lineH * 0.22);
      ctx.restore();
    }

    if (opts.footer) {
      ctx.fillStyle = t.muted;
      ctx.font = `500 ${opts.footerY ? 32 : 36}px ${serif}`;
      ctx.textAlign = "center";
      const fy = opts.footerY || H - 220;
      ctx.fillText(opts.footer, W / 2, urlLine ? fy - 40 : fy);
      if (urlLine) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.font = `400 ${urlLine.size}px ${sans}`;
        try { ctx.letterSpacing = "0.02em"; } catch (e) { /* 지원하지 않는 브라우저 */ }
        ctx.fillText(urlLine.text, W / 2, fy);
        ctx.restore();
      }
    }
    return canvas;
  }

  // url(선택): 공유 시트에 함께 넘길 주소. 안 넘기면 예전과 같다
  async function share(canvas, filename, text, url) {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share(url ? { files: [file], text, url } : { files: [file], text });
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return "cancelled";
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return "downloaded";
  }

  window.ShareCard = { render, share };
})();
