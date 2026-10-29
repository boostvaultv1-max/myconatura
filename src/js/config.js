// ============================================================
//  MycoNatura – Einstellungen für den Creator
//  Trage hier deinen Spenden-Link ein. Erlaubt sind nur https-Adressen,
//  z. B. PayPal.me, Ko-fi, Buy Me a Coffee, Liberapay oder GitHub Sponsors.
//  Solange "url" leer ist, wird kein Spenden-Button angezeigt.
//  Nach einer Änderung in service-worker.js die APP_VERSION erhöhen.
// ============================================================

export const DONATION = {
  url: 'https://www.paypal.me/MyCoNature', // z. B. 'https://www.paypal.me/DEINNAME' oder 'https://ko-fi.com/DEINNAME'
  creator: 'Finn',      // z. B. 'Max Mustermann' (optional)
  buttonLabel: 'Jetzt spenden',
  text: 'MycoNatura ist kostenlos, werbefrei und sammelt keine Daten. Wenn dir die App gefällt, kannst du die Weiterentwicklung mit einer freiwilligen Spende unterstützen.',
};

// Titelbild der Startseite: ID einer Art aus src/data/mushrooms.json (braucht ein Foto in photos.json)
export const HERO_SPECIES = 'fichten-steinpilz';
