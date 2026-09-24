// 공유 카드 생성기 (모든 제품 공용)
// 결과를 스토리 비율(1080x1920) 이미지로 그리고, 모바일에선 공유 시트, PC에선 다운로드로 내보낸다.
//
// 사용법:
//   <script src="../../common/share-card.js"></script>
//   const canvas = await ShareCard.render({ eyebrow, glyph, title, subtitle, lines, footer, theme, fonts });
//   ShareCard.share(canvas, "result.png", "공유 문구");
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

  async function render(opts) {
    const t = Object.assign({}, DEFAULT_THEME, opts.theme);
    const serif = opts.fonts?.serif || "serif";
    const glyphFont = opts.fonts?.glyph || serif;
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
    const SAFE_TOP = 260;
    const SAFE_BOTTOM = H - 320;
    const rows = []; // { text, font, color, lineH, glow }
    const add = (text, font, color, lineH, glow) => rows.push({ text, font, color, lineH, glow });
    const gap = (h) => rows.push({ gap: h });

    if (opts.eyebrow) { add(opts.eyebrow, `500 38px ${serif}`, t.muted, 60); gap(30); }
    if (opts.glyph) {
      const big = opts.glyph.length <= 3;
      add(opts.glyph, `${big ? 260 : 150}px ${glyphFont}`, t.accent, big ? 280 : 180, true);
      gap(50);
    }
    ctx.font = `700 92px ${serif}`;
    for (const l of wrap(ctx, opts.title || "", W - 220)) add(l, ctx.font, t.text, 116);
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

    const heightOf = (r) => r.gap || r.lineH;
    let total = rows.reduce((s, r) => s + heightOf(r), 0);
    while (total > SAFE_BOTTOM - SAFE_TOP && rows.length) total -= heightOf(rows.pop()); // 넘치면 뒤쪽 줄을 버린다
    let y = SAFE_TOP + Math.max(0, (SAFE_BOTTOM - SAFE_TOP - total) / 2);

    for (const r of rows) {
      if (r.gap) { y += r.gap; continue; }
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
      ctx.font = `500 36px ${serif}`;
      ctx.fillText(opts.footer, W / 2, H - 220);
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
