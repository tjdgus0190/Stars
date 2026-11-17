// 홈 화면 앱(PWA)을 켤 때의 실행 연출 — 처음 화면(/)의 <head>에서 바로 불러온다(gen-guide.js). (2026-11-16 운영자)
// 흐름(약 3초): 별이 깨어남 → 금빛 고리가 그려짐 → 일곱 문장이 차례로 켜짐 → 가운데 문이 열리고 빛이 번짐 → 점술관으로.
//   (2026-11-17 운영자) 안드로이드: 휴대폰이 먼저 띄우는 큰 앱 아이콘(시스템 첫 화면)과 같은 자리·크기의 아이콘에서 시작해,
//   아이콘이 그대로 풀려 금빛 고리가 되고 문장이 켜진다(끊김 없이). 아이폰: 검은 첫 화면 → 고리를 그리며 시작.
//   아무 데나 누르면 바로 들어간다. 움직임 줄이기 설정이면 짧게 나타났다 사라진다.
// 보이는 때: 홈 화면 앱으로 연 경우(display-mode standalone)만, 앱을 켤 때 한 번(이 탭 sessionStorage "strange-oracle-intro" = "1", 입력값 아님).
// 문구: data-nav.js NAV.pwa.intro · 모양: nav.css .sointro
(function () {
  "use strict";
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (!standalone) return;
  try {
    if (sessionStorage.getItem("strange-oracle-intro")) return;
    sessionStorage.setItem("strange-oracle-intro", "1");
  } catch (e) { return; }
  var H = document.documentElement;
  H.classList.add("so-intro"); // 첫 화면이 비치지 않게 어두운 막을 먼저 친다(nav.css)
  var ICON = "/products/strange-oracle/img/app/icon-maskable-512.png";
  var calm0 = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fromIcon = /Android/i.test(navigator.userAgent) && !calm0;
  if (fromIcon) { H.classList.add("so-intro-icon"); new Image().src = ICON; } // 막에도 같은 아이콘을 그려 시스템 첫 화면과 이어지게
  var done = false;
  var finish = function () { if (done) return; done = true; H.classList.remove("so-intro"); };
  var bail = setTimeout(finish, 6000); // 무슨 일이 있어도 6초 뒤에는 점술관이 보인다

  var start = function () {
    var C = window.NAV && window.NAV.pwa, T = C && C.intro;
    if (!T || C.mode === "off") { clearTimeout(bail); finish(); return; }
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
    // 일곱 문장(앱 아이콘과 같은 자리·같은 결의 단순한 선 그림, 24×24)
    var SIGILS = [
      '<path d="M12 3v4M9 7h6l-1 4h-4zM8 11h8M10 11v5M14 11v5M9 16h6M8 20h8"/>', // 만신
      '<path d="M12 4c2 3 3 4.5 3 6.5a3 3 0 0 1-6 0C9 8.5 10 7 12 4zM9 14h6v6H9zM7 20h10"/>', // 베다(등불)
      '<path d="M9 3v18M9 9l7-4M9 14l7-4"/>', // 룬
      '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>', // 데칸(해)
      '<circle cx="12" cy="12" r="8"/><path d="M12 12l4-4M12 12V7"/><circle cx="12" cy="12" r="1"/>', // 촐킨(시간의 바퀴)
      '<path d="M15 4a8 8 0 1 0 0 16a6.5 6.5 0 0 1 0-16z"/>', // 시빌라(달)
      '<path d="M12 3v18M12 7h5M12 10h5M12 13h5M12 16h5"/>', // 오검
    ];
    var R = 112, nodes = "";
    for (var i = 0; i < 7; i++) {
      var a = (-90 + i * 360 / 7) * Math.PI / 180, x = 150 + R * Math.cos(a), y = 150 + R * Math.sin(a);
      nodes += '<g class="sointro__node" style="--i:' + i + '" transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ')"><circle class="sointro__halo" r="26"/><circle class="sointro__disc" r="19"/><g class="sointro__sig"><g transform="translate(-10 -10) scale(0.8333)">' + SIGILS[i] + "</g></g></g>"; // 바깥 g는 튀어나오는 움직임, 안쪽 g는 자리
    }
    var ticks = "";
    for (var k = 0; k < 56; k++) ticks += '<line x1="150" y1="' + (150 - R - 6) + '" x2="150" y2="' + (150 - R - (k % 4 ? 2 : 9)) + '" transform="rotate(' + (k * 360 / 56).toFixed(2) + ' 150 150)"/>';
    var name = Array.from(String(T.name)).map(function (ch, j) { return ch === " " ? " " : '<span style="--j:' + j + '">' + esc(ch) + "</span>"; }).join("");
    var box = document.createElement("div");
    box.className = "sointro" + (calm ? " is-calm" : fromIcon ? " is-from-icon" : "");
    box.setAttribute("aria-hidden", "true"); // 꾸밈 연출(3초 뒤 저절로 사라짐)
    box.innerHTML =
      '<div class="sointro__sky"></div><div class="sointro__mist"></div>' + (fromIcon ? '<div class="sointro__icon"></div>' : "") +
      '<div class="sointro__stage"><svg class="sointro__seal" viewBox="0 0 300 300" aria-hidden="true">' +
      '<defs><radialGradient id="soiGlow"><stop offset="0" stop-color="#fff6dc"/><stop offset="0.35" stop-color="#f3d58e" stop-opacity="0.85"/><stop offset="1" stop-color="#f3d58e" stop-opacity="0"/></radialGradient></defs>' +
      '<g class="sointro__ticks">' + ticks + "</g>" +
      '<circle class="sointro__ring" cx="150" cy="150" r="' + R + '" pathLength="1"/>' +
      '<circle class="sointro__inner" cx="150" cy="150" r="50" pathLength="1"/>' +
      '<g class="sointro__door" transform="translate(150 152)">' +
      '<ellipse class="sointro__light" rx="15" ry="22" fill="url(#soiGlow)"/>' +
      '<path class="sointro__frame" d="M-17 24V-6a17 17 0 0 1 34 0V24M-23 24h46"/>' +
      '<path class="sointro__leaf sointro__leaf--l" d="M-15 23V-5a15 15 0 0 1 15-15V23zM-5 6v0.1"/>' +
      '<path class="sointro__leaf sointro__leaf--r" d="M15 23V-5a15 15 0 0 0-15-15V23zM5 6v0.1"/>' +
      "</g>" + nodes + "</svg></div>" +
      '<div class="sointro__words"><small>' + esc(T.eyebrow) + '</small><b class="sointro__name">' + name + "</b><p>" + esc(T.line) + "</p></div>" +
      '<div class="sointro__flood"></div>';
    document.body.append(box);
    if (fromIcon) {
      // 시스템 첫 화면의 아이콘 고리(지름 ≈ 240px × 0.57)와 같은 크기·화면 가운데에서 출발해 제자리로 펼쳐진다
      var stage = box.querySelector(".sointro__stage"), r0 = stage.getBoundingClientRect();
      var ringD = r0.width * (2 * R) / 300;
      stage.style.setProperty("--fs", ((240 * 0.57) / ringD).toFixed(4));
      stage.style.setProperty("--fx", (window.innerWidth / 2 - (r0.left + r0.width / 2)).toFixed(1) + "px");
      stage.style.setProperty("--fy", (window.innerHeight / 2 - (r0.top + r0.height / 2)).toFixed(1) + "px");
    }
    var timers = [];
    var go = function () {
      if (box.classList.contains("is-go")) return;
      timers.forEach(clearTimeout);
      box.classList.add("is-go");
      finish(); // 막을 걷고 연출 위에서 빛이 번지며 사라진다
      setTimeout(function () { box.remove(); }, calm ? 400 : 1000);
    };
    box.addEventListener("click", go);
    requestAnimationFrame(function () { box.classList.add("is-on"); });
    timers.push(setTimeout(go, calm ? 1100 : fromIcon ? 3500 : 3100));
    clearTimeout(bail);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
