/* Printable study materials for all 190 days.
   Every page is a US Letter sheet (8.5 x 11 in). Pages are built from the week's data:
   letter of the week, theme, math focus and the day's lesson. */
(function () {
  const D = window.DATA;
  const M = D.mat;
  const INK = "#1d2a3a", SOFT = "#8794a5";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // deterministic random so the same day always prints the same page
  function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

  const emo = (e, size) => `<span class="emo" style="font-size:${size}">${e}</span>`;
  const childName = () => (window.APP_STATE && window.APP_STATE.childName || "").trim();

  function sheet(ctx, title, sub, body, note, opts = {}) {
    return {
      title,
      html: `<div class="sheet ${opts.cls || ""}"><header><div class="tag">Week ${ctx.wk} · Day ${ctx.n} · ${esc(ctx.dow)}</div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ""}</header>
<div class="sbody">${body}</div>${note ? `<div class="snote">${note}</div>` : ""}<footer>Mom Academy · Theme ${ctx.unit}: ${esc(ctx.theme)} · Letter ${ctx.L}${ctx.l}</footer></div>`
    };
  }

  // ---------- shapes ----------
  const shapePath = {
    circle: `<circle cx="0" cy="0" r="80"/>`,
    square: `<rect x="-78" y="-78" width="156" height="156"/>`,
    triangle: `<polygon points="0,-86 90,72 -90,72"/>`,
    rectangle: `<rect x="-98" y="-60" width="196" height="120"/>`,
    oval: `<ellipse cx="0" cy="0" rx="62" ry="88"/>`,
    star: (() => { let p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 38 : 88; p.push((Math.cos(a) * r).toFixed(1) + "," + (Math.sin(a) * r + 6).toFixed(1)); } return `<polygon points="${p.join(" ")}"/>`; })(),
    heart: `<path d="M0,78 C-40,44 -92,14 -92,-28 C-92,-62 -64,-82 -40,-82 C-20,-82 -6,-70 0,-54 C6,-70 20,-82 40,-82 C64,-82 92,-62 92,-28 C92,14 40,44 0,78 Z"/>`,
    diamond: `<polygon points="0,-92 66,0 0,92 -66,0"/>`,
    cross: `<path d="M0,-80 L0,80 M-80,0 L80,0"/>`,
    x: `<path d="M-70,-70 L70,70 M70,-70 L-70,70"/>`,
  };
  function shapeSVG(name, size, style = "solid", sw = 5) {
    const dash = style === "dash" ? `stroke-dasharray="12 10"` : "";
    return `<svg viewBox="-100 -100 200 200" width="${size}" height="${size}"><g fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${dash}>${shapePath[name]}</g></svg>`;
  }
  const traceText = (txt, fontPx, w, h, y) =>
    `<svg viewBox="0 0 ${w} ${h}" width="100%"><text x="${w / 2}" y="${y || h * 0.8}" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="700" font-size="${fontPx}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-dasharray="11 9" stroke-linecap="round">${esc(txt)}</text></svg>`;

  // ---------- context ----------
  function ctxFor(n) {
    const day = D.days[n - 1], wk = day.wk, wi = wk - 1;
    const L = M.letters[wi], unitIdx = day.unit - 1;
    const known = []; M.letters.slice(0, wi + 1).forEach(x => { if (!known.includes(x)) known.push(x); });
    return {
      n, day, wk, wi, dow: day.dow, d: (n - 1) % 5, uw: wi % 2, unit: day.unit, unitIdx,
      theme: D.units[unitIdx].name, themeData: M.themes[unitIdx], L, l: L.toLowerCase(),
      isNew: M.letters.indexOf(L) === wi, known, phase: wi < 8 ? 0 : wi < 20 ? 1 : wi < 30 ? 2 : 3,
      nums: M.nums[wi], song: D.units[unitIdx].song
    };
  }

  // ---------- page builders ----------
  function sortPage(c) {
    const s = M.sorts[c.wi];
    if (s.type === "size") return sizePage(c, s.emoji, s.word, s.title);
    if (s.type === "colors") {
      const mats = s.colors.map(([n, col]) => `<div class="cmat"><div class="cmhead"><span class="dot" style="background:${col}"></span>${esc(n)}</div><div class="space">Put ${esc(n.toLowerCase())} things here</div></div>`).join("");
      return sheet(c, s.title, "Math · Sorting", `<div class="cmats">${mats}</div>`, "Color each dot first if you print in black and white. Then sort toy cars, blocks or crayons onto the matching color. Ask: Which group has the most?");
    }
    if (s.type === "buttons") {
      const btn = h => `<svg viewBox="-50 -50 100 100" width="1.2in" height="1.2in"><circle r="42" fill="none" stroke="${INK}" stroke-width="4"/>${(h === 2 ? [[-10, 0], [10, 0]] : [[-10, -10], [10, -10], [-10, 10], [10, 10]]).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${INK}" stroke-width="3.5"/>`).join("")}</svg>`;
      const r = rng(c.n), cards = Array.from({ length: 12 }, () => r() < 0.5 ? 2 : 4).map(h => `<div class="cut">${btn(h)}</div>`).join("");
      return sheet(c, s.title, "Math · Sorting", `<div class="sorthead two"><div>2 holes</div><div>4 holes</div></div><div class="cutgrid g4">${cards}</div>`, "Cut out the paper buttons (or use real ones). He counts the holes and sorts them under 2 holes or 4 holes. Count each pile: which has more?");
    }
    if (s.type === "pairs") {
      const r = rng(c.n + 7), right = s.pairs.map(p => p[1]).sort(() => r() - 0.5);
      const rows = s.pairs.map((p, i) => `<div class="prow"><div class="pc">${emo(p[0][1], "0.8in")}<b>${esc(p[0][0])}</b></div><div class="pdots"><i></i><i></i></div><div class="pc">${emo(right[i][1], "0.8in")}<b>${esc(right[i][0])}</b></div></div>`).join("");
      return sheet(c, s.title, "Math · Things that go together", `<div class="pairs">${rows}</div>`, "Draw a line from each picture to the one it goes with. Then talk about why they go together.");
    }
    if (s.type === "shapes") {
      const names = ["circle", "square", "triangle"], r = rng(c.n);
      const cards = Array.from({ length: 12 }, (_, i) => names[i % 3]).sort(() => r() - 0.5).map(n => `<div class="cut">${shapeSVG(n, "1.05in", "solid", 7)}</div>`).join("");
      return sheet(c, s.title, "Math · Sorting", `<div class="sorthead three">${names.map(n => `<div>${shapeSVG(n, "0.5in", "solid", 10)} ${n}</div>`).join("")}</div><div class="cutgrid g4">${cards}</div>`, "Cut out the shapes, mix them up and sort them under circle, square or triangle. Count each group.");
    }
    if (s.type === "floatsink") return floatSink(c, s.items, s.title);
    // categories
    const items = []; s.cats.forEach(cat => cat.items.forEach(it => items.push(it)));
    const r = rng(c.n); items.sort(() => r() - 0.5);
    const cls = s.cats.length === 3 ? "three" : "two";
    const cards = items.map(([w, e]) => `<div class="cut">${emo(e, "0.85in")}<b>${esc(w)}</b></div>`).join("");
    return sheet(c, s.title, "Math · Sorting", `<div class="sorthead ${cls}">${s.cats.map(k => `<div>${esc(k.name)}</div>`).join("")}</div><div class="cutgrid g4">${cards}</div>`,
      `Cut out the picture cards. He sorts each one under the right heading and tells you why. Ask: Which group has the most? Answers: ${s.cats.map(k => `<b>${esc(k.name)}</b>: ${k.items.map(i => esc(i[0])).join(", ")}`).join("; ")}.`);
  }

  function sizePage(c, e, word, title) {
    const sizes = [["small", "0.9in"], ["medium", "1.5in"], ["large", "2.3in"]];
    const top = sizes.map(([n, s]) => `<div class="szc">${emo(e, s)}<b>${n}</b></div>`).join("");
    const mix = [2, 0, 1].map(i => `<div class="szc cut">${emo(e, sizes[i][1])}</div>`).join("");
    return sheet(c, title || "Small, medium, large", "Math · Comparing size", `<div class="sizes">${top}</div><div class="sizes mix">${mix}</div>`,
      `Top row: say the size words together. Bottom row: cut out the 3 ${esc(word)}s, mix them up and he lines them up from small to large. Then do it with real things from home.`);
  }

  function floatSink(c, items, title) {
    const rows = items.map(([w, e]) => `<tr><td class="it">${emo(e, "0.55in")}<b>${esc(w)}</b></td><td><span class="bx"></span>float <span class="bx"></span>sink</td><td><span class="bx"></span>float <span class="bx"></span>sink</td></tr>`).join("");
    return sheet(c, title || "Float or sink?", "Science · Predict and test", `<table class="grid fs"><thead><tr><th>Thing</th><th>I think it will…</th><th>It did…</th></tr></thead><tbody>${rows}</tbody></table>`,
      "He guesses first and you tick the I think box. Test it in a bowl of water and tick what happened. Wrong guesses are great: \"We thought it would sink, but it floated! Scientists learn by testing.\"");
  }

  function vocabCards(c) {
    const cards = c.themeData.words.map(([w, e]) => `<div class="cut tall">${emo(e, "1.2in")}<b>${esc(w)}</b></div>`).join("");
    return sheet(c, `${c.theme} word cards`, "Theme · Talk about it", `<div class="cutgrid g2x4">${cards}</div>`,
      "Cut the cards apart. Use them to talk about the theme, play I Spy, or hide them for a hunt. Keep them in an envelope for this theme.");
  }
  function songCard(c) {
    return sheet(c, "Song for this theme", "Morning circle", `<div class="song">${emo(c.themeData.counter, "1in")}<p>${esc(c.song)}</p></div>`,
      "Hang it on the fridge for the next two weeks and sing it after calendar time each day.");
  }
  function drawTheme(c) {
    return sheet(c, `What I know about ${c.theme.toLowerCase()}`, "Theme · Draw and tell", `<div class="dbox big"></div><div class="lines">${'<div class="ln"></div>'.repeat(3)}</div>`,
      "He draws something he knows about this theme. He tells you about it and you write his words on the lines.");
  }

  function letterCard(c) {
    const [kw, ke] = M.letterPics[c.L];
    const info = M.letterInfo[c.L];
    return sheet(c, c.isNew ? `Meet the letter ${c.L}${c.l}` : `Letter ${c.L}${c.l} again`, "Letters · Letter of the week",
      `<div class="lettercard"><span>${c.L === "Q" ? "Q" : c.L}</span><span>${c.l}</span></div><div class="kw">${emo(ke, "1.3in")}<div><b>${c.L} is for ${esc(kw)}</b><br><span>${esc(c.L)} ${esc(info)}.</span></div></div>`,
      "Put this card on the wall for the week. The main goal this year is knowing what the letter looks like and its name. Saying the sound is a bonus.");
  }
  function huntCards(c) {
    const cards = [c.L, c.l, c.L, c.l, c.L, c.l, c.L, c.l].map(x => `<div class="cut hunt"><span>${x}</span></div>`).join("");
    return sheet(c, `Letter ${c.L} hunt cards`, "Letters · Hide and find", `<div class="cutgrid g2x4">${cards}</div>`,
      `Cut out the 8 cards and hide them around the room. He hunts for them (with a flashlight if you like) and says "I found ${c.L}!" each time. Count them at the end. Did he find all 8?`);
  }
  function numberCards(c) {
    let [lo, hi] = c.nums; if (hi - lo + 1 > 6) lo = hi - 5;
    const cards = [];
    for (let k = lo; k <= hi; k++) {
      const dots = k <= 10 ? `<div class="dots">${"<i></i>".repeat(k)}</div>` : `<div class="tenf">${"<i class=f></i>".repeat(10)}</div><div class="dots sm">${"<i></i>".repeat(k - 10)}</div>`;
      cards.push(`<div class="cut ncard"><div class="num">${k}</div>${k === 0 ? '<div class="zero">none</div>' : dots}</div>`);
    }
    while (cards.length % 2) cards.push(`<div class="cut ncard"></div>`);
    return sheet(c, `Number cards ${lo}–${hi}`, "Math · Numbers", `<div class="cutgrid g2">${cards.join("")}</div>`,
      "Cut the cards apart. Read the number together, count the dots, and put that many real things beside the card. Keep the cards in an envelope.");
  }
  function framePage(c) {
    const hi = c.nums[1], n = hi <= 5 ? 5 : hi <= 10 ? 10 : 20;
    const frame = k => `<div class="frame f${k}">${'<div></div>'.repeat(k)}</div>`;
    const body = n === 5 ? frame(5) : n === 10 ? frame(10) : frame(10) + frame(10);
    return sheet(c, n === 5 ? "Five frame" : n === 10 ? "Ten frame" : "Two ten frames", "Math · Counting", `<div class="frames">${body}</div>`,
      `Call out a number up to ${hi}. He puts that many counters in the boxes, one per box, filling from the left. Count together, touching each one. Ask: How many empty boxes are left?`);
  }
  function counters(c) {
    const e = c.themeData.counter;
    return sheet(c, "Picture counters", "Math · Cut out to count with", `<div class="cutgrid g5">${`<div class="cut">${emo(e, "0.8in")}</div>`.repeat(20)}</div>`,
      "Cut out the counters and keep them in an envelope. Use them with the frames and number cards when you don't have real objects.");
  }
  function letterTrace(c) {
    return sheet(c, `Build ${c.L} and ${c.l}`, "Letters · Playdough and finger tracing", `<div class="two-trace">${traceText(c.L, 400, 300, 430)}${traceText(c.l, 400, 300, 430)}</div>`,
      `Roll playdough snakes and lay them on the dashed lines to build ${c.L} and ${c.l}. Then trace with a finger, saying "${c.L}, ${c.L}, ${c.L}".`);
  }
  function startsWith(c) {
    const yes = M.letterPics[c.L][2].slice(0, 4);
    const pool = []; Object.keys(M.letterPics).forEach(k => { if (k !== c.L) M.letterPics[k][2].forEach(p => pool.push(p)); });
    const r = rng(c.n * 3), no = [];
    while (no.length < 4) { const p = pool[Math.floor(r() * pool.length)]; if (!no.includes(p) && !yes.includes(p) && p[0][0].toUpperCase() !== c.L && !(c.L === "X" && /x$/.test(p[0]))) no.push(p); }
    const all = yes.concat(no).sort(() => r() - 0.5);
    const ending = M.ending.includes(c.L);
    const head = ending ? [`Has the ${c.l} sound`, "Does not"] : [`Starts with ${c.L}`, "Does not"];
    const cards = all.map(([w, e]) => `<div class="cut">${emo(e, "0.85in")}<b>${esc(w)}</b></div>`).join("");
    return sheet(c, ending ? `Do you hear ${c.l}?` : `Does it start with ${c.L}?`, "Letters · Picture sort",
      `<div class="sorthead two"><div>${head[0]}</div><div>${head[1]}</div></div><div class="cutgrid g4">${cards}</div>`,
      `Cut out the cards. Say each word slowly, stretching the first sound. He sorts them into the two piles. Answers: ${yes.map(y => esc(y[0])).join(", ")}${ending ? " have the x sound (at the end)" : ` start with ${c.L}`}.`);
  }
  function alphabetPage(c) {
    const ideas = M.letterPics[c.L][2].map(p => `<span>${emo(p[1], "0.6in")}<small>${esc(p[0])}</small></span>`).join("");
    return sheet(c, `${c.L} ${c.l}`, "My alphabet book", `<div class="abook">${traceText(`${c.L} ${c.l}`, 230, 600, 260)}<div class="ideas">${ideas}</div><div class="draw">Draw or glue things that start with ${c.L}</div></div>`,
      "Add this page to his alphabet book folder. He colors the letters, then draws or glues pictures from flyers of things that start with this letter.");
  }
  function letterMatch(c) {
    const ks = c.known.slice(-6), r = rng(c.n);
    const cards = ks.flatMap(k => [k, k.toLowerCase()]).sort(() => r() - 0.5).map(x => `<div class="cut mem"><span>${x}</span></div>`).join("");
    return sheet(c, "Letter match game", "Letters · Review", `<div class="cutgrid g4">${cards}</div>`,
      `Cut out the cards. Play memory: turn them face down and take turns flipping two. A big letter and its small letter make a pair. Letters: ${ks.join(", ")}.`);
  }
  function shapePage(c) {
    const s = M.friShape[c.wi];
    if (s === "mix" || s === "mix3d") {
      const names = ["circle", "square", "triangle", "rectangle", "oval", "star", "heart", "diamond"];
      const cells = names.map(n => `<div class="shc">${shapeSVG(n, "1.35in", "dash", 5)}<b>${n}</b></div>`).join("");
      return sheet(c, s === "mix3d" ? "Flat shapes we know" : "Shape review", "Math · Shapes", `<div class="shgrid">${cells}</div>`,
        s === "mix3d" ? "Trace each flat shape. Then find solid shapes at home: a ball is a sphere, a box is a cube, a can is a cylinder. Which flat shape is on the side of a box?" : "Trace each shape and say its name. Color the circles red, the squares blue and the triangles yellow. Then find one of each at home.");
    }
    return sheet(c, `The ${s}`, "Math · Shape of the week", `<div class="bigshape">${shapeSVG(s, "4.6in", "dash", 4)}</div><div class="smallshapes">${[0, 1, 2].map(() => shapeSVG(s, "1.5in", "dash", 5)).join("")}</div>`,
      `Start anywhere on the dashed line and trace the ${s} with a finger, then a crayon. Count the sides and corners together. Then hunt for ${s}s around the house.`);
  }
  function countColor(c) {
    const [lo, hi] = c.nums, top = Math.min(hi, 10), r = rng(c.n * 5), e = c.themeData.counter;
    const rows = Array.from({ length: 5 }, () => {
      const k = Math.max(1, Math.min(top, lo + Math.floor(r() * (top - lo + 1))));
      const opts = new Set([k]); while (opts.size < 3) opts.add(Math.max(0, Math.min(top + 1, k + Math.floor(r() * 5) - 2)));
      const o = [...opts].sort((a, b) => a - b);
      return `<div class="ccrow"><div class="ccpics">${emo(e, "0.5in").repeat(k)}</div><div class="ccopts">${o.map(x => `<span>${x}</span>`).join("")}</div></div>`;
    }).join("");
    return sheet(c, "Count and circle", "Math · Review", `<div class="cc">${rows}</div>`, "Touch and count the pictures in each row. Circle the matching number. Let him check by counting again.");
  }
  function retell(c) {
    const book = (c.day.read && c.day.read[0] || "").replace(/^Retell$/, "our favorite book this week");
    return sheet(c, "Retell the story", "Read-aloud · First, next, last", `<div class="seq">${["First", "Next", "Last"].map(t => `<div><b>${t}</b><div class="dbox"></div></div>`).join("")}</div><div class="lines"><b>He tells, you write:</b>${'<div class="ln"></div>'.repeat(3)}</div>`,
      `Pick his favorite book from this week (or tell the story of the week). He draws what happened first, next and last, then tells it back to you.`);
  }

  // Wednesday compare page
  function comparePage(c) {
    const t = M.compare[c.wi], e = c.themeData.counter;
    if (t === "size") return sizePage(c, c.themeData.words[0][1], c.themeData.words[0][0], "Small, medium, large");
    if (t === "weight") {
      const pairs = [["🐘", "🐭"], ["🪶", "🪨"], ["🚗", "🚲"], ["🍇", "🍉"], ["🐝", "🐻"]];
      const rows = pairs.map(([a, b]) => `<div class="cmprow"><div class="cmpc">${emo(a, "0.95in")}</div><div class="cmpc">${emo(b, "0.95in")}</div></div>`).join("");
      return sheet(c, "Which is heavier?", "Math · Heavy and light", `<div class="cmp">${rows}</div>`, "In each row, he circles the one that is heavier. Ask: How do you know? Then hold two real things, one in each hand, and guess before you check.");
    }
    if (t === "length") {
      const r = rng(c.n), rows = Array.from({ length: 4 }, () => { const a = 2 + Math.floor(r() * 4), b = a + 2 + Math.floor(r() * 3); return r() < 0.5 ? [a, b] : [b, a]; });
      const bar = k => `<div class="bar">${'<i></i>'.repeat(k)}</div>`;
      return sheet(c, "Long and short", "Math · Comparing length", `<div class="bars">${rows.map(([a, b]) => `<div class="barpair">${bar(a)}${bar(b)}</div>`).join("")}</div>`,
        "In each pair, color the longer train green and the shorter one red. Count the boxes in each one. How many more boxes does the long one have?");
    }
    if (t === "fullempty") {
      const cup = lvl => `<svg viewBox="0 0 120 150" width="1.5in" height="1.9in"><path d="M15,10 L28,140 L92,140 L105,10" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>${lvl ? `<path d="M${15 + 13 * (1 - lvl)},${140 - 130 * lvl} L${105 - 13 * (1 - lvl)},${140 - 130 * lvl}" stroke="${SOFT}" stroke-width="3" stroke-dasharray="6 5"/>` : ""}</svg>`;
      return sheet(c, "Full, half and empty", "Math · Measuring", `<div class="cups"><div>${cup(0.92)}<b>full</b></div><div>${cup(0.5)}<b>half full</b></div><div>${cup(0)}<b>empty</b></div></div><div class="cups">${[0, 0, 0].map(() => `<div>${cup(0)}<b>&nbsp;</b></div>`).join("")}</div>`,
        "Top row: color the water up to the dashed line (blue crayon). Bottom row: you say full, half or empty, and he colors the water. Then try it with real cups of water or rice.");
    }
    if (t === "position") {
      return sheet(c, "Up and down, above and below", "Math · Position words", `<div class="posbox"><div class="ptable"></div></div><ul class="plist"><li>Draw a ⭐ <b>above</b> the table.</li><li>Draw a ball <b>below</b> the table.</li><li>Draw a cat <b>beside</b> the table.</li><li>Draw a cup <b>on</b> the table.</li></ul>`,
        "Read each direction and he draws. Then play with a toy: put it up, down, above, below, beside, in front and behind.");
    }
    if (t === "loudquiet") {
      const s = { cats: [{ name: "Loud", items: [["drum", "🥁"], ["fire truck", "🚒"], ["lion roar", "🦁"], ["trumpet", "🎺"]] }, { name: "Quiet", items: [["shh", "🤫"], ["mouse", "🐭"], ["book", "📚"], ["sleeping", "😴"]] }] };
      const items = s.cats.flatMap(k => k.items), r = rng(c.n); items.sort(() => r() - 0.5);
      return sheet(c, "Loud or quiet?", "Science · Listening", `<div class="sorthead two"><div>Loud</div><div>Quiet</div></div><div class="cutgrid g4">${items.map(([w, x]) => `<div class="cut">${emo(x, "0.85in")}<b>${w}</b></div>`).join("")}</div>`, "Cut out the cards and sort them. Make the sound for each one: loud or quiet?");
    }
    if (t === "texture") {
      const boxes = ["bumpy", "smooth", "rough", "soft"].map(x => `<div class="rub"><b>${x}</b><div class="dbox"></div></div>`).join("");
      return sheet(c, "Texture rubbings", "Science · Touch", `<div class="rubs">${boxes}</div>`, "Find something for each word. Put it under the page and rub over the box with the side of a crayon. Talk about how each one feels.");
    }
    if (t === "oddone") {
      const w = c.themeData.words.map(x => x[1]), r = rng(c.n);
      const rows = Array.from({ length: 5 }, (_, i) => { const a = w[i % w.length], b = w[(i + 3) % w.length]; const row = [a, a, a, a]; row[Math.floor(r() * 4)] = b; return `<div class="oddrow">${row.map(x => `<span>${emo(x, "0.85in")}</span>`).join("")}</div>`; }).join("");
      return sheet(c, "Which one is different?", "Thinking · Same and different", `<div class="odd">${rows}</div>`, "In each row, he circles the picture that is different. Ask: How is it different?");
    }
    // measure
    const strip = `<div class="ruler">${Array.from({ length: 10 }, (_, i) => `<div>${emo(e, "0.42in")}<small>${i + 1}</small></div>`).join("")}</div>`;
    const things = ["a spoon", "a book", "a shoe", "a toy", "his hand", "a crayon"];
    return sheet(c, "Let's measure", "Math · Measuring", `<p class="lead">Cut out the picture ruler. How many pictures long is each thing?</p>${strip}${strip}<table class="grid meas"><thead><tr><th>What we measured</th><th>I think</th><th>It was</th></tr></thead><tbody>${things.map(t => `<tr><td>${t}</td><td></td><td></td></tr>`).join("")}</tbody></table>`,
      "Cut out the two picture rulers (tape them together for a long one). He guesses first, then measures. Write the numbers together. Which thing was the longest?");
  }

  function scientistSheet(c) {
    const act = c.day.theme;
    return sheet(c, "My activity page", `Theme · ${act[0]}`, `<div class="actbox"><b>Today we:</b> ${esc(act[1])}</div><div class="two-col"><div><b>I think…</b><div class="dbox"></div></div><div><b>What happened</b><div class="dbox"></div></div></div><div class="lines"><b>I learned:</b>${'<div class="ln"></div>'.repeat(2)}</div>`,
      "Before the activity, he draws what he thinks will happen. After, he draws what really happened. You write the words he tells you.");
  }

  // ---------- fine motor pages ----------
  function fine(c) {
    const p = c.phase, d = c.d, nm = childName();
    const NAME = nm || "Name";
    if (p === 0) {
      if (d === 0) return sheet(c, `Playdough ${c.L}`, "Fine motor · Playdough", `<div class="pdl">${traceText(c.L, 560, 420, 600, 520)}</div>`, `Roll playdough into snakes and lay them on the dashed lines to make a giant ${c.L}. Rolling and squeezing builds the hand strength he needs for writing.`);
      if (d === 1) return sheet(c, "Rain lines", "Fine motor · Trace top to bottom", `<svg viewBox="0 0 400 420" width="100%" height="7.2in">${[60, 270].map(x => `<text x="${x}" y="70" font-size="70">☁️</text>`).join("")}${Array.from({ length: 10 }, (_, i) => `<line x1="${30 + i * 38}" y1="95" x2="${30 + i * 38}" y2="390" stroke="${INK}" stroke-width="3" stroke-dasharray="9 9" stroke-linecap="round"/>`).join("")}</svg>`, "Trace each line from the top to the bottom, like rain falling. Top to bottom is how we start most letters.");
      if (d === 2) return sheet(c, "Tear and stick", "Fine motor · Tearing paper", `<div class="bigshape">${shapeSVG("heart", "6.4in", "solid", 2.5)}</div>`, "Tear colored paper (or junk mail) into small pieces with his fingers, no scissors, and glue them inside the heart.");
      if (d === 3) { const k = Math.max(3, Math.min(10, c.nums[1])); return sheet(c, "Pom-pom mat", "Fine motor · Tongs and counting", `<div class="pom">${'<div></div>'.repeat(k)}</div>`, `Use tongs, a clothespin or two fingers to put one pom-pom (or cotton ball, or cereal piece) in each circle. Count them: ${k}!`); }
      return sheet(c, "Trace the circles", "Fine motor · Circles", `<svg viewBox="-210 -210 420 400" width="100%" height="7.2in">${[[-110, -110, 75], [110, -110, 75], [-140, 110, 45], [0, 110, 45], [140, 110, 45]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="9 8"/><circle cx="${x}" cy="${y - r}" r="5" fill="${INK}"/>`).join("")}</svg>`, "Start at the dot and go around. Make big circles in the air first, then trace.");
    }
    if (p === 1) {
      if (d === 0) return sheet(c, "Snip, snip!", "Fine motor · First cutting", `<div class="strips">${'<div class="strip">' + '<i></i>'.repeat(6) + '</div>'}${('<div class="strip">' + '<i></i>'.repeat(6) + '</div>').repeat(5)}</div>`, "Cut the strips apart for him. He snips across each strip on the short dashed lines. Thumb on top, \"thumbs up\" scissors!");
      if (d === 1) return sheet(c, "Drive on the road", "Fine motor · Tracing a path", `<svg viewBox="0 0 400 440" width="100%" height="7.2in"><text x="10" y="70" font-size="54">🚗</text><text x="320" y="420" font-size="54">🏠</text><path d="M70,60 C260,40 340,120 220,190 C100,260 60,330 200,360 C280,378 300,380 330,380" fill="none" stroke="${INK}" stroke-width="44" stroke-linecap="round"/><path d="M70,60 C260,40 340,120 220,190 C100,260 60,330 200,360 C280,378 300,380 330,380" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round"/><path d="M70,60 C260,40 340,120 220,190 C100,260 60,330 200,360 C280,378 300,380 330,380" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="10 9"/></svg>`, "First drive a toy car along the road. Then trace the dashed line in the middle with a crayon, without touching the sides.");
      if (d === 2) return sheet(c, "Letters in my name", "Fine motor · Name", `<div class="namebig">${esc(NAME)}</div><div class="nameboxes">${[...NAME].map(() => '<div></div>').join("")}</div>`, nm ? "Find the letters of his name in magnetic letters, cereal-box letters or paper squares and put each one in a box." : "Tip: type his first name in Setup and this page will show it. Find the letters of his name and put each one in a box.");
      if (d === 3) return sheet(c, "Cut on the lines", "Fine motor · Cutting straight", `<div class="cutlines">${'<div><span>✂️</span><i></i></div>'.repeat(6)}</div>`, "He cuts along each thick line from the scissors to the edge. Go slowly. It is fine to wobble!");
      return sheet(c, "Trace my name", "Fine motor · Name", `<div class="nametrace">${[0, 1, 2].map(() => traceText(NAME, 120, 700, 150, 120)).join("")}</div>`, nm ? "Trace his name with a crayon. Start each letter at the top." : "Type his first name in Setup and this page will show it for tracing.");
    }
    if (p === 2) {
      if (d === 0) return sheet(c, "Cut the waves", "Fine motor · Cutting curves", `<svg viewBox="0 0 400 440" width="100%" height="7.2in">${[50, 130, 210, 290, 370].map(y => `<path d="M20,${y} Q60,${y - 30} 100,${y} T180,${y} T260,${y} T340,${y} T400,${y}" fill="none" stroke="${INK}" stroke-width="5"/>`).join("")}<text x="0" y="40" font-size="30">✂️</text></svg>`, "He cuts along each wavy line. Turn the paper, not the scissors, on the curves.");
      if (d === 1) return sheet(c, "Copy the shapes", "Fine motor · Copying", `<div class="copygrid">${["circle", "cross", "square"].map(s => `<div class="cpm">${shapeSVG(s, "1.6in", "solid", 6)}</div><div class="cpb"></div>`).join("")}</div>`, "Look at each shape on the left and draw it in the empty box beside it. Circle, cross and square are the building blocks of letters.");
      if (d === 2) return sheet(c, `Write ${c.L} and ${c.l}`, "Fine motor · Copying letters", `<div class="lrows">${[c.L, c.l].map(x => `<div class="lrow"><div class="lm">${x}</div>${traceText(x, 140, 160, 170, 140).repeat(3)}<div class="lb"></div></div>`).join("")}</div>`, "Trace the dashed letters, then write one by himself in the empty box. Big and wobbly is fine!");
      if (d === 3) return sheet(c, "Lacing card", "Fine motor · Lacing", `<div class="bigshape"><svg viewBox="-110 -110 220 220" width="6.2in" height="6.2in"><g fill="none" stroke="${INK}" stroke-width="2.5">${shapePath.star}</g>${(() => { const v = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 38 : 88; return [Math.cos(a) * rr, Math.sin(a) * rr + 6]; }); const pts = []; v.forEach((p, i) => { const q = v[(i + 1) % 10]; pts.push(p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); }); return pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${INK}"/>`).join(""); })()}</svg></div>`, "Glue the page to cardboard (a cereal box works), cut out the star, and punch a hole at each dot. He laces a shoelace or yarn in and out of the holes.");
      return sheet(c, "Copy my name", "Fine motor · Name", `<div class="namecopy"><div class="namebig sm">${esc(NAME)}</div>${'<div class="wline"></div>'.repeat(4)}</div>`, nm ? "He copies his name on each line, looking at the model. Capital letter first, then lowercase." : "Type his first name in Setup and this page will show it.");
    }
    // phase 3
    const shapes = ["circle", "square", "triangle", "heart", "star"];
    if (d === 0) { const s = shapes[c.wi % shapes.length]; return sheet(c, `Cut out the ${s}`, "Fine motor · Cutting shapes", `<div class="bigshape">${shapeSVG(s, "6.4in", "solid", 4)}</div>`, `He cuts out the big ${s}, staying on the line. Turn the paper as you go. Then he can decorate it.`); }
    if (d === 1) return sheet(c, "Draw a person", "Fine motor · Drawing", `<div class="dbox big"></div><div class="chk">${["head", "eyes", "mouth", "body", "arms", "legs", "hair"].map(x => `<span><i class="bx"></i>${x}</span>`).join("")}</div>`, "He draws himself or someone in the family. Tick each body part he includes. Count them together!");
    if (d === 2) return sheet(c, "I can write my name", "Fine motor · Name", `<div class="namecopy">${'<div class="wline"></div>'.repeat(5)}<p class="hint">My name: <b>${esc(NAME)}</b></p></div>`, "He writes his name on each line by himself. Celebrate every letter he gets right!");
    if (d === 3) return sheet(c, "Triangles and X", "Fine motor · Tricky shapes", `<div class="copygrid">${["triangle", "x", "triangle"].map(s => `<div class="cpm">${shapeSVG(s, "1.6in", "dash", 6)}</div><div class="cpb"></div>`).join("")}</div>`, "Trace the dashed shape, then copy it in the empty box. Triangles and X have slanted lines, which are tricky for little hands.");
    return sheet(c, `${c.theme} collage`, "Fine motor · Cut and glue", `<div class="dbox big frame2"></div>`, `Cut pictures out of flyers or magazines that go with ${c.theme.toLowerCase()} and glue them inside the frame.`);
  }

  // ---------- teaching guide (parent page) ----------
  const PRAISE = ["You kept trying, even when it was hard!", "I love how carefully you looked.", "You figured that out by yourself!", "Great thinking! How did you know?", "You were so patient.", "Mistakes help our brains grow. Let's try again!", "You used your listening ears so well.", "Look how much you've learned!", "You explained that really clearly.", "I can tell you worked hard on that."];
  function mathTips(title) {
    const t = title.toLowerCase();
    if (/sort/.test(t)) return ["Let him choose the rule first, then try a second way to sort.", "Ask: \"Why does this one go here?\" Explaining the rule is the real learning.", "Easier: only 2 groups. Harder: sort the same things a new way."];
    if (/pattern/.test(t)) return ["Say the pattern out loud together: \"red, blue, red, blue…\"", "Ask: \"What comes next? How do you know?\"", "Easier: AB patterns only. Harder: let him make a pattern for you to finish."];
    if (/circle|square|triangle|rectangle|oval|star|heart|diamond|shape|cube/.test(t)) return ["Count sides and corners together, running a finger along each side.", "Ask: \"How is this shape different from a square?\"", "Hunt for the shape at home and outside. Harder: draw it without tracing."];
    if (/big|small|size|tall|long|short|heavy|light|weigh|full|empty|measure|compare|race|ramp|melt|roll|loud|smooth|up and down/.test(t)) return ["Use the comparing words a lot: bigger, smaller, longer, heavier, more, less.", "Always ask for a guess first: \"What do you think?\" Then test it.", "Harder: put 3 or more things in order and explain the order."];
    if (/more|less|fewer|equal|one more|one less/.test(t)) return ["Line the two groups up side by side so he can see which has more.", "Ask: \"How many more? How do you know?\"", "Harder: make the two groups equal."];
    if (/putting together|add/.test(t)) return ["Act it out with real objects: \"2 cars, then 1 more car comes…\"", "Count all of them together at the end.", "No writing equations yet. Just stories and objects."];
    return ["Touch each object once as you count. The last number said tells \"how many\".", "Count objects in a line first, then in a messy pile.", "Easier: count to 5 only. Harder: count backward, or start counting from a number other than 1."];
  }
  function lettersGuide(c) {
    const t = c.day.phonics[0], kw = M.letterPics[c.L][0];
    if (/Listening/.test(t)) return { goal: "Hear the sounds in words (rhymes, syllables, first sounds). This is the step before reading.", say: c.day.phonics[1], ask: "\"Do these words sound the same at the end?\" \"How many claps in banana?\"", easy: "Do only 3 or 4 examples and give the answer with him.", hard: "He makes up his own rhyme or silly word.", watch: "It is normal to guess at first. Keep it a game. 5 minutes is plenty." };
    if (/Meet/.test(t)) return { goal: `Know what ${c.L} and ${c.l} look like and the letter's name.`, say: `"This is ${c.L}. Big ${c.L} and little ${c.l}. ${c.L} is for ${kw}." Draw it in the air together.`, ask: `"Can you point to the big ${c.L}? The little ${c.l}?" "Do you see ${c.L} in your name?"`, easy: "Just point and name. Trace it with a finger on the letter card.", hard: `Say a word that starts like ${kw}. Find ${c.L} in a book.`, watch: "Mixing up similar letters (b/d, p/q, m/w) is normal at this age." };
    if (/page/.test(t)) return { goal: `Remember ${c.L}, connect it to words, and build his own alphabet book.`, say: `"Let's make our ${c.L} page! What starts like ${kw}?"`, ask: `"What else could we draw for ${c.L}?"`, easy: "Glue pictures you've cut out for him.", hard: "He tries to write the letter himself under the traced one.", watch: "It's his book, so let him choose what goes on it." };
    if (/review/i.test(t)) return { goal: `Review all the letters so far: ${c.known.join(", ")}.`, say: "\"Let's play a letter game! I name a letter, you find it.\"", ask: "\"Which letter is your favorite? Which one is tricky?\"", easy: "Use only 3 or 4 letters he knows well.", hard: "He names the letter AND a word that starts with it.", watch: "Note the letters he forgets. They come back around later in the year." };
    return { goal: `Recognize ${c.L} and ${c.l} anywhere: in books, on boxes and in his name.`, say: c.day.phonics[1], ask: `"How many ${c.L}s did you find? Where was the best hiding spot?"`, easy: "Put the letter card beside him while he hunts.", hard: `Sort the pictures by the first sound: does it start like ${kw}?`, watch: "Celebrate effort, not just right answers." };
  }
  function readGuide(d) {
    return [
      ["Predicting", "Before reading, look at the cover and pictures: \"What do you think this book is about?\" After: \"Was your guess right?\""],
      ["Remembering details", "\"Who was in the story? What happened on this page?\" Let him turn the pages and tell the story from the pictures."],
      ["What we already know", "Before: \"What do you know about this?\" After: \"What new thing did we learn?\""],
      ["Making connections", "\"Does this remind you of something that happened to you? Of another book?\""],
      ["Retelling", "\"What happened first, next and at the end?\" Use the retell page. Point to pictures to help."],
    ][d];
  }
  function guideHTML(n) {
    const c = ctxFor(n), day = c.day, di = c.uw * 5 + c.d;
    const q = M.questions[c.unitIdx][di];
    const wi = (c.uw * 4 + c.d) % 8, word = c.themeData.words[wi], def = M.defs[c.unitIdx][wi];
    const lg = lettersGuide(c), mt = mathTips(day.math[0]), rg = readGuide(c.d);
    const fineTip = ["Check his grip: crayon held between thumb and first two fingers (\"pinch and hold\"). Short, broken crayons help small hands grip correctly.",
      "Scissors: thumb on top (\"thumbs up!\"), the other hand holds and turns the paper. Sit at a table with feet flat.",
      "Copying: let him watch you draw the shape or letter first, then copy. Start letters at the top.",
      "Name writing: capital first letter, then lowercase. Praise every letter he gets right."][c.phase];
    const row = (h, b) => `<div class="gsec"><h3>${h}</h3>${b}</div>`;
    const li = a => `<ul>${a.map(x => `<li>${x}</li>`).join("")}</ul>`;
    return `<div class="goals"><b>Today's goals</b>${li([esc(lg.goal), `Math: ${esc(day.math[0].toLowerCase())}`, `Theme: ${esc(c.theme)} · ${esc(day.theme[0].toLowerCase())}`])}</div>
${row("Morning circle", `<p>Say: "Today is ___. The month is ___. It is day ${n} of school!" Check the weather together and sing the theme song.</p>`)}
${row("Letters &amp; sounds", li([`<b>Say:</b> ${esc(lg.say)}`, `<b>Ask:</b> ${esc(lg.ask)}`, `<b>Easier:</b> ${esc(lg.easy)}`, `<b>Harder:</b> ${esc(lg.hard)}`, `<b>Watch for:</b> ${esc(lg.watch)}`]))}
${row("Math", li(mt.map(esc)))}
${row("Theme", `<p><b>Think and talk:</b> ${esc(q)}</p><p class="gsm">Wait 5 seconds before helping. There are no wrong answers. Ask "Why do you think that?"</p><p><b>Word of the day:</b> ${emo(word[1], "1.2em")} <b>${esc(word[0])}</b>: ${esc(def)}. Use it 3 times today!</p>`)}
${row("Read-aloud", `<p><b>Skill: ${rg[0]}.</b> ${esc(rg[1])}</p>`)}
${row("Fine motor", `<p>${esc(fineTip)}</p>`)}
<div class="praise"><b>Praise to try today:</b> "${esc(PRAISE[(n - 1) % PRAISE.length])}"</div>`;
  }
  function guidePage(c) {
    return sheet(c, "Teaching guide", "For the grown-up · read before the lesson", `<div class="guide">${guideHTML(c.n)}</div>`, "");
  }

  // ---------- extra practice pages ----------
  function wordsOfWeek(c) {
    const idx = c.uw === 0 ? [0, 1, 2, 3] : [4, 5, 6, 7];
    const rows = idx.map(i => { const [w, e] = c.themeData.words[i]; return `<div class="wow">${emo(e, "0.9in")}<div><b>${esc(w)}</b><p>${esc(M.defs[c.unitIdx][i])}</p><div class="wl">Say a sentence with <i>${esc(w)}</i>: <span></span></div></div></div>`; }).join("");
    return sheet(c, "Words of the week", `Vocabulary · ${c.theme}`, `<div class="wows">${rows}</div>`, "Read each word and its meaning. Use these words all week while you play, cook and read. Write his sentence on the line, or just say it together.");
  }
  function patternPage(c) {
    const w = c.themeData.words.map(x => x[1]), r = rng(c.n * 7);
    const kinds = c.wi < 12 ? ["AB", "AB", "AB", "AB"] : c.wi < 24 ? ["AB", "ABB", "AAB", "ABB"] : ["ABB", "ABC", "AABB", "ABC"];
    const rows = kinds.map((k, i) => {
      const pick = [w[(i * 2) % 8], w[(i * 2 + 1) % 8], w[(i * 2 + 3) % 8]];
      const unit = [...k].map(ch => pick[ch.charCodeAt(0) - 65]);
      const seq = []; while (seq.length < 8) seq.push(unit[seq.length % unit.length]);
      return `<div class="patrow"><span class="pk">${k}</span>${seq.slice(0, 6).map(x => `<span>${emo(x, "0.62in")}</span>`).join("")}<span class="blank"></span><span class="blank"></span></div>`;
    }).join("");
    return sheet(c, "What comes next?", "Math · Patterns", `<div class="pats">${rows}</div>`, "Say each pattern out loud together. He draws what comes next in the empty boxes. Then he makes his own pattern with toys or blocks.");
  }
  function findLetter(c) {
    const r = rng(c.n * 11), others = "ABCDEFGHIJKLMNOPRSTUVWXYZ".replace(c.L, "").split("");
    const cells = []; let count = 0;
    for (let i = 0; i < 48; i++) { const hit = r() < 0.25; if (hit) count++; const ch = hit ? (r() < 0.5 ? c.L : c.l) : (r() < 0.5 ? others[Math.floor(r() * others.length)] : others[Math.floor(r() * others.length)].toLowerCase()); cells.push(ch); }
    return sheet(c, `Find ${c.L} and ${c.l}`, "Letters · Look closely", `<div class="findgrid">${cells.map(x => `<span>${x}</span>`).join("")}</div><div class="findcount">I found <span class="blank"></span> ${c.L}s! <small>(answer: ${count})</small></div>`,
      `He colors or circles every ${c.L} and ${c.l}. Count them together at the end. Looking closely like this trains the eyes for reading.`);
  }
  function picGraph(c) {
    const r = rng(c.n * 13), w = c.themeData.words, picks = [w[0], w[2], w[5]], max = Math.min(6, Math.max(3, c.nums[1]));
    const counts = picks.map(() => 1 + Math.floor(r() * max));
    const scattered = []; picks.forEach((p, i) => { for (let k = 0; k < counts[i]; k++) scattered.push(p[1]); }); scattered.sort(() => r() - 0.5);
    const cols = picks.map(p => `<div class="gcol">${'<i></i>'.repeat(6)}<b>${emo(p[1], "0.55in")}</b></div>`).join("");
    return sheet(c, "Count and graph", "Math · Picture graph", `<div class="scatter">${scattered.map(x => emo(x, "0.6in")).join("")}</div><div class="graph">${cols}</div>`,
      `Count each kind of picture. Color one box for each in its column. Ask: Which has the most? The least? How many more? (Answers: ${picks.map((p, i) => `${esc(p[0])} ${counts[i]}`).join(", ")}.)`);
  }
  function letterMaze(c) {
    const N = 6, r = rng(c.n * 17), others = "BCDFGHJKMNPRSTVWZ".replace(c.L, "").split("");
    const path = new Set(); let x = 0, y = 0; path.add("0,0");
    while (x < N - 1 || y < N - 1) { if (x < N - 1 && (y === N - 1 || r() < 0.5)) x++; else y++; path.add(x + "," + y); }
    let cells = "";
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const on = path.has(i + "," + j), ch = on ? (r() < 0.5 ? c.L : c.l) : others[Math.floor(r() * others.length)];
      const start = i === 0 && j === 0, end = i === N - 1 && j === N - 1;
      cells += `<div class="${start ? "st" : end ? "en" : ""}">${start ? emo("🐾", "0.45in") + `<small>${ch}</small>` : end ? emo(c.themeData.counter, "0.45in") + `<small>${ch}</small>` : ch}</div>`;
    }
    return sheet(c, `${c.L} maze`, "Letters · Follow the letter", `<div class="maze">${cells}</div>`, `Start at the paw prints. Color only the boxes with ${c.L} or ${c.l} to make a path to the ${esc(c.themeData.words[0][0])} picture. Moving can be across or down.`);
  }
  function weekCheck(c) {
    const m = M.letters, mt = MATHW(c.wi);
    const skills = [`Points to ${c.L} when asked`, `Names the letter ${c.L}`, `Knows ${c.L}'s sound (bonus)`, ...mt, "Listens to a whole book", "Retells with first, next, last", "Fine motor: " + D.days[c.n - 1].write.split(":")[0]];
    return sheet(c, `Week ${c.wk} check-in`, "For the grown-up · Friday", `<table class="grid wk"><thead><tr><th>Skill</th><th>😀 Got it</th><th>🙂 Getting there</th><th>🌱 Not yet</th></tr></thead><tbody>${skills.map(s => `<tr><td>${esc(s)}</td><td></td><td></td><td></td></tr>`).join("")}</tbody></table><div class="lines"><b>Notes and favorite moment this week:</b>${'<div class="ln"></div>'.repeat(3)}</div>`,
      "Tick a column for each skill. Anything \"not yet\" will come back later. It is fine to repeat a week. Keep these pages to see how much he grows!");
  }
  const MATHW = wi => { const ds = D.days.slice(wi * 5, wi * 5 + 5); return [ds[1].math[0], ds[2].math[0], ds[3].math[0]].map(t => "Math: " + t); };

  // ---------- assemble a day ----------
  function forDay(n) {
    const c = ctxFor(n), out = [guidePage(c)];
    if (c.d === 0) { out.push(sortPage(c)); out.push(wordsOfWeek(c)); out.push(patternPage(c)); if (c.uw === 0) { out.push(vocabCards(c)); out.push(songCard(c)); } else out.push(drawTheme(c)); }
    if (c.d === 1) { out.push(letterCard(c)); out.push(huntCards(c)); out.push(findLetter(c)); out.push(numberCards(c)); }
    if (c.d === 2) { out.push(comparePage(c)); out.push(picGraph(c)); out.push(scientistSheet(c)); }
    if (c.d === 3) { out.push(letterTrace(c)); out.push(startsWith(c)); out.push(letterMaze(c)); out.push(framePage(c)); if (c.uw === 0) out.push(counters(c)); }
    if (c.d === 4) { out.push(c.isNew ? alphabetPage(c) : letterMatch(c)); out.push(M.friShape[c.wi] ? shapePage(c) : countColor(c)); out.push(retell(c)); out.push(weekCheck(c)); }
    out.push(fine(c));
    return out;
  }

  // ---------- circle-time kit (used all year) ----------
  function kit() {
    const c = { wk: "–", n: "–", dow: "Every day", unit: "–", theme: "All year", L: "", l: "" };
    const kitSheet = (t, s, b, nt) => { const p = sheet(c, t, s, b, nt); p.html = p.html.replace(/<div class="tag">.*?<\/div>/, '<div class="tag">Circle time kit · keep all year</div>').replace(/<footer>.*?<\/footer>/, "<footer>Mom Academy · Circle time kit</footer>"); return p; };
    const wx = [["Sunny", "☀️"], ["Cloudy", "☁️"], ["Rainy", "🌧️"], ["Windy", "💨"], ["Snowy", "❄️"], ["Stormy", "⛈️"]];
    const az = Object.keys(M.letterPics).sort().map(k => `<div class="azc"><b>${k}${k.toLowerCase()}</b>${emo(M.letterPics[k][1], "0.5in")}<small>${esc(M.letterPics[k][0])}</small></div>`).join("");
    return [
      kitSheet("Today is…", "Morning circle board", `<div class="board">${["Today is", "The month is", "The date is", "School day number"].map(t => `<div class="brow"><span>${t}</span><i></i></div>`).join("")}</div><h2 class="mid">The weather today is…</h2><div class="weather">${wx.map(([n, e]) => `<div>${emo(e, "0.8in")}<b>${n}</b></div>`).join("")}</div>`, "Slip this page into a clear sleeve and write with a dry-erase marker. Clip a clothespin on today's weather."),
      kitSheet("Days of the week", "Say them every morning", `<div class="dow">${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => `<div>${d}</div>`).join("")}</div>`, "Point to each day as you say it. Is today a school day or a weekend day?"),
      kitSheet("Months of the year", "Find his birthday month", `<div class="months">${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => `<div>${m}${m === "December" ? " 🎂" : ""}</div>`).join("")}</div>`, "Say the months together. Which month is it now? Whose birthday is in which month?"),
      kitSheet("Alphabet chart", "A to Z", `<div class="az">${az}</div>`, "Hang it near your learning spot. Point to each letter as you sing the alphabet song slowly."),
      kitSheet("Number line 0–20", "Counting", `<div class="nline">${Array.from({ length: 21 }, (_, i) => `<div><b>${i}</b></div>`).join("")}</div><div class="nline2">${Array.from({ length: 11 }, (_, i) => `<div><b>${i}</b><span>${"•".repeat(i)}</span></div>`).join("")}</div>`, "Cut the strips out and tape them on the wall at his height. Hop along it, point and count."),
    ];
  }

  window.Materials = { forDay, kit, ctxFor, guideHTML };
})();
