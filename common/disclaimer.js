// 면책 문구 (모든 운세·사주·타로 제품 공용)
// 문구는 CLAUDE.md 8장에 정해진 그대로다. 제품에서 바꾸지 않는다.
//
// 사용법:
//   <script src="../../common/disclaimer.js"></script>
//   Disclaimer.mount(결과 하단 요소);   // <p class="disclaimer">를 넣는다. 스타일은 제품 CSS의 .disclaimer
(function () {
  const TEXT = "재미로 보는 콘텐츠이며, 중요한 결정의 근거로 삼지 마세요.";

  function mount(target) {
    if (!target) return;
    const p = document.createElement("p");
    p.className = "disclaimer";
    p.textContent = TEXT;
    target.replaceChildren(p);
  }

  window.Disclaimer = { mount, TEXT };
})();
