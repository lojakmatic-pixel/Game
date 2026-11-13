/* Spiele 92–100: Offene Welten (ohne Runden) mit gespeichertem Fortschritt: Tycoons, Farm, Pets, Börse, Stadt, Pixel-Leinwand. */
(function () {
  'use strict';
  const FREE = { mode: 'free', max: 12 };
  const fmt = n => { if (n < 1000) return Math.floor(n) + ''; const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi']; let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i]; };

  /* ---------- Gemeinsame Tycoon-Engine (4 Tycoons) ---------- */
  function tycoon(w, cfg) {
    const d = w.data || {}; const st = Object.assign({ money: 0, total: 0, owned: [], power: 1, heat: 0, raids: 0, prot: 0, t: Date.now() }, d.owned ? d : {});
    while (st.owned.length < cfg.items.length) st.owned.push(0);
    let msg = '', msgT = 0, bounce = 0, flo = [], dirty = false, lastSave = 0, rep = 0, cdRob = 0, cdBoost = 0;
    const say = t => { msg = t; msgT = 3.5; };
    const cost = (it, n) => Math.ceil(it.cost * Math.pow(1.15, n)), powerCost = () => Math.ceil(50 * Math.pow(2.6, st.power - 1)), protCost = () => Math.ceil(5000 * Math.pow(3, st.prot));
    const income = () => cfg.items.reduce((s, it, i) => s + it.income * st.owned[i], 0), bribe = () => Math.max(100, Math.ceil(income() * 25));
    const away = Math.min(8 * 3600, (Date.now() - (st.t || Date.now())) / 1000);
    if (away > 30 && income() > 0) { const e = income() * away * 0.5; st.money += e; st.total += e; say('Willkommen zurück! Offline verdient: ' + cfg.cur + fmt(e)); }
    function save() { st.t = Date.now(); w.save(st); dirty = false; lastSave = performance.now(); }
    const rivals = () => Object.entries(w.others).filter(([, o]) => typeof o.s === 'number');
    function click(x, y) {
      if (Math.hypot(x - 150, y - 160) < 85) { const g = st.power; st.money += g; st.total += g; bounce = 1; dirty = true; flo.push({ x: 150 + (Math.random() - 0.5) * 60, y: 90, t: 1, s: '+' + cfg.cur + fmt(g) }); if (cfg.heat) st.heat = Math.min(100, st.heat + 0.15); return; }
      if (x > 20 && x < 280 && y > 290 && y < 322) { const c = powerCost(); if (st.money >= c) { st.money -= c; st.power++; dirty = true; } else say('Zu wenig ' + cfg.curName); return; }
      if (cfg.heat && x > 20 && x < 280 && y > 326 && y < 358) { const c = protCost(); if (st.prot < 5 && st.money >= c) { st.money -= c; st.prot++; dirty = true; say('🛡️ Sicherheit Stufe ' + st.prot); } else say(st.prot >= 5 ? 'Maximale Sicherheit' : 'Zu wenig ' + cfg.curName); return; }
      if (cfg.heat && x > 20 && x < 280 && y > 362 && y < 394) { const c = bribe(); if (st.money >= c && st.heat > 0) { st.money -= c; st.heat = Math.max(0, st.heat - 40); dirty = true; say(cfg.bribeMsg); } else say(st.heat <= 0 ? 'Keine Fahndung – nicht nötig' : 'Zu wenig ' + cfg.curName); return; }
      if (x > 300 && x < 630 && y >= 346 && y < 392) { // Spieler-Aktion
        const rv = rivals(); if (!rv.length) return say('Allein im Raum – warte auf andere Spieler');
        if (cfg.heat) { if (cdRob > 0) return say('Noch ' + Math.ceil(cdRob) + 's Abkühlzeit'); const [n] = rv[Math.floor(Math.random() * rv.length)]; w.sendTo(n, { rob: 1 }); cdRob = 20; st.heat = Math.min(100, st.heat + 25); say('🦹 Raubzug auf ' + n + '…'); }
        else { if (cdBoost > 0) return say('Noch ' + Math.ceil(cdBoost) + 's Abkühlzeit'); w.send({ boost: 1 }); cdBoost = 30; const g = income() * 10; st.money += g; st.total += g; say('🤝 Boost gesendet! +' + cfg.cur + fmt(g)); }
        return;
      }
      cfg.items.forEach((it, i) => { const iy = 62 + i * 40; if (x > 300 && x < 630 && y > iy && y < iy + 36) { const c = cost(it, st.owned[i]); if (st.money >= c) { st.money -= c; st.owned[i]++; dirty = true; } else say('Zu wenig ' + cfg.curName + ' für ' + it.name); } });
    }
    return {
      net(ev, from) {
        if (ev.rob) { const loss = Math.min(st.money, st.money * 0.12 * (1 - st.prot * 0.15)); st.money -= loss; w.sendTo(from, { loot: loss, victim: w.name }); say(`🚨 ${from} hat dich ausgeraubt! -${cfg.cur}${fmt(loss)}`); dirty = true; }
        if (ev.loot != null) { st.money += ev.loot; st.total += ev.loot; say(`💰 Beute von ${ev.victim}: +${cfg.cur}${fmt(ev.loot)}`); dirty = true; }
        if (ev.boost) { const g = income() * 10; st.money += g; st.total += g; say(`🤝 ${from} hat dich geboostet: +${cfg.cur}${fmt(g)}`); dirty = true; }
      },
      flush() { save(); },
      step(dt) {
        if (w.inp.tap) click(w.inp.tap.x, w.inp.tap.y); if (w.inp.e.space) click(150, 160);
        const inc = income(); st.money += inc * dt; st.total += inc * dt; if (inc > 0) dirty = true; cdRob -= dt; cdBoost -= dt;
        if (cfg.heat) { st.heat = Math.min(100, st.heat + (inc > 0 ? Math.log10(inc + 10) * 0.35 * dt : 0)); if (st.heat >= 100) { const lost = st.money * 0.4 * (1 - st.prot * 0.15); st.money -= lost; st.heat = 30; st.raids++; dirty = true; say(`${cfg.raidMsg} -${cfg.cur}${fmt(lost)}`); } }
        w.score = st.total; if (dirty && performance.now() - lastSave > 4000) save(); rep -= dt; if (rep <= 0) { rep = 30; w.report(Math.floor(st.total)); }
        if (msgT > 0) msgT -= dt; bounce = Math.max(0, bounce - dt * 6); for (const f of flo) { f.y -= 40 * dt; f.t -= dt; } flo = flo.filter(f => f.t > 0);
      },
      draw() {
        w.bg(cfg.bg[0], cfg.bg[1]); const inc = income();
        w.g.fillStyle = 'rgba(255,255,255,.12)'; w.g.beginPath(); w.g.arc(150, 160, 85, 0, 7); w.g.fill(); w.e(cfg.clickEmoji, 150, 160, 90 + bounce * 18); w.tx(cfg.clickName, 150, 235, 14, '#ddd');
        w.tx(cfg.cur + fmt(st.money), 150, 22, 28, '#ffe9a8'); w.tx('+' + cfg.cur + fmt(inc) + '/s', 150, 46, 14, '#9fe39f');
        if (cfg.heat) { w.box(20, 66, 260, 14, 'rgba(0,0,0,.5)'); w.box(20, 66, 260 * st.heat / 100, 14, st.heat > 75 ? '#ff3b30' : st.heat > 45 ? '#ff9500' : '#ffd60a'); w.tx(`🔥 Fahndung ${Math.floor(st.heat)}% · Razzien ${st.raids}`, 150, 73, 11); }
        const btn = (y, t, can) => { w.box(20, y, 260, 32, can ? 'rgba(80,140,255,.6)' : 'rgba(0,0,0,.4)'); w.tx(t, 150, y + 16, 12, can ? '#fff' : '#aaa'); };
        btn(290, `⬆ Klickkraft ${st.power} → ${st.power + 1} (${cfg.cur}${fmt(powerCost())})`, st.money >= powerCost());
        if (cfg.heat) { btn(326, st.prot >= 5 ? '🛡️ Sicherheit MAX' : `🛡️ Sicherheit ${st.prot} → ${st.prot + 1} (${cfg.cur}${fmt(protCost())})`, st.prot < 5 && st.money >= protCost()); btn(362, `🤝 Polizei bestechen (${cfg.cur}${fmt(bribe())})`, st.money >= bribe() && st.heat > 0); }
        w.tx(cfg.title, 465, 20, 18); cfg.items.forEach((it, i) => { const y = 62 + i * 40, c = cost(it, st.owned[i]), can = st.money >= c; w.box(300, y, 330, 36, can ? 'rgba(80,200,120,.35)' : 'rgba(0,0,0,.35)'); w.e(it.emoji, 322, y + 18, 24); w.tx(`${it.name}  x${st.owned[i]}`, 344, y + 12, 13, '#fff', 'left'); w.tx(`+${cfg.cur}${fmt(it.income)}/s`, 344, y + 27, 11, '#9fe39f', 'left'); w.tx(cfg.cur + fmt(c), 622, y + 18, 14, can ? '#ffe9a8' : '#999', 'right'); });
        const rv = rivals(); w.box(300, 346, 330, 46, rv.length ? (cfg.heat ? 'rgba(200,40,40,.55)' : 'rgba(60,140,255,.5)') : 'rgba(0,0,0,.4)');
        w.tx(cfg.heat ? '🦹 Rivalen ausrauben (+Beute, +Fahndung)' : '🤝 Alle Nachbarn boosten (+Einkommen für alle)', 465, 361, 13); w.tx(rv.length ? rv.slice(0, 3).map(([n, o]) => `${n}: ${cfg.cur}${fmt(o.s)}`).join('  ·  ') : 'Allein im Raum', 465, 380, 11, '#ddd');
        for (const f of flo) { w.g.globalAlpha = Math.max(0, f.t); w.tx(f.s, f.x, f.y, 16); w.g.globalAlpha = 1; }
        if (msgT > 0) { w.box(20, 262, 270, 24, 'rgba(0,0,0,.75)'); w.tx(msg, 155, 274, 11, '#fff'); }
      },
      pub() { return { s: Math.floor(st.total) }; }, noGhost: true
    };
  }
  const T = (c, e, ...n) => [15, 100, 1100, 12000, 130000, 1400000, 20000000].map((cost, i) => ({ name: n[i][0], emoji: n[i][1], cost, income: [0.5, 4, 32, 260, 2100, 16000, 130000][i] }));

  reg('criminal-tycoon', 'Criminal Tycoon', '🕶️', 'Tycoon', 'Baue dein Verbrecher-Imperium auf – bestich die Polizei, bevor es Razzien gibt, und raube andere Spieler aus!', 'Klick auf den Geldsack · Crews kaufen · Rivalen ausrauben', FREE, w => tycoon(w, {
    cur: '$', curName: 'Geld', clickEmoji: '💰', clickName: 'Klau Geld!', bg: ['#111', '#333'], heat: true, title: 'Criminal Tycoon', bribeMsg: 'Der Cop schaut weg… Fahndung sinkt!', raidMsg: '🚨 POLIZEI-RAZZIA!',
    items: T(0, 0, ['Taschendieb', '🧤'], ['Autodieb', '🚗'], ['Ladenüberfall', '🏪'], ['Schmugglerring', '📦'], ['Hacker-Bande', '💻'], ['Bankraub-Crew', '🏦'], ['Mafia-Boss', '🕴️'])
  }));
  reg('pizza-tycoon', 'Pizza Tycoon', '🍕', 'Tycoon', 'Backe Pizzen, baue Filialen – und boost deine Nachbarn.', 'Klick auf die Pizza · Läden kaufen', FREE, w => tycoon(w, {
    cur: '$', curName: 'Geld', clickEmoji: '🍕', clickName: 'Pizza backen', bg: ['#c98a3b', '#f6d58a'], title: 'Pizza Tycoon',
    items: T(0, 0, ['Teigroller', '🥖'], ['Pizzaofen', '🔥'], ['Lieferfahrrad', '🚲'], ['Pizzeria', '🏠'], ['Pizza-Truck', '🚚'], ['Fabrik', '🏭'], ['Pizza-Imperium', '🌍'])
  }));
  reg('mine-tycoon', 'Mine Tycoon', '⛏️', 'Tycoon', 'Grabe nach Edelsteinen tief im Vulkan.', 'Klick auf den Felsen · Maschinen kaufen', FREE, w => tycoon(w, {
    cur: '💎', curName: 'Edelsteine', clickEmoji: '⛏️', clickName: 'Graben', bg: ['#3a0d0d', '#c0392b'], title: 'Mine Tycoon',
    items: T(0, 0, ['Spitzhacke', '⛏️'], ['Lore', '🛒'], ['Bohrer', '🔩'], ['Schmelzofen', '♨️'], ['Bagger', '🚜'], ['Magma-Maschine', '🤖'], ['Vulkan-Kern', '🌋'])
  }));
  reg('space-tycoon', 'Space Tycoon', '🛰️', 'Tycoon', 'Erweitere deine Raumstation bis zur Galaxie.', 'Klick auf die Rakete · Module kaufen', FREE, w => tycoon(w, {
    cur: '⭐', curName: 'Sterne', clickEmoji: '🚀', clickName: 'Starten', bg: ['#050510', '#2a1a5e'], title: 'Space Tycoon',
    items: T(0, 0, ['Solarpanel', '☀️'], ['Labor', '🧪'], ['Satellit', '🛰️'], ['Mondbasis', '🌙'], ['Marskolonie', '🔴'], ['Warp-Tor', '🌀'], ['Galaxie-Reich', '🌌'])
  }));

  /* ---------- Farm Life ---------- */
  reg('farm-life', 'Farm Life', '🚜', 'Simulation', 'Pflanze, warte, ernte – in Echtzeit, auch wenn du weg bist. Gieße die Beete deiner Nachbarn!', 'Samen wählen · Beet anklicken (pflanzen/ernten) · 💧 Nachbarn gießen', FREE, w => {
    const CR = [['🥕', 8, 5, 14], ['🍓', 20, 12, 38], ['🌽', 45, 25, 85], ['🎃', 90, 60, 230]];
    const d = w.data || {}; const st = Object.assign({ coins: 20, plots: Array(12).fill(null), sel: 0, harv: 0, t: Date.now() }, d.plots ? d : {}); let msg = '', mt = 0, cdW = 0, dirty = false, last = 0;
    const say = t => { msg = t; mt = 2.5; }, save = () => { w.save(st); dirty = false; last = performance.now(); };
    const cell = i => ({ x: 30 + (i % 4) * 100, y: 60 + Math.floor(i / 4) * 100 });
    return {
      flush: save,
      net(ev, from) { if (ev.water) { const p = st.plots.find(p => p && Date.now() - p.at < CR[p.c][1] * 1000); if (p) { p.at -= 6000; say(`💧 ${from} hat gegossen`); dirty = true; } } },
      step(dt) {
        mt -= dt; cdW -= dt; const t = w.inp.tap;
        if (t) { if (t.y > 360) { const k = Math.floor((t.x - 30) / 80); if (k >= 0 && k < 4) st.sel = k; else if (k === 4 || k === 5) { if (cdW > 0) say('Kurz warten…'); else if (w.live().length < 2) say('Allein im Raum'); else { w.send({ water: 1 }); st.coins += 5; cdW = 5; say('💧 Nachbarn gegossen +5🪙'); dirty = true; } } }
          else for (let i = 0; i < 12; i++) { const c = cell(i); if (t.x > c.x && t.x < c.x + 92 && t.y > c.y && t.y < c.y + 92) { const p = st.plots[i]; if (!p) { if (st.coins >= CR[st.sel][2]) { st.coins -= CR[st.sel][2]; st.plots[i] = { c: st.sel, at: Date.now() }; dirty = true; } else say('Zu wenig Münzen'); } else if (Date.now() - p.at >= CR[p.c][1] * 1000) { st.coins += CR[p.c][3]; st.harv++; st.plots[i] = null; dirty = true; } } } }
        w.score = st.coins + st.harv * 10; if (dirty && performance.now() - last > 4000) save();
      },
      draw() {
        w.bg('#5ec8ff', '#a8e063'); w.box(10, 50, 420, 310, '#6d4c41');
        st.plots.forEach((p, i) => { const c = cell(i); w.box(c.x, c.y, 92, 92, '#8d6e63'); if (p) { const g = Math.min(1, (Date.now() - p.at) / (CR[p.c][1] * 1000)); w.e(g >= 1 ? CR[p.c][0] : '🌱', c.x + 46, c.y + 44, g >= 1 ? 52 : 28 + g * 20); if (g < 1) { w.box(c.x + 8, c.y + 80, 76, 6, '#0006'); w.box(c.x + 8, c.y + 80, 76 * g, 6, '#4cd98a'); } else w.tx('Ernten!', c.x + 46, c.y + 80, 11, '#ffe9a8'); } });
        w.tx('🪙 ' + Math.floor(st.coins), 540, 30, 24, '#333'); w.tx('Ernten: ' + st.harv, 540, 60, 14, '#333'); const o = Object.entries(w.others).filter(([, x]) => typeof x.s === 'number'); o.slice(0, 6).forEach(([n, x], i) => w.tx(`👤 ${n}: ${x.s}`, 450, 100 + i * 20, 12, '#223', 'left'));
        CR.forEach((c, k) => { w.box(30 + k * 80, 366, 74, 28, k === st.sel ? '#ffd166' : '#ffffffaa'); w.tx(`${c[0]} ${c[2]}🪙`, 30 + k * 80 + 37, 380, 12, '#222'); }); w.box(350, 366, 150, 28, cdW > 0 ? '#999' : '#1e88e5'); w.tx('💧 Nachbarn gießen', 425, 380, 12);
        if (mt > 0) { w.box(120, 20, 400, 24, '#000a'); w.tx(msg, 320, 32, 13); }
      },
      pub() { return { s: Math.floor(st.coins + st.harv * 10) }; }, noGhost: true
    };
  });

  /* ---------- Pet Simulator ---------- */
  const EGGS = [['🥚 Basis-Ei', 100, [['🐶', 60, 1], ['🐱', 30, 2], ['🐰', 10, 4]]], ['🪺 Gold-Ei', 1500, [['🦊', 50, 8], ['🐼', 35, 15], ['🦄', 15, 40]]], ['🐉 Drachen-Ei', 25000, [['🐲', 70, 120], ['🐉', 25, 300], ['👑', 5, 1000]]]];
  reg('pet-simulator', 'Pet Simulator', '🐾', 'Simulation', 'Sammle Münzen, schlüpfe Eier aus und sammle seltene Pets – verschenke Pets an andere Spieler!', 'Klick = Münzen · Eier kaufen · 🎁 Pet verschenken', FREE, w => {
    const d = w.data || {}; const st = Object.assign({ coins: 0, total: 0, pets: {}, t: Date.now() }, d.pets ? d : {}); let msg = '', mt = 0, bounce = 0, dirty = false, last = 0, hatch = null;
    const mult = () => 1 + Object.entries(st.pets).reduce((s, [e, n]) => s + n * (EGGS.flatMap(x => x[2]).find(p => p[0] === e) || [0, 0, 0])[2], 0);
    const say = t => { msg = t; mt = 3; }, save = () => { w.save(st); dirty = false; last = performance.now(); };
    return {
      flush: save,
      net(ev, from) { if (ev.gift) { st.pets[ev.gift] = (st.pets[ev.gift] || 0) + 1; say(`🎁 ${from} schenkt dir ein ${ev.gift}!`); dirty = true; } },
      step(dt) {
        mt -= dt; bounce = Math.max(0, bounce - dt * 6); const t = w.inp.tap; if (hatch) { hatch.t -= dt; if (hatch.t <= 0) hatch = null; }
        if (t) { if (Math.hypot(t.x - 150, t.y - 150) < 80) { const g = mult(); st.coins += g; st.total += g; bounce = 1; dirty = true; }
          EGGS.forEach((e, i) => { if (t.x > 300 && t.x < 630 && t.y > 60 + i * 50 && t.y < 106 + i * 50) { if (st.coins >= e[1]) { st.coins -= e[1]; let r = Math.random() * e[2].reduce((s, p) => s + p[1], 0), pet = e[2][0]; for (const p of e[2]) { if ((r -= p[1]) <= 0) { pet = p; break; } } st.pets[pet[0]] = (st.pets[pet[0]] || 0) + 1; hatch = { e: pet[0], t: 2 }; say(`Geschlüpft: ${pet[0]} (×${pet[2]})`); dirty = true; } else say('Zu wenig Münzen'); } });
          if (t.x > 300 && t.x < 630 && t.y > 230 && t.y < 270) { const o = Object.keys(w.others); const own = Object.keys(st.pets).filter(k => st.pets[k] > 0); if (!o.length) say('Allein im Raum'); else if (!own.length) say('Du hast kein Pet'); else { const pet = own[Math.floor(Math.random() * own.length)], to = o[Math.floor(Math.random() * o.length)]; st.pets[pet]--; w.sendTo(to, { gift: pet }); say(`🎁 ${pet} an ${to} verschenkt`); dirty = true; } } }
        w.score = st.total; if (dirty && performance.now() - last > 4000) save();
      },
      draw() {
        w.bg('#ff9ad5', '#ffe0f3'); w.circ(150, 150, 80, '#ffffff66'); w.e('🪙', 150, 150, 80 + bounce * 16); w.tx('🪙 ' + fmt(st.coins), 150, 30, 26, '#553'); w.tx(`Klick = ${fmt(mult())} Münzen`, 150, 62, 14, '#553');
        EGGS.forEach((e, i) => { const can = st.coins >= e[1]; w.box(300, 60 + i * 50, 330, 46, can ? '#4cd98a99' : '#00000033'); w.tx(e[0], 320, 83 + i * 50, 16, '#223', 'left'); w.tx('🪙 ' + fmt(e[1]), 620, 83 + i * 50, 15, '#223', 'right'); });
        w.box(300, 230, 330, 40, '#1e88e5aa'); w.tx('🎁 Zufälliges Pet verschenken', 465, 250, 14);
        let k = 0; for (const [e, n] of Object.entries(st.pets)) if (n > 0) { w.e(e, 320 + (k % 8) * 38, 306 + Math.floor(k / 8) * 36, 28); w.tx('×' + n, 320 + (k % 8) * 38 + 12, 316 + Math.floor(k / 8) * 36, 9, '#223'); k++; }
        if (hatch) { w.box(0, 0, 640, 400, '#000a'); w.e(hatch.e, 320, 200, 120); w.tx('Neues Pet!', 320, 290, 28); } if (mt > 0) { w.box(20, 360, 270, 28, '#000a'); w.tx(msg, 155, 374, 12); }
      },
      pub() { return { s: Math.floor(st.total) }; }, noGhost: true
    };
  });

  /* ---------- Börse ---------- */
  const STK = [['🍎', 'APFL', 120, 0.31, 0.77], ['🚗', 'CARZ', 60, 0.23, 0.61], ['🎮', 'GAME', 90, 0.41, 0.93], ['🍕', 'PZZA', 30, 0.19, 0.53], ['🚀', 'SPCE', 200, 0.27, 0.71]];
  const price = (i, tk) => { const s = STK[i], n = Math.sin(i * 127.1 + tk * 311.7) * 43758.5453; return Math.max(1, s[2] * (1 + 0.42 * Math.sin(tk * s[3] * 0.4 + i) + 0.25 * Math.sin(tk * s[4] * 0.4 + i * 2) + ((n - Math.floor(n)) - 0.5) * 0.1)); };
  reg('stock-market', 'Börsenspiel', '📈', 'Simulation', 'Kaufe günstig, verkaufe teuer! Alle Spieler sehen dieselben Kurse – wer wird am reichsten?', 'Aktie wählen · Kaufen/Verkaufen klicken', FREE, w => {
    const d = w.data || {}; const st = Object.assign({ cash: 1000, hold: [0, 0, 0, 0, 0] }, d.hold ? d : {}); let sel = 0, dirty = false, last = 0, msg = '', mt = 0;
    const tick = () => Math.floor(Date.now() / 3000), worth = () => st.cash + st.hold.reduce((s, n, i) => s + n * price(i, tick()), 0), save = () => { w.save(st); dirty = false; last = performance.now(); };
    return {
      flush: save,
      step(dt) {
        mt -= dt; const t = w.inp.tap;
        if (t) { STK.forEach((s, i) => { if (t.x > 10 && t.x < 150 && t.y > 40 + i * 52 && t.y < 88 + i * 52) sel = i; });
          [[1, 1], [10, 1], [1, -1], [10, -1]].forEach(([n, dir], k) => { if (t.x > 170 + k * 112 && t.x < 270 + k * 112 && t.y > 340 && t.y < 384) { const p = price(sel, tick()); if (dir > 0) { const m = Math.min(n, Math.floor(st.cash / p)); if (m > 0) { st.cash -= m * p; st.hold[sel] += m; dirty = true; } else { msg = 'Zu wenig Geld'; mt = 1.5; } } else { const m = Math.min(n, st.hold[sel]); if (m > 0) { st.cash += m * p; st.hold[sel] -= m; dirty = true; } else { msg = 'Keine Aktien'; mt = 1.5; } } } }); }
        w.score = worth(); if (dirty && performance.now() - last > 4000) save();
      },
      draw() {
        w.bg('#0b1226', '#10182f'); const tk = tick(); STK.forEach((s, i) => { const p = price(i, tk), up = p >= price(i, tk - 1); w.box(10, 40 + i * 52, 140, 48, i === sel ? '#3b5bdb' : '#ffffff18'); w.e(s[0], 30, 64 + i * 52, 26); w.tx(s[1], 60, 56 + i * 52, 13, '#fff', 'left'); w.tx('$' + p.toFixed(1), 60, 74 + i * 52, 13, up ? '#4cd98a' : '#ff5d6c', 'left'); w.tx('×' + st.hold[i], 142, 64 + i * 52, 12, '#ffe9a8', 'right'); });
        const g = w.g; g.strokeStyle = '#4f8cff'; g.lineWidth = 2; g.beginPath(); let mn = 1e9, mx = 0; for (let k = 0; k < 60; k++) { const p = price(sel, tk - 59 + k); mn = Math.min(mn, p); mx = Math.max(mx, p); } for (let k = 0; k < 60; k++) { const p = price(sel, tk - 59 + k), x = 180 + k * 7.5, y = 300 - (p - mn) / (mx - mn || 1) * 220; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        w.tx(`${STK[sel][0]} ${STK[sel][1]}  $${price(sel, tk).toFixed(2)}`, 400, 50, 20); w.tx(`💵 $${st.cash.toFixed(0)}   📊 Vermögen $${worth().toFixed(0)}`, 400, 322, 14, '#ffe9a8');
        ['Kaufen 1', 'Kaufen 10', 'Verkaufen 1', 'Verkaufen 10'].forEach((t, k) => { w.box(170 + k * 112, 340, 100, 44, k < 2 ? '#2e7d32' : '#c62828'); w.tx(t, 220 + k * 112, 362, 13); });
        const o = Object.entries(w.others).filter(([, x]) => typeof x.s === 'number'); o.slice(0, 4).forEach(([n, x], i) => w.tx(`${n}: $${x.s}`, 630, 18 + i * 16, 11, '#9aa6c9', 'right')); if (mt > 0) w.tx(msg, 400, 80, 14, '#ff8080');
      },
      pub() { return { s: Math.floor(worth()) }; }, noGhost: true
    };
  });

  /* ---------- Town Roleplay ---------- */
  const HATS = [['🎩', 20], ['👑', 100], ['🧢', 30], ['🤠', 50], ['🎓', 40]];
  reg('town-roleplay', 'Town Roleplay', '🏘️', 'Rollenspiel', 'Eine gemeinsame Stadt: laufe herum, sammle Münzen, kaufe Hüte und plaudere mit anderen Spielern.', 'Klick/Pfeile laufen · 1–5 Emotes · Enter = schreiben · E am Hutladen kaufen · H Hut wechseln', FREE, w => {
    const d = w.data || {}; const st = Object.assign({ coins: 0, hats: [], hat: -1 }, d.hats ? d : {}); let x = 320, y = 300, tx = null, ty = null, typing = false, txt = '', say = {}, coinsOn = [], cn = 0, dirty = false, last = 0, msg = '', mt = 0;
    const save = () => { w.save(st); dirty = false; last = performance.now(); };
    const EMO = ['👋', '😂', '❤️', '👍', '🎉'];
    const setSay = (n, s) => { say[n] = { s, t: 4 }; };
    return {
      flush: save,
      net(ev, from) { if (ev.say) setSay(from, String(ev.say).slice(0, 60)); },
      step(dt) {
        mt -= dt; cn -= dt; if (cn <= 0 && coinsOn.length < 8) { coinsOn.push({ x: 30 + Math.random() * 580, y: 120 + Math.random() * 250 }); cn = 2; }
        for (const k in say) { say[k].t -= dt; if (say[k].t <= 0) delete say[k]; }
        if (typing) { for (const c of w.inp.chars) { if (c === '\b') txt = txt.slice(0, -1); else if (txt.length < 60) txt += c; } if (w.inp.e.enter) { if (txt.trim()) { w.send({ say: txt }); setSay(w.name, txt); } txt = ''; typing = false; } return; }
        if (w.inp.e.enter) { typing = true; return; }
        for (let k = 0; k < 5; k++) if (w.inp.e[String(k + 1)]) { w.send({ say: EMO[k] }); setSay(w.name, EMO[k]); }
        const dx = (w.inp.k.right ? 1 : 0) - (w.inp.k.left ? 1 : 0), dy = (w.inp.k.down ? 1 : 0) - (w.inp.k.up ? 1 : 0);
        if (w.inp.tap) { tx = w.inp.tap.x; ty = w.inp.tap.y; } if (dx || dy) { x += dx * 170 * dt; y += dy * 170 * dt; tx = null; } else if (tx != null) { const ddx = tx - x, ddy = ty - y, dd = Math.hypot(ddx, ddy); if (dd < 4) tx = null; else { x += ddx / dd * 170 * dt; y += ddy / dd * 170 * dt; } }
        x = w.clamp(x, 14, 626); y = w.clamp(y, 100, 390);
        coinsOn = coinsOn.filter(c => { if (w.hit(x, y, c.x, c.y, 22)) { st.coins++; dirty = true; return false; } return true; }); w.score = st.coins;
        if (w.hit(x, y, 540, 120, 60)) { if (w.inp.e.e) { const k = HATS.findIndex((h, i) => !st.hats.includes(i)); if (k < 0) { msg = 'Du hast alle Hüte!'; mt = 2; } else if (st.coins >= HATS[k][1]) { st.coins -= HATS[k][1]; st.hats.push(k); st.hat = k; msg = `Neuer Hut ${HATS[k][0]}!`; mt = 2; dirty = true; } else { msg = `Zu wenig Münzen (${HATS[k][1]} nötig)`; mt = 2; } } }
        if (w.inp.e.h && st.hats.length) { st.hat = st.hats[(st.hats.indexOf(st.hat) + 1) % st.hats.length]; dirty = true; }
        if (dirty && performance.now() - last > 4000) save();
      },
      draw() {
        w.bg('#5ec8ff', '#a8e063'); w.box(0, 100, 640, 300, '#8bc34a'); w.box(0, 250, 640, 40, '#bdbdbd'); w.e('🏠', 90, 90, 60); w.e('🏫', 230, 90, 60); w.e('⛲', 380, 330, 50); w.e('🏪', 540, 110, 62); w.tx('Hutladen (E)', 540, 150, 12, '#223'); w.e('🌳', 40, 340, 44); w.e('🌳', 600, 320, 44);
        coinsOn.forEach(c => w.e('🪙', c.x, c.y, 20));
        const person = (n, px, py, face, hat) => { w.e(face, px, py, 30); if (hat != null && hat >= 0) w.e(HATS[hat][0], px, py - 20, 20); w.tx(n, px, py + 22, 10, '#223'); if (say[n]) { const s = say[n].s, bw = Math.max(30, s.length * 7 + 12); w.box(px - bw / 2, py - 56, bw, 20, '#fff'); w.tx(s, px, py - 46, 11, '#222'); } };
        for (const [n, o] of Object.entries(w.others)) if (typeof o.x === 'number') person(n, o.x, o.y, o.e || w.faceOf(n), o.h);
        person(w.name, x, y, w.faceOf(w.name), st.hat);
        w.tx('🪙 ' + st.coins, 40, 18, 18, '#223', 'left'); if (typing) { w.box(100, 365, 440, 28, '#000b'); w.tx('💬 ' + txt + '▌', 110, 379, 14, '#fff', 'left'); } if (mt > 0) w.tx(msg, 320, 60, 16, '#223');
      },
      pub() { return { x, y, e: w.faceOf(w.name), h: st.hat, s: st.coins }; }, noGhost: true
    };
  });

  /* ---------- Pixel-Leinwand (gemeinsam, bleibt gespeichert) ---------- */
  const PAL = ['#ffffff', '#c1c1c1', '#4c4c4c', '#000000', '#ef130b', '#ff7100', '#ffe400', '#00cc00', '#00b2ff', '#231fd3', '#a300ba', '#ff9bb5', '#a0522d', '#00ccc0', '#7f4e1a', '#6b8e23'];
  reg('pixel-canvas', 'Pixel Canvas', '🟦', 'Kreativ', 'Eine riesige Leinwand für alle: Male gemeinsam Pixel für Pixel – das Bild bleibt für immer gespeichert!', 'Farbe wählen · Maustaste halten und malen', { mode: 'free', max: 30, persist: true }, w => {
    const GW = 64, GH = 40, C = 8, OX = 64, OY = 20; let col = 3, lastI = -1, bucket = 0;
    return {
      step(dt) {
        bucket = Math.min(40, bucket + dt * 40); const t = w.inp.tap;
        if (t && t.y > 350) { const k = Math.floor((t.x - 64) / 32); if (k >= 0 && k < 16) col = k; }
        if (w.inp.down) { const cx = Math.floor((w.inp.x - OX) / C), cy = Math.floor((w.inp.y - OY) / C); if (cx >= 0 && cy >= 0 && cx < GW && cy < GH && bucket >= 1) { const i = cy * GW + cx; if (w.kv['p' + i] !== col) { w.set('p' + i, col); bucket--; } lastI = i; } }
      },
      draw() { w.bg('#222', '#222'); w.box(OX, OY, GW * C, GH * C, '#fff'); for (let i = 0; i < GW * GH; i++) { const v = w.kv['p' + i]; if (v != null) w.box(OX + (i % GW) * C, OY + Math.floor(i / GW) * C, C, C, PAL[v]); } PAL.forEach((c, k) => { w.box(64 + k * 32 + 2, 354, 28, 28, c); if (k === col) { w.g.strokeStyle = '#ffd166'; w.g.lineWidth = 3; w.g.strokeRect(64 + k * 32, 352, 32, 32); } }); w.tx('Gemeinsames Bild – für immer gespeichert', 320, 10, 11, '#aaa'); for (const [n, o] of Object.entries(w.others)) if (typeof o.x === 'number') w.tx(n, o.x, o.y - 14, 10, '#ffe9a8'); },
      pub() { return { x: w.inp.x, y: w.inp.y, e: '🖌️', z: 18 }; }
    };
  });
})();
