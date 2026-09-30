// 공유 버튼 공통 부품: 링크 복사 + 카카오톡 공유 자리. 문구 없음(문구는 제품 마크업·data.js에 둔다).
// 사용법은 docs/common.md 「share-buttons.js」.
//
//   <script src="../../common/share-buttons.js"></script>
//   ShareButtons.init({ url: ShareButtons.siteUrl(TEXT.site.url), kakao: { jsKey: "", sdkUrl: "", label: "카카오톡으로 보내기", title, description, imageUrl } });
//
// 마크업 훅(data-js만 본다. class에 기대지 않는다):
//   share-link-copy    누르면 주소를 클립보드에 넣는다
//   share-link-status  완료 줄(.is-hidden). 버튼에서 위로 올라가며 처음 만나는 것 하나를 쓴다
//   share-link-msg     복사 성공 문구 / share-link-url  클립보드가 막혔을 때 주소를 글자로 보여 줄 자리(.is-hidden)
//   share-kakao-slot   카카오톡 버튼이 들어갈 빈 자리. 키가 비어 있으면 아무것도 넣지 않는다
//
// 개인정보: 공유·복사하는 것은 서비스 주소(쿼리·해시 없음)와 제목·설명·대표 이미지뿐이다. 입력값·결과 코드는 받지도 넣지도 않는다.
// 카카오 SDK는 jsKey와 sdkUrl이 둘 다 있을 때, 버튼을 누른 순간에만 불러온다. 비어 있으면 버튼도 요청도 없다.
(function () {
  "use strict";
  const HIDDEN = "is-hidden";
  const q = (name, scope) => scope.querySelector(`[data-js="${name}"]`);

  // 서비스 주소: 설정값이 있으면 그 값, 없으면 지금 주소. 쿼리·해시는 항상 뺀다
  function siteUrl(configured) {
    const raw = String(configured || "").trim() || location.origin + location.pathname;
    return raw.split("#")[0].split("?")[0];
  }
  // 표시용: "https://" 뗀 글자
  const displayUrl = (url) => String(url || "").replace(/^https?:\/\//, "");

  // 클립보드에 글자 넣기 → 성공 여부. 버튼을 누른 동작 안에서만 부른다
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      /* 아래로 */
    }
    return false;
  }

  function statusOf(btn) {
    for (let el = btn.parentElement; el; el = el.parentElement) {
      const s = q("share-link-status", el);
      if (s) return s;
    }
    return null;
  }
  function showStatus(btn, ok, url) {
    const status = statusOf(btn);
    if (!status) return;
    const msg = q("share-link-msg", status);
    const box = q("share-link-url", status);
    if (msg) msg.classList.toggle(HIDDEN, !ok);
    if (box) {
      box.textContent = ok ? "" : url; // 막힌 브라우저: 길게 눌러 고를 수 있는 글자로
      box.classList.toggle(HIDDEN, ok);
    }
    status.classList.remove(HIDDEN);
  }
  // 완료 줄 모두 닫기 (화면을 옮길 때 제품이 부른다)
  function reset(root = document) {
    root.querySelectorAll('[data-js="share-link-status"]').forEach((s) => s.classList.add(HIDDEN));
  }

  let sdk = null;
  function loadKakao(k) {
    if (!sdk)
      sdk = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = k.sdkUrl;
        if (k.integrity) {
          s.integrity = k.integrity;
          s.crossOrigin = "anonymous";
        }
        s.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error("Kakao SDK")));
        s.onerror = () => {
          sdk = null;
          reject(new Error("Kakao SDK"));
        };
        document.head.append(s);
      });
    return sdk;
  }
  async function sendKakao(k, url) {
    const Kakao = await loadKakao(k);
    if (!Kakao.isInitialized()) Kakao.init(k.jsKey);
    const link = { mobileWebUrl: url, webUrl: url };
    Kakao.Share.sendDefault({ objectType: "feed", content: { title: k.title || "", description: k.description || "", imageUrl: k.imageUrl || "", link } });
  }

  // opts: { url, root = document, onCopy(ok), kakao: { jsKey, sdkUrl, integrity, label, title, description, imageUrl, onFail() } }
  function init(opts) {
    const root = opts.root || document;
    const url = siteUrl(opts.url);
    root.addEventListener("click", async (e) => {
      const btn = e.target.closest && e.target.closest('[data-js="share-link-copy"]');
      if (!btn) return;
      const ok = await copyText(url);
      showStatus(btn, ok, url);
      if (opts.onCopy) opts.onCopy(ok);
    });
    const k = opts.kakao || {};
    if (k.jsKey && k.sdkUrl) {
      root.querySelectorAll('[data-js="share-kakao-slot"]').forEach((slot) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "text-link";
        b.textContent = k.label || "";
        b.addEventListener("click", () => sendKakao(k, url).catch(() => k.onFail && k.onFail()));
        slot.replaceChildren(b);
      });
    }
    return { url };
  }

  window.ShareButtons = { init, siteUrl, displayUrl, copyText, reset };
})();
