// 낯선 점술관 — 2027 신년운세 탭 「새해의 회랑」 (2026-11-04 운영자 결정, 시험판. data.js ny.mode가 "off"가 아닐 때만 app.js가 받는다)
// 나의 이야기와 따로 떨어진 탭: 일곱 문 가운데 듣고 싶은 방을 골라 들어갔다 나온다(다음 방으로 잇지 않는다).
// 무료: 한 해의 결·열쇠 낱말·열두 달(절기·반년) 이름표와 빛남 표시(data-ny.js + 이 파일의 계산). 유료: 문장(api/_paid/book/book-ny.js, 함수 book file "ny"로만).
// (2026-11-12 운영자 결정) 신년운세는 책과 따로 파는 상품(4,900원, 코드 SNY). 처음 고른 두 방은 상세 풀이까지 무료(함수 book "ny-free": 그 방·그 결과 번호 조각만),
//   셋째 방부터는 문 앞에서 결제 안내(ny-pay) → 한 번 결제로 남은 방 모두. 책 코드(SOP)로는 열리지 않는다.
//   고른 무료 방 이름(입력값 아님, 최대 2개)은 이 기기 localStorage "strange-oracle-ny-free"에 둔다(다음 방문에도 같은 두 방).
// 개인정보(6장): 생년월일·시각·이름은 나의 이야기와 같은 state.profile(sessionStorage, 이 탭)에만. 서버로 보내는 값은 { pass, file:"ny" } 또는 { file:"ny-free", room, k(결과 번호) }뿐.
//   이 탭에서 새로 뽑은 룬 세 개·고른 시빌라 주제와 신탁 번호(입력값 아님)는 sessionStorage "strange-oracle-ny"에 두고 "내 정보 지우기"로 지운다.
(function () {
  "use strict";
  const ROOMS = ["saju", "ogham", "star", "decan", "tzolkin", "rune", "sibyl"];
  const SES = "strange-oracle-ny";
  const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];
  const BIRTH_ROOMS = ["saju", "star", "decan", "tzolkin"];
  const TIME_ROOMS = ["saju", "star"];
  const FREE_KEY = "strange-oracle-ny-free";
  const FREE_MAX = 2;

  function mount(C) {
    const T = C.T;
    const N = T.ny;
    const F = () => window.NY_FREE || {};
    const mk = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    const fill = C.fill;
    let cur = null; // 지금 연 방
    let model = null; // 지금 결과(메모리만)
    const heard = new Set(); // 이 탭에서 결과를 본 방(메모리)
    let drawn = readSes();
    // ── 무료 두 방(이 기기). 결제한 탭(C.passNow() = 신년운세 코드)은 모두 열림
    function readFree() {
      try {
        const v = JSON.parse(window.localStorage.getItem(FREE_KEY) || "[]");
        return Array.isArray(v) ? v.filter((r, i) => ROOMS.includes(r) && v.indexOf(r) === i).slice(0, FREE_MAX) : [];
      } catch (e) {
        return memFree.slice();
      }
    }
    let memFree = [];
    function addFree(room) {
      const v = readFree();
      if (v.includes(room) || v.length >= FREE_MAX) return;
      v.push(room);
      memFree = v;
      try {
        window.localStorage.setItem(FREE_KEY, JSON.stringify(v));
      } catch (e) {
        /* 저장 막힘: 이 화면에서만 */
      }
      C.track("so_ny", { step: "free", room });
    }
    const paid = () => Boolean(C.passNow());
    const isFree = (room) => readFree().includes(room);
    const canEnter = (room) => paid() || isFree(room) || readFree().length < FREE_MAX;
    // 셋째 문(또는 결과 끝 [남은 방 모두 열기]) → 신년운세 결제 화면. 고른 방 이름은 결제 뒤 그 방으로 가려고 이 탭에만
    function gate(room, step) {
      drawn.pending = ROOMS.includes(room) ? room : null;
      writeSes();
      C.track("so_ny", room ? { step: step || "gate", room } : { step: step || "gate" });
      C.go("ny-pay");
    }

    function readSes() {
      try {
        const v = JSON.parse(window.sessionStorage.getItem(SES) || "null");
        return v && typeof v === "object" ? v : {};
      } catch (e) {
        return {};
      }
    }
    function writeSes() {
      try {
        window.sessionStorage.setItem(SES, JSON.stringify(drawn));
      } catch (e) {
        /* 저장 막힘: 이 화면에서만 */
      }
    }
    const rand = (n) => {
      const buf = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / n) * n;
      do crypto.getRandomValues(buf);
      while (buf[0] >= limit);
      return buf[0] % n;
    };

    // ───────── 화면 만들기 ─────────
    const host = C.screens.hub.parentNode;
    const screen = (id) => {
      const s = mk("section", "screen ny-screen");
      s.id = "screen-" + id;
      s.dataset.js = "screen-" + id;
      s.dataset.room = "ny";
      host.append(s);
      C.screens[id] = s;
      return s;
    };
    const hubScr = screen("ny-hub");
    const roomScr = screen("ny-room");
    const resScr = screen("ny-result");
    const payScr = screen("ny-pay");
    payScr.classList.add("ny-pay");

    // (2026-11-04) 새해 하늘: 우주 배경 위에 겹치는 새벽 층(새해 화면에서만 서서히 밝아진다)
    const sky = mk("div", "ny-sky");
    sky.setAttribute("aria-hidden", "true");
    sky.innerHTML = '<div class="ny-sky__glow"></div><div class="ny-sky__sun"></div><div class="ny-sky__cloud ny-sky__cloud--a"></div><div class="ny-sky__cloud ny-sky__cloud--b"></div><div class="ny-sky__cloud ny-sky__cloud--c"></div><div class="ny-sky__motes"></div><div class="ny-sky__motes ny-sky__motes--b"></div>' +
      '<svg class="ny-sky__ridge" viewBox="0 0 400 120" preserveAspectRatio="none"><path class="ny-sky__ridge-far" d="M0 120V66L34 54 70 64 112 34 150 58 196 26 240 56 284 40 326 60 368 42 400 52V120Z"/><path class="ny-sky__ridge-near" d="M0 120V90L48 74 96 88 146 66 196 88 248 70 300 92 352 76 400 88V120Z"/></svg>';
    const cosmos = document.querySelector(".cosmos");
    if (cosmos) cosmos.after(sky);
    else document.body.prepend(sky);
    // 탭을 넘길 때 비단이 스치듯 화면을 덮었다 걷힌다(나의 이야기 → 새해: 금빛·주홍, 되돌아갈 때: 남빛). 움직임 줄이기면 바로 바뀐다
    let sweeping = false;
    function sweep(toNy, then) {
      if (C.reduceMotion || sweeping) return then();
      sweeping = true;
      const v = mk("div", "ny-veil " + (toNy ? "is-to-ny" : "is-to-story"));
      v.setAttribute("aria-hidden", "true");
      v.innerHTML = '<div class="ny-veil__silk"></div><div class="ny-veil__sheen"></div><div class="ny-veil__sparks"></div>';
      document.body.append(v);
      setTimeout(then, 650); // 비단이 화면을 다 덮은 가운데에서 바꾼다
      setTimeout(() => {
        v.remove();
        sweeping = false;
      }, 1450);
    }

    // 하단 탭
    const tabbar = mk("nav", "ny-tabbar");
    tabbar.dataset.js = "ny-tabbar";
    tabbar.setAttribute("aria-label", N.tabs.aria);
    const tabStory = mk("button", "ny-tabbar__tab");
    const tabNy = mk("button", "ny-tabbar__tab ny-tabbar__tab--ny");
    tabStory.innerHTML = '<svg class="ny-tabbar__ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3.5a8.5 8.5 0 1 0 5.5 15 7 7 0 1 1-5.5-15Z"/></svg>';
    tabNy.innerHTML = '<svg class="ny-tabbar__ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 6v3M5.6 9.6l2 2M18.4 9.6l-2 2M3 13h2.5M18.5 13H21"/></svg>';
    tabStory.append(mk("span", "", N.tabs.story));
    tabNy.append(mk("span", "", N.tabs.ny));
    [tabStory, tabNy].forEach((b) => (b.type = "button"));
    tabStory.dataset.js = "ny-tab-story";
    tabNy.dataset.js = "ny-tab-ny";
    tabbar.append(tabStory, tabNy);
    document.body.append(tabbar);
    tabStory.addEventListener("click", () => {
      if (!/^ny-/.test(C.current())) return C.go("hub");
      sweep(false, () => C.go("hub", { instant: true }));
    });
    tabNy.addEventListener("click", () => {
      C.track("so_ny", { step: "tab" });
      if (/^ny-/.test(C.current())) return C.go("ny-hub");
      sweep(true, () => C.go("ny-hub", { instant: true }));
    });
    const TAB_ON = /^(hub|story|ny-hub|ny-room|ny-result)$/;
    function onScreen(name) {
      const on = TAB_ON.test(name);
      tabbar.classList.toggle("is-on", on);
      document.body.classList.toggle("has-ny-tabbar", on);
      const ny = /^ny-/.test(name);
      document.body.classList.toggle("is-ny", ny);
      tabNy.classList.toggle("is-current", ny);
      tabStory.classList.toggle("is-current", !ny);
      tabNy.setAttribute("aria-current", ny ? "page" : "false");
      tabStory.setAttribute("aria-current", ny ? "false" : "page");
    }

    // ───────── 새해 입구: 일곱 문 ─────────
    function renderHub() {
      hubScr.textContent = "";
      const head = mk("header", "ny-hub__head");
      head.append(mk("p", "ny-eyebrow", N.hub.eyebrow), mk("h1", "ny-hub__title", N.hub.title));
      const lead = mk("p", "ny-hub__lead");
      lead.innerHTML = N.hub.lead;
      head.append(lead, mk("p", "ny-hub__note", N.hub.note));
      // 무료 두 방 · 결제 상태 한 줄
      const fr = readFree();
      const st = mk("p", "ny-hub__free" + (paid() ? " is-paid" : fr.length >= FREE_MAX ? " is-done" : ""));
      st.dataset.js = "ny-free-state";
      st.textContent = paid() ? N.hub.paidNote : fr.length >= FREE_MAX ? N.hub.freeDone : fr.length ? fill(N.hub.freeLeft, { n: FREE_MAX - fr.length }) : N.hub.freeNote;
      head.append(st);
      if (paid()) {
        const sc = mk("button", "btn btn--text btn--small ny-hub__code", N.hub.showCode);
        sc.type = "button";
        sc.dataset.js = "ny-show-code";
        sc.addEventListener("click", () => C.showCode());
        head.append(sc);
      }
      const grid = mk("div", "ny-doors");
      ROOMS.forEach((room, i) => {
        const b = mk("button", "ny-door");
        b.type = "button";
        b.dataset.room = room;
        b.dataset.js = "ny-door";
        // 문틀(아치) 안: 위 반달 창(방 표지) + 문 두 짝(판넬·손잡이) + 문 뒤 빛 + 문턱. 아래에 방 이름·읽는 법
        const frame = mk("span", "ny-door__frame");
        frame.setAttribute("aria-hidden", "true");
        frame.innerHTML = '<span class="ny-door__light"></span><span class="ny-door__leaf ny-door__leaf--l"></span><span class="ny-door__leaf ny-door__leaf--r"></span>' +
          `<span class="ny-door__fan"><span class="ny-door__icon">${C.ROOM_ICON[room] || ""}</span></span><span class="ny-door__plate">${ROMAN[i]}</span>`;
        const nm = mk("span", "ny-door__name", T.rooms[room].name);
        const by = mk("span", "ny-door__by", N.rooms[room].by);
        b.append(frame, mk("span", "ny-door__step"), nm, mk("span", "ny-door__lens", N.rooms[room].lens), by);
        if (heard.has(room)) b.append(mk("span", "ny-door__heard", N.hub.heard));
        if (!paid()) {
          if (isFree(room)) b.append(mk("span", "ny-door__badge is-free", N.hub.badgeFree));
          else if (fr.length >= FREE_MAX) {
            b.classList.add("is-locked");
            b.dataset.lock = "1";
            b.append(mk("span", "ny-door__badge is-lock", N.hub.badgeLock));
          }
        }
        b.addEventListener("click", () => {
          if (b.classList.contains("is-opening")) return;
          if (!canEnter(room)) return gate(room); // 셋째 방: 문을 열지 않고 결제 안내
          if (C.reduceMotion) return openRoom(room);
          C.ensureRooms([room]).catch(() => {}); // 빨려 들어가는 동안 방 파일을 미리 받는다
          b.classList.add("is-opening"); // 두 짝이 열리고 빛이 쏟아진 뒤
          setTimeout(() => plunge(b, room), 380); // 문 안으로 빨려 들어간다
        });
        grid.append(b);
      });
      hubScr.append(head, grid);
    }
    C.enter["ny-hub"] = () => {
      renderHub();
      C.track("so_ny", { step: "hub" });
    };

    // ───────── 방 안: 안내자 첫마디 + 필요한 입력 ─────────
    function openRoom(room, instant) {
      if (!canEnter(room)) return gate(room);
      cur = room;
      C.ensureRooms([room]).then(() => C.go("ny-room", { instant: Boolean(instant) }), () => C.toast(T.toast.loadFail || ""));
    }
    // (2026-11-12) 문 안으로 빨려 들어가는 연출(약 1.4초): 문 안쪽 빛(포털)이 화면 가운데로 다가오며 화면을 덮고, 새벽 공기 같은 빛 줄기와 티끌이
    //   가운데에서 바깥으로 스쳐 지나간다 → 하얀 새벽빛이 번진 순간 방 안으로 바뀌고 빛이 걷힌다. 누르면 바로 넘어간다
    function plunge(door, room) {
      const fr = door.querySelector(".ny-door__frame").getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const cx = fr.left + fr.width / 2, cy = fr.top + fr.height / 2;
      const ov = mk("div", "ny-plunge");
      ov.dataset.room = room;
      ov.setAttribute("aria-hidden", "true");
      ov.style.setProperty("--cx", cx + "px");
      ov.style.setProperty("--cy", cy + "px");
      const portal = mk("div", "ny-plunge__portal");
      Object.assign(portal.style, { left: fr.left + "px", top: fr.top + "px", width: fr.width + "px", height: fr.height + "px" });
      const motes = mk("div", "ny-plunge__motes");
      for (let i = 0; i < 34; i++) {
        const sp = mk("span");
        const a = Math.random() * Math.PI * 2, d = 45 + Math.random() * 70;
        sp.style.setProperty("--x", (Math.cos(a) * d).toFixed(1) + "vmax");
        sp.style.setProperty("--y", (Math.sin(a) * d).toFixed(1) + "vmax");
        sp.style.setProperty("--d", Math.round(Math.random() * 380) + "ms");
        sp.style.setProperty("--s", (0.6 + Math.random() * 1.4).toFixed(2));
        motes.append(sp);
      }
      ov.append(mk("div", "ny-plunge__dim"), portal, mk("div", "ny-plunge__streaks"), motes, mk("div", "ny-plunge__flash"));
      document.body.append(ov);
      const scale = Math.max(vw / fr.width, vh / fr.height) * 2.4;
      if (portal.animate)
        portal.animate([{ transform: "translate(0, 0) scale(1)", filter: "brightness(1)" }, { transform: `translate(${(vw / 2 - cx).toFixed(1)}px, ${(vh / 2 - cy).toFixed(1)}px) scale(${scale.toFixed(2)})`, filter: "brightness(1.6)" }],
          { duration: 950, easing: "cubic-bezier(.55, 0, .25, 1)", fill: "forwards" });
      let done = false;
      const enterNow = () => {
        if (done) return;
        done = true;
        openRoom(room, true);
        ov.classList.add("is-out");
        setTimeout(() => ov.remove(), 650);
        door.classList.remove("is-opening");
      };
      ov.addEventListener("click", enterNow);
      setTimeout(enterNow, 860);
    }
    const pad = (n) => String(n).padStart(2, "0");
    function renderRoom() {
      const room = cur;
      roomScr.textContent = "";
      roomScr.dataset.nyRoom = room;
      const R = N.rooms[room];
      const i = ROOMS.indexOf(room);
      const head = mk("header", "ny-room__head");
      head.dataset.room = room;
      head.append(mk("p", "ny-eyebrow", N.hub.eyebrow), mk("h1", "ny-room__title", `${ROMAN[i]} ${T.rooms[room].name}`));
      const guide = mk("div", "ny-guide");
      guide.dataset.room = room;
      guide.innerHTML = `<svg class="ny-guide__fig" viewBox="0 0 48 64" aria-hidden="true"><use href="#guide-${room}" /></svg>`;
      const say = mk("p", "ny-guide__say", R.greet);
      guide.append(say);
      const form = mk("div", "ny-form");
      form.dataset.room = room;
      const p = C.state.profile || {};
      const err = mk("p", "field__error ny-form__error");
      err.hidden = true;
      let get = () => ({});
      if (BIRTH_ROOMS.includes(room)) {
        const hasBirth = p.birth && p.birth.y;
        const saved = mk("div", "ny-saved");
        const wantTime = TIME_ROOMS.includes(room);
        const fields = mk("div", "ny-fields");
        const f1 = mk("label", "field");
        f1.append(mk("span", "field__label", N.input.birthHead));
        const date = mk("input", "input");
        date.type = "date";
        date.min = "1900-01-01";
        date.max = "2026-12-31";
        date.dataset.js = "ny-birth";
        if (hasBirth) date.value = `${p.birth.y}-${pad(p.birth.m)}-${pad(p.birth.d)}`;
        f1.append(date);
        fields.append(f1);
        let time = null, unk = null;
        if (wantTime) {
          const f2 = mk("label", "field");
          f2.append(mk("span", "field__label", N.input.timeHead));
          time = mk("input", "input");
          time.type = "time";
          time.dataset.js = "ny-time";
          if (p.time && Number.isInteger(p.time.h)) time.value = `${pad(p.time.h)}:${pad(p.time.m)}`;
          const u = mk("label", "ny-check");
          unk = mk("input");
          unk.type = "checkbox";
          unk.dataset.js = "ny-time-unknown";
          unk.checked = Boolean(hasBirth && !p.time);
          time.disabled = unk.checked;
          unk.addEventListener("change", () => (time.disabled = unk.checked));
          u.append(unk, mk("span", "", N.input.timeUnknown));
          f2.append(time, u);
          fields.append(f2);
        }
        if (hasBirth) {
          const b = p.birth;
          const line = `${b.y}.${pad(b.m)}.${pad(b.d)}` + (wantTime ? (p.time ? ` · ${pad(p.time.h)}:${pad(p.time.m)}` : ` · ${N.input.timeUnknown}`) : "");
          saved.append(mk("span", "ny-saved__label", N.input.saved), mk("strong", "ny-saved__val", line));
          const ch = mk("button", "btn btn--text btn--small", N.input.change);
          ch.type = "button";
          ch.addEventListener("click", () => {
            fields.hidden = false;
            saved.hidden = true;
          });
          saved.append(ch);
          fields.hidden = true;
          form.append(saved);
        }
        form.append(fields);
        get = () => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.value || "");
          if (!m) return { bad: N.input.bad };
          const y = +m[1], mo = +m[2], d = +m[3];
          if (!window.Calc.validDate(y, mo, d)) return { bad: N.input.bad };
          let t = null;
          if (time && !unk.checked && /^\d{2}:\d{2}$/.test(time.value)) t = { h: +time.value.slice(0, 2), m: +time.value.slice(3, 5) };
          return { birth: { y, m: mo, d }, time: wantTime ? t : undefined };
        };
      } else if (room === "ogham") {
        const f = mk("label", "field");
        f.append(mk("span", "field__label", N.input.nameHead));
        const nm = mk("input", "input");
        nm.type = "text";
        nm.maxLength = 10;
        nm.autocomplete = "off";
        nm.placeholder = N.input.namePh;
        nm.dataset.js = "ny-name";
        if (p.name) nm.value = p.name;
        f.append(nm);
        form.append(f);
        get = () => {
          const v = nm.value.trim();
          return v && window.Calc.ogham(v) ? { name: v } : { bad: N.input.badName };
        };
      } else if (room === "sibyl") {
        const f = mk("fieldset", "field ny-topics");
        f.append(mk("legend", "field__label", N.input.topicHead));
        const g = mk("div", "chip-group ny-chips");
        Object.keys(T.sibyl.topics).forEach((k) => {
          const l = mk("label", "chip-toggle");
          const r = mk("input");
          r.type = "radio";
          r.name = "ny-topic";
          r.value = k;
          r.dataset.js = "ny-topic";
          if (drawn.sibyl && drawn.sibyl.topic === k) r.checked = true;
          l.append(r, mk("span", "", T.sibyl.topics[k].label));
          g.append(l);
        });
        f.append(g);
        form.append(f);
        get = () => {
          const r = form.querySelector("input[name=ny-topic]:checked");
          return r ? { topic: r.value } : { bad: N.input.pickTopic };
        };
      }
      if (BIRTH_ROOMS.includes(room) || room === "ogham") form.append(mk("p", "ny-notice", N.input.notice));
      const go = mk("button", "btn btn--primary btn--block ny-go", room === "rune" ? N.input.draw : room === "sibyl" ? N.input.ask : N.input.go);
      go.type = "button";
      go.dataset.js = "ny-go";
      const back = mk("button", "btn btn--ghost btn--block ny-back", N.result.back);
      back.type = "button";
      back.addEventListener("click", () => C.go("ny-hub"));
      go.addEventListener("click", () => {
        const v = get();
        if (v.bad) {
          err.textContent = v.bad;
          err.hidden = false;
          return;
        }
        err.hidden = true;
        if (v.birth) {
          C.state.profile.birth = v.birth; // 6장 예외: 이 탭의 profile에만(나의 이야기와 같은 칸)
          if (v.time !== undefined) C.state.profile.time = v.time;
        }
        if (v.name) C.state.profile.name = v.name;
        if (v.birth || v.name) C.save();
        if (room === "rune") {
          const picks = [];
          while (picks.length < 3) {
            const r = rand(24);
            if (!picks.includes(r)) picks.push(r);
          }
          drawn.rune = picks;
          writeSes();
        }
        if (room === "sibyl") {
          drawn.sibyl = { topic: v.topic, sors: rand(32) };
          writeSes();
        }
        go.disabled = true;
        ritual(room).then(() => build(room)).then((m) => {
          go.disabled = false;
          model = m;
          heard.add(room);
          if (!paid()) addFree(room); // 결과까지 들은 방만 무료 두 방으로 센다(문만 열고 나간 방은 세지 않음)
          C.go("ny-result");
        }, () => {
          go.disabled = false;
          C.toast(T.toast.loadFail || "");
        });
      });
      form.append(err, go, back);
      roomScr.append(head, guide, form);
    }
    C.enter["ny-room"] = () => {
      if (!cur) return C.go("ny-hub", { replace: true });
      renderRoom();
      C.track("so_ny", { step: "room", room: cur });
    };
    function ritual(room) {
      return new Promise((res) => {
        const ov = mk("div", "ny-ritual");
        ov.dataset.room = room;
        ov.append(mk("span", "ny-ritual__orb"), mk("p", "ny-ritual__text", N.ritual[room] || ""));
        roomScr.append(ov);
        setTimeout(() => {
          ov.remove();
          res();
        }, C.reduceMotion ? 200 : 1500);
      });
    }

    // ───────── 계산 (2027년) ─────────
    // 만신: 십신. 원소 = ⌊간/2⌋(목화토금수), 음양 = 간 mod 2. 생: 목→화→토→금→수→목, 극: +2
    function tenGod(me, o) {
      const rel = (Math.floor(o / 2) - Math.floor(me / 2) + 5) % 5;
      const same = me % 2 === o % 2;
      return [["bigyeon", "geopjae"], ["siksin", "sanggwan"], ["pyeonjae", "jeongjae"], ["pyeongwan", "jeonggwan"], ["pyeonin", "jeongin"]][rel][same ? 0 : 1];
    }
    const SAJU_TONE = { siksin: "bright", jeongjae: "bright", jeonggwan: "bright", jeongin: "bright", geopjae: "rest", pyeongwan: "rest" };
    const SAJU_MONTH_STEMS = [8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // 2027 정미년 월건: 임인(2월)~계축(2028년 1월)
    // 베다: 보름달 이름의 달(전해 오는 달 이름, 1~12월 무렵) → 그 달의 나크샤트라 번호(0=아슈위니)
    const FULL_MOON_NAK = [7, 9, 10, 13, 15, 17, 19, 21, 24, 0, 2, 4];
    const TARA_TONE = ["steady", "bright", "rest", "bright", "rest", "bright", "rest", "bright", "bright"];
    // 데칸: 그달 15일 태양이 있는 열대 별자리(0=양자리). 2027년 각 달 15일 기준
    const SUN_SIGN_15 = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    const DECAN_REL = (d) => (d === 0 ? "same" : d === 4 || d === 8 ? "trine" : d === 2 || d === 10 ? "sextile" : d === 3 || d === 9 ? "square" : d === 6 ? "opposite" : d === 1 || d === 11 ? "near" : "far");
    const DECAN_TONE = { same: "bright", trine: "bright", sextile: "bright", near: "steady", opposite: "steady", square: "rest", far: "rest" };
    // 룬: 조용히 가라앉는 돌(쉬어 가는 쪽)·밝은 돌
    const RUNE_REST = [2, 8, 9, 10];
    const RUNE_BRIGHT = [0, 6, 7, 11, 15, 17, 21, 22];

    function sajuStem() {
      const v = C.state.visits.saju;
      if (v && window.Saju) {
        const d = window.Saju.decodeCode(v.code);
        if (d) return Promise.resolve({ stem: d.S1, note: N.input.fromStory });
      }
      const p = C.state.profile;
      return window.Saju.loadLunar().then(() => {
        const r = window.Saju.compute({ y: p.birth.y, m: p.birth.m, d: p.birth.d, time: p.time ? { h: p.time.h, mi: p.time.m } : null, gender: "none" });
        return { stem: r.select.S1, note: "" };
      });
    }
    function build(room) {
      const p = C.state.profile || {};
      const b = p.birth;
      const FR = F()[room] || {};
      if (room === "saju")
        return sajuStem().then(({ stem, note }) => {
          const S = window.SAJU.stems[stem];
          const items = SAJU_MONTH_STEMS.map((o, i) => {
            const g = tenGod(stem, o);
            return { label: N.sajuMonths[i], tag: N.tenGods[g], tone: SAJU_TONE[g] || "steady", bank: g };
          });
          return { room, mark: fill(N.rooms.saju.mark, { name: `${S.name} · ${S.title}` }), note, theme: FR.theme[stem], keys: FR.keys[stem], kind: "months", items, k: { year: stem, areas: stem, one: stem }, foot: N.result.period };
        });
      if (room === "star") {
        let nak, note = "";
        const v = C.state.visits.star;
        if (v && Number.isInteger(v.nak)) {
          nak = v.nak;
          note = N.input.fromStory;
        } else {
          const c = window.Astro.birthChart(b.y, b.m, b.d, p.time || null);
          nak = (c.candidates.length > 1 ? c.noon : c.charts[0]).nakshatra;
          if (c.candidates.length > 1) note = N.input.noonNote;
        }
        const K = window.NAKSHATRAS[nak];
        const lord = nak % 9;
        const items = FULL_MOON_NAK.map((fm, i) => {
          const t = (((fm - nak) % 27) + 27) % 27 % 9;
          return { label: N.starMonths[i], tag: N.taras[t], tone: TARA_TONE[t], bank: t };
        });
        return Promise.resolve({ room, mark: fill(N.rooms.star.mark, { name: K.name, title: K.title }), note, theme: FR.theme[nak], keys: FR.keys[nak], kind: "months", items, k: { year: lord, areas: lord, one: lord }, foot: N.result.approx });
      }
      if (room === "decan") {
        let idx, note = "";
        const v = C.state.visits.decan;
        if (v && Number.isInteger(v.decan)) {
          idx = v.decan;
          note = N.input.fromStory;
        } else {
          const c = window.Calc.decan(b.y, b.m, b.d);
          idx = c.noon.index;
          if (c.candidates.length > 1) note = N.input.noonNote;
        }
        const D = window.DECANS[idx];
        const sign = Math.floor(idx / 3);
        const items = SUN_SIGN_15.map((ss, i) => {
          const rel = DECAN_REL((ss - sign + 12) % 12);
          return { label: N.months[i], tag: N.decanRel[rel], tone: DECAN_TONE[rel], bank: rel };
        });
        return Promise.resolve({ room, mark: fill(N.rooms.decan.mark, { sign: D.sign, part: D.part, title: D.title }), note, theme: FR.theme[idx], keys: FR.keys[sign], kind: "months", items, k: { year: sign, areas: sign % 4, one: sign } });
      }
      if (room === "tzolkin") {
        let num, sign, note = "";
        const v = C.state.visits.tzolkin;
        if (v) {
          num = v.number;
          sign = v.sign;
          note = N.input.fromStory;
        } else {
          const c = window.Calc.tzolkin(b.y, b.m, b.d);
          num = c.number;
          sign = c.sign;
        }
        let mine = 0;
        for (let x = 0; x < 260; x++) if (x % 13 === num - 1 && x % 20 === sign) mine = x;
        const days = [];
        for (let m = 1; m <= 12; m++) {
          const dim = new Date(Date.UTC(2027, m, 0)).getUTCDate();
          for (let d = 1; d <= dim; d++) if (window.Calc.tzolkin(2027, m, d).dayIndex === mine) days.push({ m, d });
        }
        const items = N.months.map((label, i) => {
          const c = window.Calc.tzolkin(2027, i + 1, 15);
          const start = c.dayIndex - (c.number - 1);
          const ts = (((start % 20) + 20) % 20);
          const rel = ((ts % 4) - (sign % 4) + 4) % 4;
          const mineHere = days.some((x) => x.m === i + 1);
          return { label, tag: N.tzRel[rel] + (mineHere ? " · ★" : ""), tone: mineHere || rel === 0 ? "bright" : rel === 2 ? "rest" : "steady", bank: rel };
        });
        const S = window.TZOLKIN_SIGNS[sign];
        return Promise.resolve({ room, mark: fill(N.rooms.tzolkin.mark, { number: num, name: S.name, title: S.title }), note, theme: FR.theme[sign], keys: FR.keys[sign], sub: FR.num[num - 1], kind: "months", items, days, k: { year: sign, areas: sign % 4, one: sign } });
      }
      if (room === "ogham") {
        const r = window.Calc.ogham(p.name);
        const o = r.index;
        const a = Math.floor(o / 5);
        const O = window.OGHAM[o];
        const items = N.oghamSeasons.map((label, si) => ({ label, tag: "", tone: si === a ? "bright" : si === (a + 2) % 4 ? "rest" : "steady", bank: si }));
        return Promise.resolve({ room, mark: fill(N.rooms.ogham.mark, { name: O.name, title: O.title }), note: "", theme: FR.theme[o], keys: FR.keys[o], kind: "seasons", items, k: { year: o, areas: a, one: o, seasons: a } });
      }
      if (room === "rune") {
        const [k1, k2, k3] = drawn.rune;
        const RN = window.RUNES;
        const tone = (r) => (RUNE_REST.includes(r) ? "rest" : RUNE_BRIGHT.includes(r) ? "bright" : "steady");
        const items = [k1, k2, k3].map((r, i) => ({ label: N.runeHalves[i], tag: `${RN[r].name}`, tone: tone(r), bank: r, half: i }));
        return Promise.resolve({ room, mark: fill(N.rooms.rune.mark, { key: RN[k1].name, summer: RN[k2].name, winter: RN[k3].name }), note: "", theme: FR.key[k1], keys: FR.keys[k1], kind: "halves", items, glyphs: [k1, k2, k3], k: { year: k1, areas: Math.floor(k1 / 8), one: k1 } });
      }
      // sibyl
      const { topic, sors } = drawn.sibyl;
      const O = window.ORACLES[sors];
      const items = N.sibylSeasons.map((label, si) => ({ label, tag: "", tone: si === sors % 4 ? "bright" : si === (sors + 2) % 4 ? "rest" : "steady", bank: si }));
      return Promise.resolve({ room, mark: fill(N.rooms.sibyl.mark, { topic: T.sibyl.topics[topic].label, title: O.title }), note: "", oracle: O.line, theme: FR.topic[topic], keys: O.keywords || [], kind: "seasons", items, k: { year: sors, one: topic, seasons: topic } });
    }

    // ───────── 결과 ─────────
    function renderResult() {
      const M = model;
      resScr.textContent = "";
      resScr.dataset.nyRoom = M.room;
      const i = ROOMS.indexOf(M.room);
      const head = mk("header", "ny-res__head");
      head.dataset.room = M.room;
      head.append(mk("p", "ny-eyebrow", fill(N.result.eyebrow, { room: T.rooms[M.room].name })), mk("h1", "ny-res__mark", M.mark));
      const lensLine = mk("p", "ny-res__lens");
      lensLine.append(mk("span", "ny-res__lens-k", N.result.lensHead), mk("strong", "", N.rooms[M.room].lens));
      head.append(lensLine, mk("p", "ny-res__lens-note", N.result.lensNote));
      if (M.note) head.append(mk("p", "ny-res__note", M.note));
      if (!paid() && isFree(M.room)) {
        const ft = mk("p", "ny-res__free", fill(N.result.freeTag, { n: readFree().indexOf(M.room) + 1 }));
        ft.dataset.js = "ny-free-tag";
        head.append(ft);
      }
      resScr.append(head);
      if (M.oracle) resScr.append(mk("blockquote", "ny-oracle", M.oracle));
      // 무료: 한 해의 결 · 열쇠 낱말
      const free = mk("section", "ny-card ny-free");
      free.dataset.room = M.room;
      free.append(mk("h2", "ny-card__head", N.result.themeHead), mk("p", "ny-theme", M.theme || ""));
      if (M.sub) free.append(mk("p", "ny-sub", M.sub));
      if (M.keys && M.keys.length) {
        const kw = mk("div", "ny-keys");
        kw.append(mk("span", "ny-keys__head", N.result.keysHead));
        M.keys.slice(0, 3).forEach((k) => kw.append(mk("span", "ny-key", k)));
        free.append(kw);
      }
      resScr.append(free);
      // 무료: 한눈에(이름표·빛남 표시) + 가장 빛나는 때
      const cal = mk("section", "ny-card ny-cal");
      cal.dataset.room = M.room;
      const lens = N.rooms[M.room].lens;
      cal.append(mk("h2", "ny-card__head", `${M.kind === "months" ? N.result.calHead : M.kind === "halves" ? N.result.halvesCalHead : N.result.seasonsCalHead} · ${lens}`));
      const grid = mk("ol", "ny-cal__grid ny-cal__grid--" + M.kind);
      M.items.forEach((it) => {
        const li = mk("li", "ny-cal__item is-" + it.tone);
        const [main, sub] = it.label.split(" · ");
        li.append(mk("span", "ny-cal__dot"), mk("span", "ny-cal__label", main));
        if (sub) li.append(mk("span", "ny-cal__sub", sub));
        if (it.tag) li.append(mk("span", "ny-cal__tag", it.tag));
        grid.append(li);
      });
      const lg = mk("p", "ny-cal__legend");
      ["bright", "steady", "rest"].forEach((t) => {
        const s = mk("span", "ny-cal__lg is-" + t);
        s.append(mk("span", "ny-cal__dot"), document.createTextNode(N.result.legend[t]));
        lg.append(s);
      });
      cal.append(grid, lg);
      const bright = M.items.filter((x) => x.tone === "bright");
      if (bright.length) {
        const br = mk("p", "ny-bright");
        br.append(mk("strong", "", fill(N.result.brightHead, { lens }) + " "), document.createTextNode(bright.slice(0, 4).map((x) => x.label.replace(/ · .*$/, "")).join(" · ")));
        cal.append(br);
      }
      if (M.days) {
        const dh = mk("p", "ny-days");
        dh.append(mk("strong", "", N.result.dayHead + " "), document.createTextNode(M.days.length ? M.days.map((x) => `${x.m}월 ${x.d}일`).join(" · ") : N.result.dayNone));
        cal.append(dh);
      }
      if (M.foot) cal.append(mk("p", "ny-foot", M.foot));
      resScr.append(cal);
      // 유료: 상세 풀이
      const det = mk("section", "ny-card ny-detail");
      det.dataset.room = M.room;
      det.dataset.js = "ny-detail";
      det.append(mk("h2", "ny-card__head ny-detail__title", N.result.detailHead));
      resScr.append(det);
      paintDetail(det);
      // 결제 전: 결과 끝 다음 안내(무료 한 방 더 / 남은 방 모두 열기)
      if (!paid()) {
        const more = mk("section", "ny-card ny-more");
        more.dataset.js = "ny-more";
        if (readFree().length < FREE_MAX) more.append(mk("h2", "ny-card__head", N.result.moreOneHead), mk("p", "ny-p", N.result.moreOneBody));
        else {
          more.append(mk("h2", "ny-card__head", N.result.moreHead), mk("p", "ny-p", N.result.moreBody));
          const mb = mk("button", "btn btn--primary btn--block", N.result.moreBtn);
          mb.type = "button";
          mb.dataset.js = "ny-more-btn";
          mb.addEventListener("click", () => gate(null, "more"));
          more.append(mb);
        }
        resScr.append(more);
      }
      // 나가기
      const acts = mk("div", "ny-acts");
      const back = mk("button", "btn btn--block " + (resScr.querySelector("[data-js=ny-more-btn]") ? "btn--secondary" : "btn--primary"), N.result.back); // 결제 안내 버튼이 있으면 한 단계 낮춘다
      back.type = "button";
      back.dataset.js = "ny-back";
      back.addEventListener("click", () => C.go("ny-hub"));
      acts.append(back);
      if (M.room === "rune" || M.room === "sibyl") {
        const again = mk("button", "btn btn--ghost btn--block", N.result.redraw);
        again.type = "button";
        again.addEventListener("click", () => openRoom(M.room));
        acts.append(again);
      }
      resScr.append(acts);
    }
    C.enter["ny-result"] = () => {
      if (!model) return C.go("ny-hub", { replace: true });
      renderResult();
      C.track("so_ny", { step: "result", room: model.room });
    };

    function paintDetail(det) {
      const M = model;
      [...det.children].slice(1).forEach((n) => n.remove());
      if (!paid() && isFree(M.room)) {
        // 무료로 고른 방: 그 방·그 결과 번호의 상세 풀이 조각만 받는다(코드 없음)
        det.classList.remove("is-locked");
        const wait = mk("p", "ny-wait", N.result.loading);
        det.append(wait);
        const key = M.room + "|" + JSON.stringify(M.k);
        (freeCache[key] ? Promise.resolve(freeCache[key]) : C.nyFree(M.room, M.k)).then((data) => {
          freeCache[key] = data;
          if (model !== M) return;
          wait.remove();
          renderPaid(det, data);
        }).catch(() => {
          wait.textContent = N.result.fail;
          const r = mk("button", "btn btn--secondary btn--small", N.result.retry);
          r.type = "button";
          r.addEventListener("click", () => paintDetail(det));
          det.append(r);
        });
        return;
      }
      if (!paid()) {
        det.classList.add("is-locked");
        const box = mk("div", "ny-lock");
        box.append(mk("p", "ny-lock__head", N.result.lockHead));
        const ul = mk("ul", "ny-lock__list");
        N.result.lockList.forEach((t) => ul.append(mk("li", "", t)));
        const btn = mk("button", "btn btn--primary btn--block", N.result.lockBtn);
        btn.type = "button";
        btn.dataset.js = "ny-lock-btn";
        btn.addEventListener("click", () => {
          C.track("so_ny", { step: "lock", room: M.room });
          gate(M.room);
        });
        box.append(ul, btn, mk("p", "ny-lock__note", N.result.lockNote));
        det.append(box);
        return;
      }
      det.classList.remove("is-locked");
      const wait = mk("p", "ny-wait", N.result.loading);
      det.append(wait);
      C.loadPaid("ny").then(() => {
        wait.remove();
        const B = (window.BOOK_NY || {})[M.room];
        if (!B) throw new Error("no data");
        renderPaid(det, B);
        C.track("so_ny", { step: "open", room: M.room });
      }).catch(() => {
        wait.textContent = N.result.fail;
        const r = mk("button", "btn btn--secondary btn--small", N.result.retry);
        r.type = "button";
        r.addEventListener("click", () => paintDetail(det));
        det.append(r);
      });
    }
    const freeCache = {}; // 무료 조각(메모리만)
    const paras = (v) => (Array.isArray(v) ? v : [v]).filter(Boolean);
    function sec(det, title, nodes) {
      const s = mk("section", "ny-sec");
      s.append(mk("h3", "ny-sec__head", title));
      nodes.forEach((n) => s.append(n));
      det.append(s);
    }
    // (2026-11-12 시안) 새 구조 완성본: 첫마디 · 지난해 · 한 해의 결 · 재물·연애·건강 · 열두 달 · 마음 쓰일 일 · 한 가지 · 행운 표식
    function renderFull(det, F) {
      const M = model, L = N.result.full;
      const hook = mk("div", "ny-hook");
      hook.dataset.room = M.room;
      hook.innerHTML = `<svg class="ny-hook__fig" viewBox="0 0 48 64" aria-hidden="true"><use href="#guide-${M.room}" /></svg>`;
      const hb = mk("div", "ny-hook__body");
      hb.append(mk("p", "ny-hook__by", fill(L.hookBy, { guide: T.rooms[M.room].short || "" })), mk("p", "ny-hook__say", F.hook || ""));
      hook.append(hb);
      det.append(hook);
      if (F.past) sec(det, L.pastHead[M.room] || L.pastHead.def, paras(F.past).map((t) => mk("p", "ny-p", t)));
      if (F.year) sec(det, N.result.yearHead, paras(F.year).map((t) => mk("p", "ny-p", t)));
      const g = mk("div", "ny-fortunes");
      ["wealth", "love", "health"].forEach((k) => {
        if (!F[k]) return;
        const c = mk("article", "ny-fortune ny-fortune--" + k);
        c.append(mk("h4", "ny-fortune__head", L[k]), mk("p", "ny-p", F[k]));
        g.append(c);
      });
      if (g.children.length) sec(det, L.fortunesHead, [g]);
      const ol = mk("ol", "ny-flow");
      M.items.forEach((it, i) => {
        const t = F.months && F.months[i];
        if (!t) return;
        const li = mk("li", "ny-flow__item is-" + it.tone);
        const h = mk("p", "ny-flow__head");
        h.append(mk("span", "ny-cal__dot"), mk("strong", "", it.label));
        if (it.tag) h.append(mk("span", "ny-flow__tag", it.tag));
        li.append(h, mk("p", "ny-p", t));
        ol.append(li);
      });
      if (ol.children.length) sec(det, N.result.monthsHead, [ol]);
      if (F.worry) sec(det, L.worryHead, [mk("p", "ny-p", F.worry)]);
      if (F.one) sec(det, N.result.oneHead, [mk("p", "ny-p ny-one", F.one)]);
      if (F.lucky) {
        const dl = mk("dl", "ny-lucky");
        ["color", "month", "word"].forEach((k) => {
          if (!F.lucky[k]) return;
          const d = mk("div", "ny-lucky__item");
          d.append(mk("dt", "", L.lucky[k]), mk("dd", "", F.lucky[k]));
          dl.append(d);
        });
        sec(det, L.luckyHead, [dl]);
      }
    }
    function renderPaid(det, B) {
      const M = model;
      if (B.full && B.full[String(M.k.year)]) return renderFull(det, B.full[String(M.k.year)]);
      if (B.year) sec(det, N.result.yearHead, paras(B.year[M.k.year]).map((t) => mk("p", "ny-p", t)));
      if (B.areas && M.k.areas != null && B.areas[M.k.areas]) {
        // (2026-11-04) 방이 비추는 면에 맞는 갈래만(data.js ny.rooms.<방>.areas). 없으면(룬) 네 갈래 모두
        const A = B.areas[M.k.areas];
        const R = N.rooms[M.room];
        const pick = R.areas || ["work", "relation", "learn", "move"].map((k) => ({ k, label: N.result.areas[k] }));
        const dl = mk("dl", "ny-areas");
        pick.forEach(({ k, label }) => {
          if (!A[k]) return;
          dl.append(mk("dt", "", label), mk("dd", "", A[k]));
        });
        sec(det, R.areas ? fill(N.result.lensAreasHead, { lens: R.lens }) : N.result.areasHead, [dl]);
      }
      const ol = mk("ol", "ny-flow");
      M.items.forEach((it) => {
        let t = "";
        if (M.room === "rune") t = it.half === 0 ? "" : (it.half === 1 ? B.summer : B.winter)[it.bank];
        else if (M.room === "ogham") t = B.seasons[M.k.seasons][it.bank];
        else if (M.room === "sibyl") t = B.seasons[M.k.seasons][it.bank];
        else t = B.months[it.bank];
        if (!t) return;
        const li = mk("li", "ny-flow__item is-" + it.tone);
        const h = mk("p", "ny-flow__head");
        h.append(mk("span", "ny-cal__dot"), mk("strong", "", it.label));
        if (it.tag) h.append(mk("span", "ny-flow__tag", it.tag));
        li.append(h, mk("p", "ny-p", t));
        ol.append(li);
      });
      if (ol.children.length) sec(det, M.kind === "months" ? N.result.monthsHead : M.kind === "halves" ? N.result.halvesHead : N.result.seasonsHead, [ol]);
      if (M.days && B.day) sec(det, N.result.dayHead, [mk("p", "ny-p", B.day)]);
      if (B.one && B.one[M.k.one]) sec(det, N.result.oneHead, [mk("p", "ny-p ny-one", B.one[M.k.one])]);
    }

    // ───────── 신년운세 결제 전 화면 (7장: 받는 것·분량·가격·결제 방법·판매자·환불을 결제 전에) ─────────
    //   책 결제 화면과 따로 그린다(다른 상품). 결제창·결제 확인 길(paycheck)·코드 카드는 app.js의 것을 상품 값만 바꿔 같이 쓴다
    const NP = N.pay || {};
    const PT = T.pay || {};
    function renderPay() {
      payScr.textContent = "";
      if (C.payMode === "test") {
        const band = mk("p", "pay-band");
        band.setAttribute("role", "note");
        band.append(mk("span", "pay-band__dot"), mk("span", "", PT.testBand || ""));
        payScr.append(band);
      }
      const head = mk("header", "ny-pay__head");
      head.append(mk("p", "ny-eyebrow", NP.eyebrow), mk("h1", "ny-pay__title", NP.title), mk("p", "ny-pay__lead", readFree().length ? NP.lead : NP.leadFresh));
      payScr.append(head);
      const box = mk("section", "ny-card ny-pay__what");
      box.append(mk("h2", "ny-card__head", NP.whatHead));
      const ul = mk("ul", "ny-pay__list");
      (NP.what || []).forEach((t) => ul.append(mk("li", "", t)));
      box.append(ul, mk("p", "ny-pay__vol", NP.volume), mk("p", "ny-pay__sep", NP.separate));
      const pr = mk("p", "ny-pay__price");
      pr.append(mk("span", "ny-pay__price-k", NP.priceHead), mk("strong", "", NP.price));
      box.append(pr);
      payScr.append(box);
      const act = mk("div", "ny-pay__act");
      act.dataset.js = "ny-pay-act";
      if (paid()) {
        act.append(mk("p", "ny-pay__opened", NP.openedHere));
        const sc = mk("button", "btn btn--secondary btn--block", N.hub.showCode);
        sc.type = "button";
        sc.addEventListener("click", () => C.showCode());
        act.append(sc);
      } else {
        const lab = mk("label", "check pay-agree ny-pay__agree");
        const agree = mk("input");
        agree.type = "checkbox";
        agree.dataset.js = "ny-pay-agree";
        lab.append(agree, mk("span", "", NP.agree));
        const nudge = mk("p", "pay-agree__nudge", PT.agreeNudge || "");
        nudge.hidden = true;
        nudge.setAttribute("role", "alert");
        const buy = mk("button", "btn btn--primary btn--block pay-buy", NP.buy);
        buy.type = "button";
        buy.dataset.js = "ny-pay-buy";
        const sync = () => {
          buy.classList.toggle("is-waiting-agree", !agree.checked);
          if (agree.checked) nudge.hidden = true;
        };
        agree.addEventListener("change", sync);
        sync();
        buy.addEventListener("click", () => {
          if (!agree.checked) {
            nudge.hidden = false;
            lab.classList.remove("is-nudge");
            void lab.offsetWidth;
            lab.classList.add("is-nudge");
            agree.focus({ preventScroll: true });
            return;
          }
          if (!C.startPay()) C.toast(T.toast.loadFail || "");
        });
        act.append(lab, nudge, buy, mk("p", "pay-safe", NP.safe));
      }
      payScr.append(act);
      // 결제 방법·판매자 · 환불 (책과 같은 판매자·결제대행, 환불은 이 상품 문장)
      const more = mk("section", "ny-card ny-pay__terms");
      more.append(mk("h2", "ny-card__head", (PT.method && PT.method.title) || ""), mk("p", "ny-p", (PT.method && PT.method.body) || ""), mk("p", "ny-pay__seller", (PT.method && PT.method.seller) || ""));
      if (PT.method && PT.method.phone) more.append(mk("p", "ny-pay__note", PT.method.phone));
      more.append(mk("h2", "ny-card__head", NP.refundHead), mk("p", "ny-p", NP.refund));
      const rl = mk("a", "text-link", NP.refundLink);
      rl.href = "legal/refund.html";
      more.append(rl);
      const S = PT.seller || {}, L = S.labels || {};
      const dl = mk("dl", "ny-pay__seller-list");
      [["name", S.name], ["phone", S.phone], ["email", S.email], ["address", S.address], ["reg", S.reg], ["pg", S.pg]].forEach(([k, v]) => {
        if (!v) return;
        const d = mk("div", "");
        d.append(mk("dt", "", L[k] || ""), mk("dd", "", v));
        dl.append(d);
      });
      more.append(dl);
      payScr.append(more);
      // 이미 산 분: 신년운세 코드(SNY) 넣기
      if (!paid()) {
        const own = mk("details", "pay-owned ny-pay__owned");
        own.dataset.js = "ny-pay-owned";
        own.append(mk("summary", "pay-owned__toggle", NP.owned));
        const row = mk("div", "receipt-open__row");
        const inp = mk("input", "input receipt-open__input");
        inp.type = "text";
        inp.autocomplete = "off";
        inp.setAttribute("autocapitalize", "characters");
        inp.setAttribute("autocorrect", "off");
        inp.spellcheck = false;
        inp.maxLength = 40;
        inp.placeholder = NP.placeholder;
        inp.dataset.js = "ny-pass-input";
        inp.setAttribute("aria-label", NP.owned);
        const goBtn = mk("button", "btn btn--secondary receipt-open__go", NP.go);
        goBtn.type = "button";
        goBtn.dataset.js = "ny-pass-go";
        row.append(inp, goBtn);
        const help = mk("p", "receipt-open__how", NP.help);
        const err = mk("p", "field__error");
        err.dataset.js = "ny-pass-error";
        err.setAttribute("role", "alert");
        err.hidden = true;
        const msg = (kind) => {
          err.dataset.kind = kind || "";
          err.textContent = kind ? (NP.errors && NP.errors[kind]) || (PT.pass && PT.pass.errors && PT.pass.errors[kind]) || "" : "";
          err.hidden = !kind;
        };
        const submit = () => C.openPass(inp.value, msg, goBtn).then((ok) => ok && (inp.value = ""));
        goBtn.addEventListener("click", submit);
        inp.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          submit();
        });
        own.append(row, help, err);
        payScr.append(own);
      }
      const back = mk("button", "text-link pay-back", "← " + NP.back);
      back.type = "button";
      back.dataset.js = "ny-pay-back";
      back.addEventListener("click", () => C.go("ny-hub"));
      payScr.append(back);
    }
    C.enter["ny-pay"] = () => {
      renderPay();
      C.track("so_ny", { step: "pay_view" });
    };
    // 결제 완료·코드 확인 뒤: 문 앞에서 멈췄던 방이 있으면 그 방으로, 아니면 회랑으로
    function afterPaid() {
      const room = drawn.pending;
      drawn.pending = null;
      writeSes();
      if (ROOMS.includes(room)) return openRoom(room);
      C.go("ny-hub");
    }

    // 결제 확인·코드 입력 뒤 같은 화면에 돌아오면 다시 그린다
    function refresh() {
      const now = C.current();
      if (now === "ny-hub") renderHub();
      else if (now === "ny-pay") renderPay();
      else if (now === "ny-result" && model) renderResult();
    }
    function clear() {
      drawn = {};
      model = null;
      cur = null;
      heard.clear();
      try {
        window.sessionStorage.removeItem(SES);
      } catch (e) {
        /* 무시 */
      }
    }
    return { onScreen, refresh, clear, afterPaid, hub: () => C.go("ny-hub", { replace: true }) };
  }
  window.NewYear = { mount };
})();
