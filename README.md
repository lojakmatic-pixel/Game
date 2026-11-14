---
title: Lumora Games
emoji: ✨
colorFrom: blue
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# ✨ Lumora Games

Eine Mehrspieler-Spielplattform im Stil von Roblox – komplett ohne externe Abhängigkeiten (nur Node.js ≥ 18).

- **Accounts**: Registrieren/Anmelden (Passwörter mit scrypt gehasht, Session-Cookie).
- **Fortschritt wird gespeichert**: pro Account und Spiel (Highscores, Tycoon-/Farm-/Pet-Spielstände, Offline-Einnahmen).
- **108 verschiedene Spiele**, jedes mit eigenen Regeln (Arcade, Puzzle, Wissen, Sport, Brettspiele, Versus-Arenen, Abenteuer, Tycoons, Simulationen, Rollenspiel, Kreativ und **8 echte 3D-Spiele**: Cube Runner, Sky Obby, Kart Race, Ring Flight, Maze, Tank Arena, Town, Stack Tower – mit Touch-Steuerung fürs iPad) – darunter **Criminal Tycoon** (Fahndung, Razzien, Polizei bestechen und **andere Spieler ausrauben**).
- **Alle Spiele sind Mehrspieler** (WebSocket-Räume mit bis zu 8 Spielern, Pixel Canvas bis 30):
  - **Rundenspiele** (die meisten): Alle im Raum spielen gleichzeitig dieselbe Runde mit **gleichem Seed** (gleiche Hindernisse/Aufgaben/Level), sehen sich live als Geister und bekommen eine Rangliste nach jeder Runde.
  - **Direkte Interaktion**: Brettspiele (Tic Tac Toe, Vier gewinnt, Gomoku, Nim, Mancala, Schere-Stein-Papier, Pong) und Arenen (Tag, Hot Potato, Sumo, King of the Hill, Orb Eater, Laser Arena, Bomber Arena, Coin Rush, Territory Paint, Tile Drop, Cops & Robbers, Draw & Guess, Tauziehen …) – Spieler beeinflussen sich direkt.
  - **Offene Welten** (ohne Runden): Tycoons, Farm, Pet Simulator, Börse, Stadt-Rollenspiel, Pixel-Leinwand.
  - Allein im Raum? Brettspiele und einige Arenen haben einen Computer-Gegner; Hot Potato braucht mindestens 2 Spieler.
- **Eigene Spiele programmieren**: Im Reiter „Erstellen“ mit JavaScript coden – auch Mehrspieler (`Platform.game(...)`, Events, geteilter Raum-Speicher). Spiele laufen in einer `sandbox`-iframe (kein Zugriff auf Account/Cookies).
- Chat im Raum, Vollbildmodus (⛶), Bestenlisten pro Spiel, Profil mit Fortschrittsübersicht, Sound (🔊 oben rechts abschaltbar), Countdown-Banner, Punkte-Popups.

## Starten

```bash
npm start          # http://localhost:3000   (PORT / DATA_DIR per Umgebungsvariable)
npm test           # API- + Mehrspieler-Tests
```

Daten liegen in `data/db.json`. Für schnelle Tests: `BV_LOBBY=1 BV_BREAK=2` verkürzt Lobby-/Pausenzeit.

## Eigene Spiele – Mehrspieler-API

```js
Platform.game({}, w => ({
  step(dt) {}, draw() {}, pub() { return { x, y }; },   // pub = Zustand für die anderen Spieler
  net(ev, from) {}, kv(key, value) {}                    // Events / geteilter Speicher
}));
```

`w.inp` Eingabe · `w.rnd()/w.r()/w.ri()/w.pick()` Zufall (für alle gleich) · `w.score/add/die/finish` · `w.others` · `w.send/sendTo` · `w.set/w.kv` · `w.roster/seat/solo/live()` · `w.data/save` · Zeichnen: `w.e/tx/box/circ/bg/hit`.

## Aufbau

- `server.js` – HTTP + JSON-API · `rooms.js` – WebSocket-Server, Räume, Runden (liest den Katalog aus `public/g*.js`)
- `public/runtime.js` – Spiel-Laufzeit im iframe (Eingabe, Netzwerk, Runden, Geister)
- `public/g1.js … g6.js` – die 108 Spiele (g6 = 3D, nutzt `public/vendor/three.min.js`, MIT-Lizenz) · `public/app.js` – Oberfläche, Editor
- Vertrauensmodell: Spiele laufen im Browser der Spieler (Prototyp, nicht manipulationssicher).

## Online stellen (Render)

1. Repo auf GitHub, dann auf render.com: **New → Blueprint** → Repo und Branch wählen (`render.yaml` wird erkannt).
2. Nach dem Deploy bekommst du eine Adresse wie `https://blockverse.onrender.com` – das ist der Spiel-Link.
3. Die Platte (`/data`) speichert Accounts, Fortschritt und die Pixel-Leinwand. Ohne Platte gehen Daten bei jedem Neustart verloren.

Läuft auch mit jedem anderen Docker-Host (Fly.io, Railway, VPS): `docker build -t blockverse . && docker run -p 80:10000 -v bv:/data blockverse`. Hinter HTTPS-Proxy `BV_TRUST_PROXY=1` setzen (Secure-Cookie, echte Client-IP).
