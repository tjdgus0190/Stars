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
    const content = { title: k.title || "", description: k.description || "", imageUrl: k.imageUrl || "", link };
    if (k.imageWidth && k.imageHeight) Object.assign(content, { imageWidth: k.imageWidth, imageHeight: k.imageHeight });
    const msg = { objectType: "feed", content };
    if (k.button) msg.buttons = [{ title: k.button, link }]; // (2026-10-25) 버튼 이름(없으면 카카오 기본 버튼)
    Kakao.Share.sendDefault(msg);
  }

  // (2026-10-28) 글자만 보내는 카카오톡 메시지(text 템플릿, 최대 200자). 사용자가 받는 사람(나와의 채팅 등)을 고른다.
  //   k: { jsKey, sdkUrl, integrity } · text: 보낼 글 · url: 버튼 링크(쿼리에 입력값·코드를 넣지 않는다) · button: 버튼 이름(없으면 카카오 기본)
  async function sendKakaoText(k, text, url, button) {
    const Kakao = await loadKakao(k);
    if (!Kakao.isInitialized()) Kakao.init(k.jsKey);
    const msg = { objectType: "text", text: String(text).slice(0, 200), link: { mobileWebUrl: url, webUrl: url } };
    if (button) msg.buttonTitle = button;
    Kakao.Share.sendDefault(msg);
  }

  // opts: { url, root = document, onCopy(ok), kakao: { jsKey, sdkUrl, integrity, label, bigLabel?, title, description, imageUrl, imageWidth?, imageHeight?, button?, content?(slot), onFail() } }
  //   (2026-10-25) content(slot): 누른 자리에 맞춘 { title, description, imageUrl, url } 을 돌려주면 그 값으로 보낸다(빠진 칸은 위 기본값)
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
        // (2026-10-25) data-variant="big": 노란 카카오 버튼(말풍선 기호 + bigLabel). 그 밖은 예전처럼 글자 링크
        if (slot.dataset.variant === "big") {
          b.className = "btn-kakao btn-kakao--share";
          b.innerHTML = '<svg class="btn-kakao__sym" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.2C6.6 3.2 2.3 6.6 2.3 10.8c0 2.7 1.8 5.1 4.6 6.5l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.4 0 .8.1 1.2.1 5.4 0 9.7-3.4 9.7-7.8S17.4 3.2 12 3.2Z"/></svg>';
          const t = document.createElement("span");
          t.textContent = k.bigLabel || k.label || "";
          b.append(t);
        } else {
          b.className = "text-link";
          b.textContent = k.label || "";
        }
        b.addEventListener("click", () => {
          const c = (k.content && k.content(slot)) || {};
          sendKakao(Object.assign({}, k, c), c.url || url).catch(() => k.onFail && k.onFail());
        });
        slot.replaceChildren(b);
      });
    }
    return { url };
  }

  window.ShareButtons = { init, siteUrl, displayUrl, copyText, reset, sendKakaoText };
})();
