// Katalog (Metadaten) – die Spiel-Dateien g*.js rufen reg(...) auf.
window.CATALOG = [];
window.reg = (id, title, icon, cat, desc, help, opt) => window.CATALOG.push(Object.assign({ id, title, icon, cat, desc, help, mode: 'round', dur: 60, max: 8 }, opt));
