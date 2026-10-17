(function () {
  const DATA = window.DATA;
  const READY = {
    "Letters & language": ["Knows his name when he sees it written", "Points to and names most capital letters", "Names some lowercase letters", "Knows a few letter sounds (a bonus this year)", "Hears when two words rhyme", "Claps the parts of his name", "Listens to a picture book for 10 minutes", "Retells a simple story with picture help"],
    "Math": ["Counts out loud to 20", "Counts up to 10 objects, one touch each", "Knows numbers 0 to 10 when he sees them", "Tells which group has more", "Sorts by color, size or shape", "Continues an AB pattern (red, blue, red, blue)", "Names circle, square, triangle and rectangle", "Compares big/small, long/short, heavy/light"],
    "Hands": ["Holds a crayon with his fingers, not his fist", "Cuts along a straight line", "Traces lines and simple shapes", "Tries to write his name", "Uses a glue stick and tape"],
    "Life & learning": ["Follows 2-step directions", "Takes turns and shares", "Names his feelings (happy, sad, angry, scared)", "Dresses himself with a little help", "Asks questions about the world", "Keeps trying when something is hard"]
  };
  const SUBJ = [["circle", "Morning circle", "5 min", "--c-circle"], ["phonics", "Letters & sounds", "5-10 min", "--c-phon"], ["math", "Math", "10 min", "--c-math"], ["theme", "Theme", "15 min", "--c-theme"], ["read", "Read-aloud", "10 min", "--c-read"], ["write", "Fine motor", "5-10 min", "--c-write"], ["app", "App time", "10-15 min", "--c-app"]];
  const KEY = "pps-state";
  const store = {
    get() { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } }
  };
  let state = Object.assign({ done: {}, parts: {}, ready: {}, cur: 1, start: "", childName: "", tab: "today" }, store.get() || {});
  window.APP_STATE = state;
  // The Windows app serves this page from 127.0.0.1 and also keeps progress in a file on disk.
  const LOCALAPP = location.hostname === "127.0.0.1" && location.port === "47812";
  let syncT = null;
  const save = () => { state.updated = Date.now(); store.set(state); window.APP_STATE = state;
    if (LOCALAPP) { clearTimeout(syncT); syncT = setTimeout(() => fetch("api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) }).catch(() => { }), 400); } };
  const $ = id => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v == null) continue; if (k === "class") e.className = v; else if (k === "style") e.style.cssText = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
    for (const c of kids) if (c != null) e.append(c);
    return e;
  };

  function dateFor(n) {
    if (!state.start) return null;
    const d = new Date(state.start + "T12:00:00"); if (isNaN(d)) return null;
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    let left = n - 1;
    while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left--; }
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  function updateProgress() {
    const c = Object.values(state.done).filter(Boolean).length;
    $("progtxt").textContent = `${c} of 190 days`;
    $("progbar").style.width = (c / 190 * 100) + "%";
  }
  function go(n) { state.cur = Math.max(1, Math.min(190, n)); save(); renderAll(); }

  function buildWeekSel() {
    const s = $("weeksel");
    DATA.weeks.forEach(w => s.append(el("option", { value: w.wk }, `Week ${w.wk} · ${DATA.units[w.unit - 1].name}`)));
    s.addEventListener("change", () => go((parseInt(s.value) - 1) * 5 + 1));
  }
  function renderStrip() {
    const day = DATA.days[state.cur - 1];
    $("weeksel").value = day.wk;
    const strip = $("weekstrip"); strip.replaceChildren();
    for (let i = 0; i < 5; i++) {
      const d = DATA.days[(day.wk - 1) * 5 + i];
      strip.append(el("button", { class: (d.n === day.n ? "cur " : "") + (state.done[d.n] ? "isdone" : ""), "aria-label": `Day ${d.n}, ${d.dow}`, onclick: () => go(d.n) },
        el("small", {}, d.dow.slice(0, 3)), el("b", {}, String(d.n)), el("small", {}, state.done[d.n] ? "done" : "day")));
    }
  }

  function renderDay() {
    const day = DATA.days[state.cur - 1], unit = DATA.units[day.unit - 1], wk = DATA.weeks[day.wk - 1];
    const box = $("day"); box.replaceChildren();
    const date = dateFor(day.n);
    const pages = Materials.forDay(day.n).length;
    box.append(el("div", { class: "dayhead" },
      el("div", { class: "eyebrow" }, `Week ${day.wk} of 38 · Theme ${day.unit}: ${unit.name}`),
      el("h2", {}, `Day ${day.n} · ${day.dow}`),
      el("div", { class: "meta" }, date ? el("span", {}, el("strong", {}, date)) : null,
        el("span", {}, "Letter: ", el("strong", {}, wk.phonics.replace("Letter ", ""))), el("span", {}, "Math: ", el("strong", {}, day.math[0]))),
      el("div", { class: "printcta" }, el("span", {}, `🖨️ ${pages} printable pages for today`), el("button", { class: "btn primary", onclick: () => showTab("print") }, "Open printables"))));
    if (day.dow === "Monday" && day.wk % 2 === 1) {
      box.append(el("div", { class: "check", style: "margin:0 0 12px" }, el("h3", {}, `New theme: ${unit.name}`),
        el("p", {}, el("strong", {}, "Gather this fortnight: "), unit.supplies),
        el("p", { class: "small" }, "Book ideas (library or free online): " + unit.books.join("; "))));
    }
    const parts = state.parts[day.n] || {};
    const content = {
      circle: ["Calendar, weather & song", [`Say the day, date and month. Check the weather. Count school days: today is Day ${day.n}!`, `Song: ${unit.song}`]],
      phonics: [day.phonics[0], [day.phonics[1]]], math: [day.math[0], [day.math[1]]], theme: [day.theme[0], [day.theme[1]]],
      read: [day.read[0], [day.read[1]]], write: ["Hands-on skills", [day.write]], app: ["Screen practice", [day.app]],
    };
    const blocks = el("div", { class: "blocks" });
    for (const [key, label, mins, color] of SUBJ) {
      const c = content[key];
      const tick = el("input", { type: "checkbox", class: "tick", id: `p-${day.n}-${key}`, "aria-label": `${label} done` });
      tick.checked = !!parts[key];
      const blk = el("div", { class: "block" + (tick.checked ? " checked" : ""), style: `--c:var(${color})` }, tick,
        el("div", { class: "body" }, el("div", { class: "lab" }, el("span", { class: "subj" }, key === "theme" ? `${label} · ${c[0]}` : label), el("span", { class: "mins" }, mins)),
          key === "theme" ? null : el("h3", {}, c[0]), ...c[1].map((t, i) => el("p", { class: key === "circle" && i === 1 ? "note" : null }, t))));
      tick.addEventListener("change", () => {
        state.parts[day.n] = state.parts[day.n] || {}; state.parts[day.n][key] = tick.checked;
        blk.classList.toggle("checked", tick.checked);
        if (SUBJ.every(s => state.parts[day.n][s[0]]) && !state.done[day.n]) { state.done[day.n] = true; save(); renderAll(); return; }
        save();
      });
      blocks.append(blk);
    }
    const g = el("details", { class: "guidebox" }, el("summary", {}, "📘 Teaching guide for today: what to say, ask and watch for"));
    const gb = el("div", { class: "sheet-guide" }); gb.innerHTML = Materials.guideHTML(day.n); g.append(gb);
    box.append(g);
    box.append(blocks);
    if (day.check) box.append(el("div", { class: "check" }, el("h3", {}, "Friday check-in"), el("p", {}, day.check)));
    box.append(el("div", { class: "dayfoot" }, el("button", {
      class: "btn markday" + (state.done[day.n] ? " isdone" : ""), onclick: () => {
        state.done[day.n] = !state.done[day.n]; if (state.done[day.n] && day.n < 190) state.cur = day.n + 1; save(); renderAll(); window.scrollTo({ top: 0 });
      }
    }, state.done[day.n] ? "Day done ✓ (tap to undo)" : "Mark day done"), el("span", { class: "small" }, `${190 - day.n} days to go after today`)));
  }

  // ---- printables ----
  function fitSheets(container) {
    container.querySelectorAll(".sheetframe").forEach(f => { const w = f.clientWidth; f.style.setProperty("--z", (w / 816).toFixed(4)); f.style.height = (w / 816 * 1056) + "px"; });
  }
  function sheetList(container, pages, label) {
    container.replaceChildren();
    pages.forEach((p, i) => {
      const frame = el("div", { class: "sheetframe" }); frame.innerHTML = p.html;
      container.append(el("div", { class: "sheetitem" },
        el("div", { class: "sh" }, el("b", {}, `${i + 1}. ${p.title}`), el("button", { class: "btn", onclick: () => doPrint([p]) }, "Print this page")), frame));
    });
    requestAnimationFrame(() => fitSheets(container));
  }
  function renderPrint() {
    const day = DATA.days[state.cur - 1];
    $("printtitle").textContent = `Day ${day.n} printables`;
    $("printsub").textContent = `Week ${day.wk} · ${day.dow} · ${DATA.units[day.unit - 1].name}`;
    sheetList($("sheets"), Materials.forDay(day.n));
  }
  const BRIDGE = window.AndroidBridge || null;
  function alertBox(msg) {
    let b = document.getElementById("toast");
    if (!b) { b = el("div", { id: "toast", role: "status", style: "position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:20;background:var(--ink);color:var(--bg);padding:12px 14px;border-radius:12px;font-weight:600;max-width:560px;margin:0 auto" }); document.body.append(b); }
    b.textContent = msg; b.hidden = false; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 6000);
  }
  function doPrint(pages) {
    const root = $("printroot"); root.innerHTML = pages.map(p => p.html).join("");
    let embedded = false; try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
    if (embedded && !BRIDGE) { alertBox("Printing isn't available in this preview. Open Mom Academy on your phone (Android app) or computer (Windows app) to print."); return; }
    if (BRIDGE) { setTimeout(() => BRIDGE.print("Mom Academy - " + (pages.length === 1 ? pages[0].title : pages.length + " pages")), 200); return; }
    const done = () => { root.innerHTML = ""; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => window.print(), 150);
  }

  function renderYear() {
    const tb = document.querySelector("#yeartable tbody"); tb.replaceChildren();
    let last = 0;
    DATA.weeks.forEach(w => {
      if (w.unit !== last) { last = w.unit; tb.append(el("tr", { class: "unitrow" }, el("td", { colspan: "4" }, `Theme ${w.unit}: ${DATA.units[w.unit - 1].name}`))); }
      const s = (w.wk - 1) * 5 + 1, done = [0, 1, 2, 3, 4].every(i => state.done[s + i]);
      tb.append(el("tr", { class: "wk", tabindex: "0", onclick: () => { go(s); showTab("today"); }, onkeydown: e => { if (e.key === "Enter") { go(s); showTab("today"); } } },
        el("td", {}, `Week ${w.wk} `, done ? el("span", { class: "pill" }, "done") : null), el("td", {}, `${s}–${s + 4}`), el("td", {}, w.phonics.replace("Letter ", "")), el("td", {}, w.math)));
    });
  }
  function renderReady() {
    const g = $("readygrid"); g.replaceChildren();
    for (const [area, items] of Object.entries(READY)) {
      const ul = el("ul", { class: "checks" });
      items.forEach((t, i) => {
        const id = `r-${area}-${i}`.replace(/\W/g, "_");
        const cb = el("input", { type: "checkbox", id }); cb.checked = !!state.ready[id];
        cb.addEventListener("change", () => { state.ready[id] = cb.checked; save(); });
        ul.append(el("li", {}, el("label", { for: id }, cb, el("span", {}, t))));
      });
      g.append(el("div", { class: "card" }, el("h3", { style: "margin-top:0" }, area), ul));
    }
  }
  function renderSched() { const s = $("sched"); s.replaceChildren(); SUBJ.forEach(([k, label, mins, color]) => s.append(el("div", { style: `--c:var(${color})` }, el("b", {}, label), el("span", {}, mins)))); }

  function showTab(t) {
    state.tab = t; store.set(state);
    document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"));
    document.querySelectorAll("section.panel").forEach(s => s.hidden = s.id !== "tab-" + t);
    const dayTabs = t === "today" || t === "print";
    $("daycontrols").hidden = !dayTabs; $("weekstrip").hidden = !dayTabs;
    if (t === "print") renderPrint();
    if (t === "year") renderYear();
    if (t === "kit" && !$("kitsheets").childElementCount) sheetList($("kitsheets"), Materials.kit());
    window.scrollTo({ top: 0 });
  }
  function renderAll() {
    updateProgress(); renderStrip(); renderDay();
    if (state.tab === "print") renderPrint();
  }

  // ---- wiring ----
  document.querySelectorAll("nav.tabs button").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("prev").onclick = () => go(state.cur - 1);
  $("next").onclick = () => go(state.cur + 1);
  $("gotoNext").onclick = () => { let n = 1; while (n < 190 && state.done[n]) n++; go(n); };
  $("printday").onclick = () => doPrint(Materials.forDay(state.cur));
  $("printweek").onclick = () => { const w = DATA.days[state.cur - 1].wk; let p = []; for (let i = 0; i < 5; i++) p = p.concat(Materials.forDay((w - 1) * 5 + 1 + i)); doPrint(p); };
  $("printkit").onclick = () => doPrint(Materials.kit());
  // appearance: automatic / light / dark
  function applyTheme() {
    const t = state.theme === "light" || state.theme === "dark" ? state.theme : "auto";
    if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    document.querySelectorAll("#themeseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.themeChoice === t ? "true" : "false"));
    const dark = t === "dark" || (t === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? "#11161e" : "#2557a7";
  }
  document.querySelectorAll("#themeseg button").forEach(b => b.addEventListener("click", () => { state.theme = b.dataset.themeChoice; store.set(state); applyTheme(); }));
  if (window.matchMedia) { const mq = matchMedia("(prefers-color-scheme: dark)"); (mq.addEventListener ? mq.addEventListener("change", applyTheme) : mq.addListener(applyTheme)); }
  applyTheme();
  const nm = $("childname"); nm.value = state.childName || "";
  nm.addEventListener("input", () => { state.childName = nm.value.slice(0, 20); save(); });
  const sd = $("startdate"); sd.value = state.start || "";
  sd.addEventListener("change", () => { state.start = sd.value; save(); renderAll(); });
  $("cleardate").onclick = () => { state.start = ""; sd.value = ""; save(); renderAll(); };
  $("exportbtn").onclick = () => {
    const fname = `preschool-progress-${new Date().toISOString().slice(0, 10)}.json`;
    if (BRIDGE) { BRIDGE.share(JSON.stringify(state, null, 1), fname); $("backupmsg").textContent = "Choose where to save the backup (Drive, Files, email…)."; return; }
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: fname });
    document.body.append(a); a.click(); a.remove();
    $("backupmsg").textContent = "Backup file saved to your Downloads.";
  };
  $("importfile").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const s = JSON.parse(t); if (!s || typeof s.done !== "object") throw new Error("bad");
      state = Object.assign({ done: {}, parts: {}, ready: {}, cur: 1, start: "", childName: "", tab: "setup" }, s); save();
      nm.value = state.childName || ""; sd.value = state.start || ""; renderReady(); renderAll();
      $("backupmsg").textContent = "Progress restored.";
    }).catch(() => { $("backupmsg").textContent = "That file isn't a backup from this app. Choose the .json file you saved before."; });
    e.target.value = "";
  });
  $("resetbtn").onclick = () => { $("resetconfirm").hidden = false; };
  $("resetno").onclick = () => { $("resetconfirm").hidden = true; };
  $("resetyes").onclick = () => { state.done = {}; state.parts = {}; state.ready = {}; state.cur = 1; save(); $("resetconfirm").hidden = true; renderReady(); renderAll(); };
  window.addEventListener("resize", () => { document.querySelectorAll(".sheets").forEach(fitSheets); });

  // install prompt (Android Chrome, desktop Edge/Chrome)
  let deferred = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; $("installcard").hidden = false; });
  $("installbtn").onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => { }); deferred = null; $("installcard").hidden = true; };
  if (!BRIDGE && !LOCALAPP && "serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });

  buildWeekSel(); renderSched(); renderReady(); renderAll(); showTab(state.tab || "today");
  if (LOCALAPP) {
    fetch("api/state").then(r => r.ok ? r.json() : null).then(s => {
      if (s && s.done && (s.updated || 0) >= (state.updated || 0)) { state = Object.assign(state, s); store.set(state); window.APP_STATE = state; nm.value = state.childName || ""; sd.value = state.start || ""; renderReady(); renderAll(); }
      else if (state.updated) save();
    }).catch(() => { });
    const ping = () => fetch("api/ping", { method: "POST" }).catch(() => { }); ping(); setInterval(ping, 20000);
  }
})();
