# 🧊 BlockVerse

Eine Spielplattform im Stil von Roblox – komplett ohne externe Abhängigkeiten (nur Node.js ≥ 18).

- **Accounts**: Registrieren/Anmelden (Passwörter mit scrypt gehasht, Session-Cookie).
- **Fortschritt wird gespeichert**: pro Account und Spiel (Highscores, Tycoon-Spielstände inkl. Offline-Einnahmen).
- **100 eingebaute Spiele** in 5 Kategorien – darunter **Criminal Tycoon** (mit Fahndungs-/Razzia-System und Polizei-Bestechung), 11 weitere Tycoons, Runner, Flappy, Dodge, Shooter, Memory, Climber u. v. m.
- **Eigene Spiele programmieren**: Im Reiter „Erstellen“ in JavaScript coden, testen, veröffentlichen. Andere Spieler können sie in der Community spielen. Spiele laufen in einer `sandbox`-iframe (kein Zugriff auf Account/Cookies).
- **Bestenlisten** pro Spiel.

## Starten

```bash
npm start          # http://localhost:3000   (PORT / DATA_DIR per Umgebungsvariable)
npm test           # API-Tests
```

Daten liegen in `data/db.json`.

## Eigene Spiele – Platform-API

```
Platform.canvas / Platform.ctx     Zeichenfeld 640×400
Platform.load()  -> Promise        gespeicherter Spielstand
Platform.save(obj)                 Fortschritt speichern
Platform.score(n)                  Bestenliste
Platform.engines.<name>(Platform, config)   fertige Engines nutzen:
  runner flappy dodge catch snake breakout shooter memory whack climber chase racer tycoon
```

## Aufbau

- `server.js` – HTTP-Server + JSON-API
- `public/engines.js` – Spiel-Engines · `public/games.js` – Katalog der 100 Spiele
- `public/app.js` – Oberfläche, Sandbox-Runner, Editor
