// Hilfsfunktionen: sicheres Escaping, Normalisierung, Formatierung.

/** Escaped beliebigen Text für die Ausgabe in HTML (Schutz vor XSS). */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Normalisiert Text für die Suche: klein, Umlaute aufgelöst, Akzente entfernt. */
export function norm(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Erlaubt nur IDs aus Kleinbuchstaben, Ziffern und Bindestrichen. */
export function safeId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  if (Number.isNaN(d.getTime())) return esc(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function debounce(fn, ms = 120) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Text für unbekannte Angaben einheitlich kennzeichnen. */
export function orUnknown(value) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return '<span class="unknown">Unbekannt / nicht angegeben</span>';
  }
  return esc(Array.isArray(value) ? value.join(', ') : value);
}

/** Verkleinert ein Bild (File) im Browser auf max. Kantenlänge und liefert eine JPEG-Data-URL. */
export function resizeImage(file, maxEdge = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) { reject(new Error('Die Datei ist kein Bild.')); return; }
    if (file.size > 40 * 1024 * 1024) { reject(new Error('Das Bild ist zu groß (max. 40 MB).')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) { reject(e); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Das Bild konnte nicht gelesen werden (Format evtl. nicht unterstützt).')); };
    img.src = url;
  });
}

/** Prüft, ob eine Data-URL ein unbedenkliches Rasterbild ist. */
export function isSafeImageDataUrl(s) {
  return typeof s === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(s);
}
