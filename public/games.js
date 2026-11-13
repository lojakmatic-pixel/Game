/* Katalog der 100 eingebauten Spiele (inspiriert von beliebten Roblox-Genres). */
(function (root) {
  'use strict';
  const G = [];
  const slug = t => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function add(title, icon, cat, desc, engine, cfg) {
    G.push({ id: slug(title), title, icon, cat, desc, engine, cfg: Object.assign({ title, icon }, cfg) });
  }
  const BG = {
    night: ['#0f1b3d', '#2c4a8a'], sky: ['#5ec8ff', '#d8f3ff'], lava: ['#3a0d0d', '#c0392b'], forest: ['#0f3d1f', '#3c8f4a'],
    space: ['#050510', '#2a1a5e'], candy: ['#ff9ad5', '#ffe0f3'], desert: ['#c98a3b', '#f6d58a'], ocean: ['#043a6b', '#1ea5c9'],
    snow: ['#9ecbff', '#ffffff'], dark: ['#111', '#333'], neon: ['#1a0033', '#7a00ff'], city: ['#2b2b3a', '#5d5d7a']
  };

  /* ---------- Tycoons (12) ---------- */
  function tycoon(title, icon, desc, cur, curName, click, clickName, bg, items) {
    const base = [15, 100, 1100, 12000, 130000, 1400000, 20000000], inc = [0.5, 4, 32, 260, 2100, 16000, 130000];
    add(title, icon, 'Tycoon', desc, 'tycoon', {
      cur, curName, clickEmoji: click, clickName, bg,
      items: items.map((it, i) => ({ name: it[0], emoji: it[1], cost: base[i], income: inc[i] }))
    });
  }
  // Criminal Tycoon – mit Fahndungs-/Razzia-System
  add('Criminal Tycoon', '🕶️', 'Tycoon', 'Baue dein Verbrecher-Imperium auf – aber pass auf die Fahndung auf! Bestich die Polizei, bevor es eine Razzia gibt.', 'tycoon', {
    cur: '$', curName: 'Geld', clickEmoji: '💰', clickName: 'Klau Geld!', bg: BG.dark, heat: true,
    heatName: 'Fahndung', bribeName: '🤝 Polizei bestechen', bribeMsg: 'Der Cop schaut weg… Fahndung sinkt!', raidMsg: '🚨 POLIZEI-RAZZIA!',
    items: [
      { name: 'Taschendieb', emoji: '🧤', cost: 15, income: 0.5 },
      { name: 'Autodieb', emoji: '🚗', cost: 100, income: 4 },
      { name: 'Ladenüberfall', emoji: '🏪', cost: 1100, income: 32 },
      { name: 'Schmugglerring', emoji: '📦', cost: 12000, income: 260 },
      { name: 'Hacker-Bande', emoji: '💻', cost: 130000, income: 2100 },
      { name: 'Bankraub-Crew', emoji: '🏦', cost: 1400000, income: 16000 },
      { name: 'Mafia-Boss', emoji: '🕴️', cost: 20000000, income: 130000 }
    ]
  });
  tycoon('Pizza Factory Tycoon', '🍕', 'Backe Pizzen und baue eine Fabrik.', '$', 'Geld', '🍕', 'Pizza backen', BG.desert, [['Teigroller', '🥖'], ['Pizzaofen', '🔥'], ['Lieferfahrrad', '🚲'], ['Pizzeria', '🏠'], ['Pizza-Truck', '🚚'], ['Fabrik', '🏭'], ['Pizza-Imperium', '🌍']]);
  tycoon('Lava Mine Tycoon', '🌋', 'Grabe nach Edelsteinen im Vulkan.', '💎', 'Edelsteine', '⛏️', 'Graben', BG.lava, [['Spitzhacke', '⛏️'], ['Lore', '🛒'], ['Bohrer', '🔩'], ['Schmelzofen', '♨️'], ['Bagger', '🚜'], ['Magma-Maschine', '🤖'], ['Vulkan-Kern', '🌋']]);
  tycoon('Space Station Tycoon', '🛰️', 'Erweitere deine Raumstation.', '⭐', 'Sterne', '🚀', 'Starten', BG.space, [['Solarpanel', '☀️'], ['Labor', '🧪'], ['Satellit', '🛰️'], ['Mondbasis', '🌙'], ['Marskolonie', '🔴'], ['Warp-Tor', '🌀'], ['Galaxie-Reich', '🌌']]);
  tycoon('Candy Empire Tycoon', '🍭', 'Süßigkeiten ohne Ende!', '🍬', 'Bonbons', '🍭', 'Lutschen', BG.candy, [['Zuckerwatte', '🍥'], ['Schoko-Brunnen', '🍫'], ['Gummibär-Presse', '🐻'], ['Eis-Wagen', '🍦'], ['Kuchen-Bäckerei', '🎂'], ['Bonbon-Fabrik', '🏭'], ['Zuckerland', '🏰']]);
  tycoon('Dino Zoo Tycoon', '🦖', 'Züchte Dinos und öffne den Zoo.', '$', 'Geld', '🥚', 'Ei ausbrüten', BG.forest, [['Baby-Dino', '🦕'], ['Gehege', '🌿'], ['Tickethäuschen', '🎟️'], ['T-Rex', '🦖'], ['Dino-Shop', '🛍️'], ['Wasser-Arena', '🌊'], ['Dino-Park', '🏞️']]);
  tycoon('Pirate Island Tycoon', '🏴‍☠️', 'Sammle Gold auf deiner Insel.', '🪙', 'Gold', '🪙', 'Gold graben', BG.ocean, [['Schatzkarte', '🗺️'], ['Rum-Fass', '🛢️'], ['Kanone', '💣'], ['Piratenschiff', '⛵'], ['Hafen', '⚓'], ['Kraken zähmen', '🐙'], ['Geisterflotte', '👻']]);
  tycoon('Mega Mall Tycoon', '🏬', 'Baue das größte Einkaufszentrum.', '$', 'Geld', '🛍️', 'Verkaufen', BG.city, [['Kiosk', '🏪'], ['Boutique', '👗'], ['Elektro-Laden', '📺'], ['Food Court', '🍔'], ['Kino', '🎬'], ['Aufzug-Etage', '🛗'], ['Mega-Tower', '🏙️']]);
  tycoon('Robot Factory Tycoon', '🤖', 'Roboter bauen, Gewinn machen.', '⚙️', 'Zahnräder', '🔧', 'Schrauben', BG.neon, [['Schraubenroboter', '🔩'], ['Förderband', '➡️'], ['Schweißarm', '🦾'], ['KI-Chip', '🧠'], ['Montagehalle', '🏗️'], ['Klon-Maschine', '🧬'], ['Robo-Stadt', '🌆']]);
  tycoon('Farm Life Tycoon', '🚜', 'Vom Gemüsebeet zur Mega-Farm.', '🌽', 'Ernte', '🌱', 'Gießen', BG.forest, [['Karottenbeet', '🥕'], ['Hühnerstall', '🐔'], ['Kuhweide', '🐄'], ['Traktor', '🚜'], ['Windmühle', '🌬️'], ['Hofladen', '🏡'], ['Agrar-Konzern', '🏭']]);
  tycoon('Hospital Tycoon', '🏥', 'Heile Patienten und expandiere.', '$', 'Geld', '💉', 'Behandeln', BG.sky, [['Pflaster-Station', '🩹'], ['Arztzimmer', '🩺'], ['Röntgenraum', '🩻'], ['Apotheke', '💊'], ['OP-Saal', '🏨'], ['Hubschrauber', '🚁'], ['Uniklinik', '🏥']]);
  tycoon('Car Dealer Tycoon', '🚘', 'Handle mit Traumautos.', '$', 'Geld', '🚗', 'Auto verkaufen', BG.night, [['Gebrauchtwagen', '🚙'], ['Werkstatt', '🔧'], ['Sportwagen', '🏎️'], ['Autohaus', '🏢'], ['Rennstrecke', '🏁'], ['Luxus-Flotte', '🚘'], ['Auto-Konzern', '🌐']]);

  /* ---------- Runner (9) ---------- */
  const run = (t, i, d, pl, ob, bg, gr) => add(t, i, 'Action', d, 'runner', { player: pl, obstacle: ob, bg, ground: gr, help: 'Springen: Leertaste / Klick' });
  run('Obby Runner', '🏃', 'Renne und spring über die Hindernisse.', '🏃', '🧱', BG.sky, '#4caf50');
  run('Desert Dash', '🌵', 'Flitze durch die Wüste.', '🐪', '🌵', BG.desert, '#c9a227');
  run('Ninja Sprint', '🥷', 'Ninja auf der Flucht.', '🥷', '🪨', BG.night, '#222');
  run('Zombie Escape', '🧟', 'Lauf vor den Zombies weg.', '🏃', '🪦', BG.dark, '#2f3b2f');
  run('Snow Dash', '⛄', 'Rutsche über die Eisfelder.', '🧒', '⛄', BG.snow, '#e8f4ff');
  run('Jungle Run', '🌴', 'Dschungel-Lauf mit Affen.', '🐒', '🪵', BG.forest, '#5d4037');
  run('Dino Run', '🦖', 'Der Klassiker mit Dino.', '🦖', '🌵', BG.sky, '#d7c9a0');
  run('Lava Jump', '🔥', 'Springe über die Flammen.', '🧗', '🔥', BG.lava, '#4a1a0a');
  run('Cat Parkour', '🐱', 'Katze im Parkour.', '🐱', '📦', BG.city, '#555');

  /* ---------- Flappy (7) ---------- */
  const fl = (t, i, d, pl, bg, pipe) => add(t, i, 'Arcade', d, 'flappy', { player: pl, bg, pipe, help: 'Flattern: Leertaste / Klick' });
  fl('Flappy Bird Blox', '🐦', 'Flattere durch die Röhren.', '🐦', BG.sky, '#3cb043');
  fl('Rocket Flap', '🚀', 'Rakete zwischen den Asteroiden.', '🚀', BG.space, '#7f8c8d');
  fl('Dragon Flap', '🐉', 'Drache im Gebirge.', '🐉', BG.night, '#6d4c41');
  fl('Bee Flap', '🐝', 'Biene zwischen den Zäunen.', '🐝', BG.forest, '#f1c40f');
  fl('Ghost Flap', '👻', 'Geist im Spukhaus.', '👻', BG.dark, '#8e44ad');
  fl('Fish Flap', '🐠', 'Fisch zwischen Korallen.', '🐠', BG.ocean, '#e67e22');
  fl('Balloon Flap', '🎈', 'Ballon zwischen Kakteen.', '🎈', BG.desert, '#2e7d32');

  /* ---------- Dodge (9) ---------- */
  const dg = (t, i, d, pl, hz, bg) => add(t, i, 'Action', d, 'dodge', { player: pl, hazards: hz, bg, help: 'Pfeiltasten oder Maus/Finger' });
  dg('Meteor Dodge', '☄️', 'Weiche den Meteoren aus.', '🧑‍🚀', ['☄️', '🪨'], BG.space);
  dg('Natural Disaster Survival', '🌪️', 'Überlebe die Naturkatastrophen.', '🧍', ['🌪️', '⛈️', '☄️', '🌊'], BG.sky);
  dg('Fireball Frenzy', '🔥', 'Feuerbälle regnen vom Himmel.', '🧙', ['🔥', '☄️'], BG.lava);
  dg('Bomb Squad', '💣', 'Bomben überall!', '🧍', ['💣', '🧨'], BG.dark);
  dg('Ice Rain', '🧊', 'Eiswürfel-Regen.', '🐧', ['🧊', '❄️'], BG.snow);
  dg('Arrow Storm', '🏹', 'Pfeile von oben.', '🛡️', ['🗡️', '🏹'], BG.night);
  dg('Alien Invasion Dodge', '👽', 'Außerirdische werfen Kram.', '🧑‍🚀', ['🛸', '👽', '☄️'], BG.neon);
  dg('Food Fight', '🍔', 'Weiche den Burgern aus.', '🧑‍🍳', ['🍔', '🍕', '🍟'], BG.candy);
  dg('Bat Cave', '🦇', 'Fledermäuse in der Höhle.', '🔦', ['🦇', '🪨'], BG.dark);

  /* ---------- Catch (8) ---------- */
  const ct = (t, i, d, good, bad, pl, bg) => add(t, i, 'Arcade', d, 'catch', { good, bad, player: pl, bg, help: 'Pfeiltasten oder Maus – Gutes fangen, Bomben meiden' });
  ct('Fruit Catcher', '🍎', 'Fange das Obst.', ['🍎', '🍌', '🍇', '🍓'], '💣', '🧺', BG.sky);
  ct('Coin Rain', '🪙', 'Es regnet Münzen!', ['🪙', '💰'], '🪨', '👛', BG.night);
  ct('Pet Treats', '🦴', 'Füttere dein Haustier.', ['🦴', '🥩'], '🧅', '🐶', BG.forest);
  ct('Candy Catch', '🍬', 'Süßes fangen.', ['🍬', '🍭', '🍫'], '🌶️', '🎃', BG.candy);
  ct('Star Collector', '⭐', 'Sammle Sterne.', ['⭐', '🌟'], '☄️', '🧑‍🚀', BG.space);
  ct('Gem Hunter', '💎', 'Edelsteine fangen.', ['💎', '🔷', '🔶'], '💣', '⛏️', BG.lava);
  ct('Sushi Catch', '🍣', 'Fang das Sushi.', ['🍣', '🍙', '🍤'], '🐡', '🥢', BG.ocean);
  ct('Snowball Saver', '❄️', 'Fange Schneeflocken.', ['❄️', '⛄'], '🔥', '🧤', BG.snow);

  /* ---------- Snake (6) ---------- */
  const sn = (t, i, d, food, color, bg) => add(t, i, 'Arcade', d, 'snake', { food, color, bg, help: 'Pfeiltasten / WASD oder Tippen' });
  sn('Snake Classic', '🐍', 'Der Klassiker.', '🍎', '#4cd964', BG.dark);
  sn('Worm Wars', '🪱', 'Wurm frisst Äpfel.', '🍏', '#e91e63', BG.forest);
  sn('Neon Snake', '🟣', 'Neon-Schlange.', '⚡', '#00e5ff', BG.neon);
  sn('Candy Snake', '🍬', 'Süße Schlange.', '🍭', '#ff6ec7', BG.candy);
  sn('Space Snake', '🌌', 'Schlange im All.', '⭐', '#ffd54f', BG.space);
  sn('Fish Snake', '🐟', 'Unterwasser-Schlange.', '🦐', '#26c6da', BG.ocean);

  /* ---------- Breakout (6) ---------- */
  const bo = (t, i, d, ball, rows, bg) => add(t, i, 'Arcade', d, 'breakout', { ball, rows, bg, help: 'Maus / Pfeiltasten' });
  bo('Brick Breaker', '🧱', 'Zerstöre alle Steine.', '⚽', null, BG.night);
  bo('Basketball Breaker', '🏀', 'Mit dem Basketball.', '🏀', ['#ff7043', '#ffa726', '#ffca28', '#ffee58', '#d4e157'], BG.city);
  bo('Planet Smash', '🪐', 'Schmeiß die Planeten.', '🌕', ['#7e57c2', '#5c6bc0', '#42a5f5', '#26c6da', '#26a69a'], BG.space);
  bo('Candy Crusher', '🍬', 'Schlag die Bonbons.', '🍪', ['#ec407a', '#f48fb1', '#ce93d8', '#b39ddb', '#90caf9'], BG.candy);
  bo('Ice Breaker', '🧊', 'Zerbrich das Eis.', '❄️', ['#e1f5fe', '#b3e5fc', '#81d4fa', '#4fc3f7', '#29b6f6'], BG.snow);
  bo('Lava Bricks', '🌋', 'Heiße Steine.', '🔥', ['#b71c1c', '#d32f2f', '#f4511e', '#fb8c00', '#fdd835'], BG.lava);

  /* ---------- Shooter (8) ---------- */
  const sh = (t, i, d, pl, en, bg) => add(t, i, 'Action', d, 'shooter', { player: pl, enemies: en, bg, help: 'Bewegen: Pfeile/Maus · Schießen: Leertaste/halten' });
  sh('Space Invaders Blox', '👾', 'Verteidige die Erde.', '🚀', ['👾', '🛸'], BG.space);
  sh('Zombie Defense', '🧟', 'Halte die Zombies auf.', '🔫', ['🧟', '🧟‍♀️'], BG.dark);
  sh('Alien Hunter', '👽', 'Jage Aliens.', '🛸', ['👽', '👾'], BG.neon);
  sh('Monster Slayer', '👹', 'Besiege die Monster.', '🏹', ['👹', '👺', '🐲'], BG.night);
  sh('Bug Blaster', '🐛', 'Ungeziefer vernichten.', '🪰', ['🐛', '🪲', '🐜'], BG.forest);
  sh('Pirate Cannon', '🏴‍☠️', 'Versenke Schiffe.', '⛵', ['🚢', '🦈'], BG.ocean);
  sh('Ghost Buster', '👻', 'Wer ruft die Geisterjäger?', '🔦', ['👻', '💀'], BG.dark);
  sh('Robot Rampage', '🤖', 'Roboter-Angriff.', '🦾', ['🤖', '🦿'], BG.city);

  /* ---------- Memory (7) ---------- */
  const me = (t, i, d, cards, back, bg) => add(t, i, 'Puzzle', d, 'memory', { cards, back, bg, help: 'Finde alle Paare – wenige Züge = hohe Punkte' });
  me('Memory Pets', '🐶', 'Finde die Haustier-Paare.', ['🐶', '🐱', '🐰', '🦊', '🐼', '🐸', '🐵', '🐯'], '#3b5bdb', BG.sky);
  me('Memory Food', '🍔', 'Essen-Paare.', ['🍔', '🍕', '🌭', '🍟', '🍩', '🍪', '🍣', '🌮'], '#e8590c', BG.candy);
  me('Memory Space', '🪐', 'Weltraum-Paare.', ['🪐', '🌙', '⭐', '☄️', '🚀', '🛸', '👽', '🌍'], '#5f3dc4', BG.space);
  me('Memory Ocean', '🐙', 'Meeres-Paare.', ['🐙', '🐠', '🦈', '🐳', '🦀', '🐡', '🐚', '🦑'], '#1971c2', BG.ocean);
  me('Memory Sports', '⚽', 'Sport-Paare.', ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🥊'], '#2f9e44', BG.forest);
  me('Memory Monsters', '👹', 'Monster-Paare.', ['👹', '👻', '💀', '🧟', '🧛', '🧙', '🐲', '👽'], '#862e9c', BG.neon);
  me('Memory Fruits', '🍓', 'Obst-Paare.', ['🍓', '🍇', '🍉', '🍍', '🥝', '🍒', '🍑', '🍋'], '#c2255c', BG.candy);

  /* ---------- Whack (7) ---------- */
  const wh = (t, i, d, tg, bad, bg) => add(t, i, 'Arcade', d, 'whack', { target: tg, bad, bg, help: '30 Sekunden – Ziele anklicken, Bomben meiden' });
  wh('Whack a Mole', '🐹', 'Hau auf den Maulwurf.', '🐹', '💣', BG.forest);
  wh('Zombie Pop', '🧟', 'Zombies tauchen auf.', '🧟', '👼', BG.dark);
  wh('Ghost Pop', '👻', 'Gespenster klatschen.', '👻', '🎃', BG.night);
  wh('Alien Pop', '👽', 'Aliens aus den Löchern.', '👽', '🧑‍🚀', BG.space);
  wh('Bug Smash', '🪲', 'Käfer zerquetschen.', '🪲', '🐝', BG.desert);
  wh('Slime Smash', '🟢', 'Schleim-Alarm.', '🟢', '💎', BG.neon);
  wh('Pet Pop', '🐰', 'Hasen fangen.', '🐰', '🦊', BG.candy);

  /* ---------- Climber (8) ---------- */
  const cl = (t, i, d, pl, plat, bg) => add(t, i, 'Abenteuer', d, 'climber', { player: pl, plat, bg, help: 'Pfeile / Maus – spring immer höher!', scoreLabel: 'Höhe' });
  cl('Tower of Doom', '🗼', 'Klettere den Turm hinauf.', '🧗', '#8bc34a', BG.sky);
  cl('Sky Obby', '☁️', 'Obby in den Wolken.', '🧍', '#ffffff', BG.sky);
  cl('Lava Climb', '🌋', 'Die Lava steigt.', '🧗', '#8d6e63', BG.lava);
  cl('Moon Jump', '🌙', 'Hüpfe zum Mond.', '🐇', '#cfd8dc', BG.space);
  cl('Candy Tower', '🍭', 'Turm aus Zuckerguss.', '🧁', '#f48fb1', BG.candy);
  cl('Ice Mountain', '🏔️', 'Besteige den Eisberg.', '🧑‍🦰', '#b3e5fc', BG.snow);
  cl('Cloud Hopper', '🦘', 'Känguru hüpft hoch.', '🦘', '#eceff1', BG.sky);
  cl('Jungle Vines', '🌿', 'Von Ast zu Ast.', '🐒', '#33691e', BG.forest);

  /* ---------- Chase (6) ---------- */
  const ch = (t, i, d, pl, en, coin, bg) => add(t, i, 'Abenteuer', d, 'chase', { player: pl, enemy: en, coin, bg, help: 'Pfeile oder Maus gedrückt halten – Münzen sammeln, nicht erwischen lassen' });
  ch('Tag Escape', '🏃', 'Lass dich nicht fangen.', '🏃', '😈', '🪙', BG.city);
  ch('Zombie Maze', '🧟', 'Sammle Gehirne… äh, Münzen.', '🧍', '🧟', '💰', BG.dark);
  ch('Ghost Mansion', '🏚️', 'Geisterhaus-Flucht.', '🔦', '👻', '🗝️', BG.night);
  ch('Pac Blox', '🟡', 'Punkte futtern.', '😮', '👻', '🍒', BG.neon);
  ch('Cat and Mouse', '🐭', 'Maus auf der Flucht.', '🐭', '🐱', '🧀', BG.desert);
  ch('Dragon Treasure', '🐲', 'Schatz vor dem Drachen retten.', '🧙', '🐲', '💎', BG.lava);

  /* ---------- Racer (7) ---------- */
  const rc = (t, i, d, pl, cars, bg) => add(t, i, 'Action', d, 'racer', { player: pl, cars, bg, help: 'Spur wechseln: ← → oder links/rechts tippen' });
  rc('Highway Racer', '🏎️', 'Rase über die Autobahn.', '🏎️', ['🚙', '🚕', '🚌'], BG.city);
  rc('Police Chase Racer', '🚓', 'Entkomme in der Stadt.', '🚗', ['🚓', '🚑', '🚒'], BG.night);
  rc('Moto Rush', '🏍️', 'Motorrad-Rausch.', '🏍️', ['🚚', '🚛', '🚜'], BG.desert);
  rc('Kart Blitz', '🏁', 'Kart-Rennen.', '🛻', ['🚧', '🛢️', '🚗'], BG.sky);
  rc('Space Lane', '🛸', 'Raumschiff-Spuren.', '🛸', ['☄️', '🛰️', '👾'], BG.space);
  rc('Snow Rally', '🚙', 'Rally im Schnee.', '🚙', ['⛄', '🌲', '🪨'], BG.snow);
  rc('Bus Driver', '🚌', 'Fahr den Bus sicher.', '🚌', ['🚲', '🛵', '🚗'], BG.forest);

  if (G.length !== 100) console.warn('Katalog hat ' + G.length + ' Spiele');
  root.BlockGames = G;
})(typeof window !== 'undefined' ? window : globalThis);
