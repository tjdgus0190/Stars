// 전설 릴스 명화 장면 부품 (2026-11-12). 저작권이 끝난 명화(퍼블릭 도메인) 위에 영화 같은 카메라(켄 번스: 천천히 다가가기·옮겨 가기)를 건다.
// 모든 움직임은 CSS 애니메이션의 시작 시각으로만 정한다(렌더 도구가 currentTime으로 프레임을 고름). 무작위 값 없음.
// 쓰는 법: window.Paint.shots(층, [{ img, w, h, t0, t1, a: [fx, fy, z], b: [fx, fy, z], grade, cut }])
//   img: 그림 주소, w·h: 그림 원래 크기(px), t0~t1: 이 장면이 보이는 때(초), a→b: 시작·끝 카메라(그림 안의 비율 좌표 fx·fy를 화면 가운데에, z는 화면을 꽉 채우는 배율의 몇 배)
//   grade: 색보정 CSS filter, cut: 들어올 때 "flash"(번쩍 컷) | "fade"(겹쳐 바뀜, 기본) | "whip"(옆으로 휙)
(function () {
  const SW = 1080, SH = 1920;
  let n = 0;
  const css = [];
  // 카메라 한 점 → transform (그림이 화면을 늘 덮도록 가장자리에서 멈춤)
  const cam = (w, h, [fx, fy, z], cy = 0.5) => {
    const S = Math.max(SW / w, SH / h) * z;
    let tx = SW / 2 - fx * w * S, ty = SH * cy - fy * h * S;
    tx = Math.min(0, Math.max(SW - w * S, tx));
    ty = Math.min(0, Math.max(SH - h * S, ty));
    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${S.toFixed(4)})`;
  };
  function shots(layer, list) {
    list.forEach((s, i) => {
      const k = `kb${n++}`;
      const shot = document.createElement("div");
      shot.className = "shot";
      const im = document.createElement("div");
      im.className = "pimg";
      Object.assign(im.style, { width: s.w + "px", height: s.h + "px", backgroundImage: `url("${s.img}")`, filter: s.grade || "" });
      css.push(`@keyframes ${k} { from { transform: ${cam(s.w, s.h, s.a, s.cy)}; } to { transform: ${cam(s.w, s.h, s.b, s.cy)}; } }`);
      const dur = s.t1 - s.t0 + 0.6;
      im.style.animation = `${k} ${dur.toFixed(2)}s ${s.ease || "cubic-bezier(0.25, 0.1, 0.25, 1)"} ${(s.t0 - 0.3).toFixed(2)}s both`;
      shot.append(im);
      const cut = s.cut || "fade";
      const inA = i === 0 ? null : cut === "flash" ? `shot-in 0.08s linear ${s.t0}s both` : cut === "whip" ? `shot-whip 0.55s cubic-bezier(0.6, 0, 0.2, 1) ${s.t0 - 0.25}s both` : `shot-in 0.7s ease-in-out ${s.t0 - 0.3}s both`;
      const outA = s.t1 != null && i < list.length - 1 ? `shot-out 0.01s linear ${(s.t1 + 0.5).toFixed(2)}s forwards` : null;
      shot.style.animation = [inA, outA].filter(Boolean).join(", ");
      if (i === 0) shot.style.opacity = 1;
      layer.append(shot);
      if (s.extra) s.extra(shot, im);
    });
    const st = document.createElement("style");
    st.textContent = css.join("\n");
    document.head.append(st);
    // 렌더 도구가 그림을 모두 불러온 뒤 찍게(render.js가 window.__ready3d를 기다린다)
    const urls = [...new Set(list.map((s) => s.img))];
    window.__paintReady = window.__ready3d = Promise.all(urls.map((u) => new Promise((ok) => { const im = new Image(); im.onload = () => (im.decode ? im.decode().then(ok, ok) : ok()); im.onerror = ok; im.src = u; })));
  }
  window.Paint = { shots, cam };
})();
