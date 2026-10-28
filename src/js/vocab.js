// Kontrolliertes Vokabular: interne Schlüssel -> deutsche Bezeichnungen.
// Die Pilzdatenbank (mushrooms.json) verwendet ausschließlich diese Schlüssel.

export const EDIBILITY = {
  essbar:       { label: 'Essbar',             short: 'Essbar',        order: 1 },
  bedingt:      { label: 'Bedingt essbar',     short: 'Bedingt essbar', order: 2 },
  ungeniessbar: { label: 'Ungenießbar',        short: 'Ungenießbar',   order: 3 },
  giftig:       { label: 'Giftig',             short: 'Giftig',        order: 4 },
  toedlich:     { label: 'Tödlich giftig',     short: 'Tödlich giftig', order: 5 },
};

export const COLORS = {
  weiss:   { label: 'Weiß',     hex: '#f4f1ea' },
  creme:   { label: 'Creme',    hex: '#ead9b5' },
  gelb:    { label: 'Gelb',     hex: '#e9c13a' },
  orange:  { label: 'Orange',   hex: '#e08a2c' },
  rot:     { label: 'Rot',      hex: '#c5352b' },
  rosa:    { label: 'Rosa',     hex: '#e7a7a0' },
  braun:   { label: 'Braun',    hex: '#8a5a33' },
  oliv:    { label: 'Oliv',     hex: '#8a8a3e' },
  gruen:   { label: 'Grün',     hex: '#6e9a52' },
  grau:    { label: 'Grau',     hex: '#9a9a94' },
  violett: { label: 'Violett',  hex: '#8a64a8' },
  schwarz: { label: 'Schwarz',  hex: '#2a2a2a' },
};

export const CAP_SHAPES = {
  kugelig:   'Kugelig',
  gewoelbt:  'Gewölbt / polsterförmig',
  flach:     'Flach ausgebreitet',
  trichter:  'Trichterförmig / vertieft',
  kegelig:   'Kegelig / glockig',
  gebuckelt: 'Mit Buckel',
  walze:     'Walzen- / eiförmig',
  konsole:   'Konsolen- / muschelförmig',
  sonderform:'Sonderform (krause, wabig, ohrförmig …)',
};

export const HYMENOPHORE = {
  lamellen: 'Lamellen',
  roehren:  'Röhren (schwammartig, ablösbar)',
  poren:    'Poren (fest, Baumpilz)',
  leisten:  'Leisten (gabelig, stumpf)',
  stacheln: 'Stacheln',
  sonstige: 'Sonstige (glatt, wabig, innen sporenbildend)',
};

export const STEM_SHAPES = {
  schlank:    'Schlank / zylindrisch',
  bauchig:    'Bauchig / keulig',
  kurz:       'Kurz, gedrungen',
  seitlich:   'Seitlich / exzentrisch',
  fehlend:    'Kein Stiel erkennbar',
};

export const STEM_BASE = {
  unauffaellig: 'Unauffällig',
  knollig:      'Knollig verdickt (ohne Scheide)',
  volva:        'Knolle mit häutiger Scheide (Volva)',
  wulst:        'Knolle mit Wulst / Warzengürteln',
  buschelig:    'Büschelig verwachsen',
  fehlend:      'Kein Stiel / sitzend',
};

export const RING = {
  ja:   'Ring / Manschette vorhanden',
  nein: 'Kein Ring',
};

export const SMELLS = {
  unauffaellig: 'Unauffällig',
  angenehm:     'Angenehm pilzig / nussig',
  fruchtig:     'Fruchtig (z. B. Aprikose)',
  mehlartig:    'Mehlartig / gurkenartig',
  rettich:      'Rettichartig',
  anis:         'Anis / Mandel',
  phenol:       'Tinte / Karbol / Phenol',
  suesslich:    'Süßlich / honigartig',
  unangenehm:   'Unangenehm / aasartig',
};

export const SPORE = {
  weiss:       'Weiß',
  creme:       'Creme / blassgelb',
  rosa:        'Rosa',
  ocker:       'Ocker',
  rostbraun:   'Rostbraun',
  braun:       'Braun',
  olivbraun:   'Olivbraun',
  purpurbraun: 'Purpurbraun bis schwarzviolett',
  schwarz:     'Schwarz',
};

export const HABITATS = {
  laubwald:  'Laubwald',
  nadelwald: 'Nadelwald',
  wiese:     'Wiese / Weide',
  park:      'Park / Garten',
  holz:      'Auf Holz / Baumstumpf',
  kompost:   'Laubstreu / Kompost',
  waldrand:  'Waldrand / Lichtung',
  kalk:      'Kalkboden',
  sauer:     'Saurer Boden / Sand',
  feucht:    'Feucht / Auwald / Moor',
};

export const TREES = [
  'Buche', 'Eiche', 'Hainbuche', 'Birke', 'Pappel', 'Weide', 'Esche', 'Ulme', 'Holunder',
  'Obstbäume', 'Robinie', 'Fichte', 'Kiefer', 'Tanne', 'Lärche',
];

export const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const CATEGORIES = {
  speisepilze: { label: 'Speisepilze', desc: 'Essbar & bedingt essbar', cls: 'c-edible',
    test: (m) => m.edibility === 'essbar' || m.edibility === 'bedingt' },
  giftpilze:   { label: 'Giftpilze', desc: 'Giftig & tödlich', cls: 'c-toxic',
    test: (m) => m.edibility === 'giftig' || m.edibility === 'toedlich' },
  baumpilze:   { label: 'Baumpilze', desc: 'Wachsen auf Holz', cls: 'c-tree',
    test: (m) => m.habitat?.substrate === 'holz' },
  roehrlinge:  { label: 'Röhrlinge', desc: 'Schwamm statt Lamellen', cls: 'c-bolete',
    test: (m) => m.hymenophore?.type === 'roehren' },
  lamellenpilze: { label: 'Lamellenpilze', desc: 'Blätter unter dem Hut', cls: 'c-gill',
    test: (m) => m.hymenophore?.type === 'lamellen' },
  ungeniessbar: { label: 'Ungenießbar', desc: 'Kein Speisewert', cls: 'c-inedible',
    test: (m) => m.edibility === 'ungeniessbar' },
};
