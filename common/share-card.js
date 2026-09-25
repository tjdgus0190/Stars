// 공유 카드 생성기 (모든 제품 공용)
// 결과를 스토리 비율(1080x1920) 이미지로 그리고, 모바일에선 공유 시트, PC에선 다운로드로 내보낸다.
//
// 사용법:
//   <script src="../../common/share-card.js"></script>
//   const canvas = await ShareCard.render({ eyebrow, glyph, title, subtitle, lines, footer, theme, fonts });
//   ShareCard.share(canvas, "result.png", "공유 문구");
// 선택 옵션(2026-09-25 추가, 안 넘기면 예전과 똑같이 그린다): art, stones, progress, lead, titleSize,
//   titleColor, titleGlow, hook, badges, footerY. 자세한 설명은 docs/common.md
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

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // 먼저 줄 목록과 높이를 계산한 뒤, 본문 전체를 안전 영역 가운데에 놓는다.
    // 스토리 화면 위아래(약 250px)는 인스타그램 UI에 가려진다.
    // footerY를 넘기면 아래 안전선을 그 위로 올린다(제품 이름이 본문과 겹치지 않게).
    const SAFE_TOP = 260;
    const SAFE_BOTTOM = opts.footerY ? Math.min(H - 320, opts.footerY - 90) : H - 320;
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
    if (opts.stones?.length) { block(stonesBlock(opts.stones, fonts)); gap(50); }
    if (opts.progress) { block(progressBlock(opts.progress, fonts)); gap(60); }
    if (opts.lead) { add(opts.lead, `500 40px ${serif}`, t.muted, 64); gap(20); }

    const titleSize = opts.titleSize || 92;
    ctx.font = `700 ${titleSize}px ${serif}`;
    const titleColor = opts.titleColor === "accent" ? t.accent : t.text;
    for (const l of wrap(ctx, opts.title || "", W - 220)) add(l, ctx.font, titleColor, Math.round(titleSize * 1.26), opts.titleGlow);
    if (opts.subtitle) {
      gap(10);
      ctx.font = `500 50px ${serif}`;
      for (const l of wrap(ctx, opts.subtitle, W - 220)) add(l, ctx.font, t.accent, 70);
    }
    gap(60);
    ctx.font = `400 46px ${serif}`;
    for (const para of opts.lines || []) {
      for (const l of wrap(ctx, para, W - 260)) add(l, ctx.font, t.text, 70);
      gap(30);
    }
    if (opts.hook) {
      gap(20);
      ctx.font = `500 40px ${serif}`;
      for (const l of wrap(ctx, opts.hook, W - 260)) add(l, ctx.font, t.accent, 62);
      gap(30);
    }
    for (const b of opts.badges || []) { block(badgeBlock(b, fonts)); gap(24); }

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
      ctx.fillText(opts.footer, W / 2, opts.footerY || H - 220);
    }
    return canvas;
  }

  async function share(canvas, filename, text) {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
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
