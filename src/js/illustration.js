// Erzeugt eigene, schematische SVG-Illustrationen aus den Merkmalen eines Pilzes.
// Es werden keine fremden Bilder verwendet – alle Grafiken entstehen hier im Code
// (eigene Arbeit, frei nutzbar). Sie ersetzen KEIN Foto zur Bestimmung.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const c = (v, d) => (COLOR_RE.test(v || '') ? v : d);

function background(uidp, r, opts) {
  const forest = opts.forest !== false;
  let s = `
  <defs>
    <linearGradient id="${uidp}bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${forest ? '#dfe6d2' : '#e8eedc'}"/>
      <stop offset=".62" stop-color="${forest ? '#c9d5bb' : '#d8e4c4'}"/>
      <stop offset="1" stop-color="#a8b98f"/>
    </linearGradient>
    <radialGradient id="${uidp}light" cx=".72" cy=".1" r=".8">
      <stop offset="0" stop-color="#fff9e6" stop-opacity=".85"/>
      <stop offset="1" stop-color="#fff9e6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${uidp}ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6f8a4d"/>
      <stop offset="1" stop-color="#4a6233"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#${uidp}bg)"/>
  <rect width="400" height="300" fill="url(#${uidp}light)"/>`;
  if (forest) {
    // ferne Baumstämme
    for (let i = 0; i < 6; i++) {
      const x = 20 + i * 70 + r() * 30;
      const w = 8 + r() * 14;
      s += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="250" fill="#8c9c80" opacity="${(0.18 + r() * 0.2).toFixed(2)}"/>`;
    }
  }
  s += `<path d="M0 248 C 70 238, 140 252, 210 244 S 340 240, 400 248 V300 H0Z" fill="url(#${uidp}ground)"/>`;
  // Gras / Moos
  for (let i = 0; i < 38; i++) {
    const x = r() * 400; const h = 8 + r() * 18; const lean = (r() - 0.5) * 10;
    s += `<path d="M${x.toFixed(1)} 252 q ${(lean / 2).toFixed(1)} ${(-h / 2).toFixed(1)} ${lean.toFixed(1)} ${(-h).toFixed(1)}" stroke="#56743a" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>`;
  }
  // Laub
  const leafCols = ['#b07a3a', '#c4924a', '#8f5d2c', '#a8743f'];
  for (let i = 0; i < 7; i++) {
    const x = r() * 400; const y = 262 + r() * 30; const rot = r() * 180;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="9" ry="4" fill="${leafCols[i % 4]}" opacity=".85" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return s;
}

function capPath(shape, cx, cb, w) {
  switch (shape) {
    case 'flat':
      return `M${cx - w} ${cb} C ${cx - w} ${cb - 34}, ${cx - w * 0.5} ${cb - 46}, ${cx} ${cb - 46} S ${cx + w} ${cb - 34}, ${cx + w} ${cb} Q ${cx} ${cb - 8} ${cx - w} ${cb} Z`;
    case 'umbo':
      return `M${cx - w} ${cb} C ${cx - w} ${cb - 28}, ${cx - w * 0.45} ${cb - 40}, ${cx - 22} ${cb - 44} C ${cx - 18} ${cb - 66}, ${cx + 18} ${cb - 66}, ${cx + 22} ${cb - 44} C ${cx + w * 0.45} ${cb - 40}, ${cx + w} ${cb - 28}, ${cx + w} ${cb} Q ${cx} ${cb - 8} ${cx - w} ${cb} Z`;
    case 'funnel':
      return `M${cx - w} ${cb - 40} C ${cx - w * 0.5} ${cb - 22}, ${cx + w * 0.5} ${cb - 22}, ${cx + w} ${cb - 40} C ${cx + w - 4} ${cb - 20}, ${cx + 30} ${cb + 8}, ${cx + 16} ${cb + 22} L ${cx - 16} ${cb + 22} C ${cx - 30} ${cb + 8}, ${cx - w + 4} ${cb - 20}, ${cx - w} ${cb - 40} Z`;
    case 'conical':
      return `M${cx - w * 0.72} ${cb} C ${cx - w * 0.66} ${cb - 50}, ${cx - 26} ${cb - 104}, ${cx} ${cb - 108} C ${cx + 26} ${cb - 104}, ${cx + w * 0.66} ${cb - 50}, ${cx + w * 0.72} ${cb} Q ${cx} ${cb - 8} ${cx - w * 0.72} ${cb} Z`;
    case 'bell':
      return `M${cx - w * 0.8} ${cb} C ${cx - w * 0.82} ${cb - 70}, ${cx - w * 0.4} ${cb - 92}, ${cx} ${cb - 92} S ${cx + w * 0.82} ${cb - 70}, ${cx + w * 0.8} ${cb} Q ${cx} ${cb - 8} ${cx - w * 0.8} ${cb} Z`;
    case 'hemisphere':
      return `M${cx - w} ${cb} C ${cx - w} ${cb - 92}, ${cx + w} ${cb - 92}, ${cx + w} ${cb} Q ${cx} ${cb - 10} ${cx - w} ${cb} Z`;
    case 'convex':
    default:
      return `M${cx - w} ${cb} C ${cx - w} ${cb - 62}, ${cx - w * 0.55} ${cb - 76}, ${cx} ${cb - 76} S ${cx + w} ${cb - 62}, ${cx + w} ${cb} Q ${cx} ${cb - 8} ${cx - w} ${cb} Z`;
  }
}

function capWidthFactor(shape) {
  return { conical: 0.72, bell: 0.8 }[shape] || 1;
}

function underside(p, cx, cb, w, r) {
  // Fruchtschicht (Lamellen/Röhren/Leisten/Stacheln) als sichtbare Unterseite
  const type = p.gills || 'lamellen';
  const under = c(p.under, '#f1ead8');
  const rx = w * capWidthFactor(p.capShape) - 4;
  let s = `<ellipse cx="${cx}" cy="${cb + 2}" rx="${rx}" ry="15" fill="${under}"/>`;
  if (type === 'lamellen' || type === 'leisten') {
    const n = type === 'leisten' ? 12 : 26;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = cx - rx + t * rx * 2;
      const yEdge = cb + 2 + Math.sin(Math.PI * t) * 14;
      s += `<path d="M${x.toFixed(1)} ${(cb + 1).toFixed(1)} L ${(cx + (x - cx) * 0.18).toFixed(1)} ${(yEdge).toFixed(1)}" stroke="${shade(under, -0.25)}" stroke-width="${type === 'leisten' ? 2.6 : 1.1}" opacity=".7"/>`;
    }
  } else if (type === 'roehren' || type === 'poren') {
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI; const rr = Math.sqrt(r());
      const x = cx + Math.cos(a) * rx * rr * (r() < 0.5 ? 1 : -1);
      const y = cb + 3 + Math.sin(a) * 12 * rr;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" fill="${shade(under, -0.3)}" opacity=".6"/>`;
    }
  } else if (type === 'stacheln') {
    for (let i = 0; i < 40; i++) {
      const x = cx - rx + 8 + r() * (rx * 2 - 16);
      const y = cb + 4 + r() * 9;
      s += `<path d="M${(x - 2).toFixed(1)} ${y.toFixed(1)} l 2 6 l 2 -6 z" fill="${shade(under, -0.2)}"/>`;
    }
  }
  return s;
}

function stem(p, uidp, cx, top, bottom) {
  const col = c(p.stem, '#efe6d2');
  const shape = p.stemShape || 'slender';
  let tw = 14, bw = 17, bulge = 0;
  if (shape === 'bulbous') { tw = 18; bw = 30; bulge = 18; }
  if (shape === 'thick') { tw = 22; bw = 26; }
  if (shape === 'tall') { tw = 10; bw = 14; }
  if (shape === 'short') { tw = 18; bw = 20; }
  const mid = (top + bottom) / 2;
  let s = `<defs><linearGradient id="${uidp}stem" x1="0" x2="1">
    <stop offset="0" stop-color="${shade(col, -0.18)}"/><stop offset=".45" stop-color="${col}"/><stop offset="1" stop-color="${shade(col, -0.28)}"/>
  </linearGradient></defs>`;
  s += `<path d="M${cx - tw} ${top} C ${cx - tw - bulge * 0.2} ${mid}, ${cx - bw - bulge * 0.4} ${bottom - 18}, ${cx - bw} ${bottom - 4} Q ${cx} ${bottom + 6} ${cx + bw} ${bottom - 4} C ${cx + bw + bulge * 0.4} ${bottom - 18}, ${cx + tw + bulge * 0.2} ${mid}, ${cx + tw} ${top} Z" fill="url(#${uidp}stem)"/>`;
  if (p.net) {
    for (let y = top + 6; y < top + (bottom - top) * 0.6; y += 7) {
      s += `<path d="M${cx - tw + 2} ${y} q 6 4 12 0 t 12 0 t 12 0" stroke="${c(p.net, '#d9c9a8')}" stroke-width="1.1" fill="none" opacity=".85" transform="translate(${-2 + ((y / 7) % 2) * 3} 0)"/>`;
    }
  }
  if (p.stemScales) {
    for (let y = top + 8; y < bottom - 8; y += 9) {
      for (let x = cx - tw + 3; x < cx + tw - 2; x += 7) {
        s += `<path d="M${x} ${y} l 3 4 l 3 -4" stroke="${c(p.stemScales, '#3a2d22')}" stroke-width="1.6" fill="none" opacity=".75"/>`;
      }
    }
  }
  if (p.snake) {
    for (let y = top + 10; y < bottom - 10; y += 11) {
      s += `<path d="M${cx - tw + 1} ${y} q ${tw} 5 ${tw * 2 - 2} 0" stroke="${c(p.snake, '#7a5a3a')}" stroke-width="2.2" fill="none" opacity=".55"/>`;
    }
  }
  if (p.ring) {
    const ry = top + Math.min(26, (bottom - top) * 0.22);
    const rc = c(p.ringColor, shade(col, 0.15));
    s += `<path d="M${cx - tw - 9} ${ry} Q ${cx} ${ry - 7} ${cx + tw + 9} ${ry} L ${cx + tw + 4} ${ry + 12} Q ${cx} ${ry + 18} ${cx - tw - 4} ${ry + 12} Z" fill="${rc}" stroke="${shade(rc, -0.2)}" stroke-width="1"/>`;
  }
  if (p.volva) {
    const vc = c(p.volvaColor, '#f2ede0');
    s += `<path d="M${cx - bw - 10} ${bottom - 30} C ${cx - bw - 16} ${bottom - 4}, ${cx - bw} ${bottom + 8}, ${cx} ${bottom + 8} S ${cx + bw + 16} ${bottom - 4}, ${cx + bw + 10} ${bottom - 30} L ${cx + bw + 2} ${bottom - 22} Q ${cx} ${bottom - 10} ${cx - bw - 2} ${bottom - 22} Z" fill="${vc}" stroke="${shade(vc, -0.18)}" stroke-width="1.2"/>`;
  }
  if (p.wulst) {
    s += `<path d="M${cx - bw - 4} ${bottom - 18} Q ${cx} ${bottom - 10} ${cx + bw + 4} ${bottom - 18}" stroke="#f4f0e6" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${cx - bw - 2} ${bottom - 28} Q ${cx} ${bottom - 20} ${cx + bw + 2} ${bottom - 28}" stroke="#f4f0e6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;
  }
  return s;
}

function capDecor(p, cx, cb, w, r, clipId) {
  let s = `<g clip-path="url(#${clipId})">`;
  if (p.warts) {
    for (let i = 0; i < 26; i++) {
      const x = cx - w + 10 + r() * (w * 2 - 20); const y = cb - 8 - r() * 66;
      const rr = 2.2 + r() * 3.6;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr * 0.7).toFixed(1)}" fill="${c(p.warts, '#f6f2e8')}" opacity=".95"/>`;
    }
  }
  if (p.scales) {
    for (let i = 0; i < 34; i++) {
      const x = cx - w + 10 + r() * (w * 2 - 20); const y = cb - 6 - r() * 60;
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l 5 -3 l 5 3" stroke="${c(p.scales, '#5a3a1e')}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
    }
  }
  if (p.fibrils) {
    for (let i = 0; i < 18; i++) {
      const x = cx - w * 0.9 + (i / 17) * w * 1.8;
      s += `<path d="M${cx} ${cb - 70} L ${x.toFixed(1)} ${cb}" stroke="${c(p.fibrils, '#3a3a2a')}" stroke-width="1" opacity=".22"/>`;
    }
  }
  if (p.zones) {
    for (let i = 1; i < 4; i++) {
      s += `<ellipse cx="${cx}" cy="${cb + 4}" rx="${w * (1 - i * 0.2)}" ry="${(60 - i * 14)}" fill="none" stroke="${c(p.zones, '#7a4a2a')}" stroke-width="3" opacity=".25"/>`;
    }
  }
  s += '</g>';
  return s;
}

function standardMushroom(p, uidp, r, cx = 200, scale = 1, groundY = 252) {
  const shape = p.capShape || 'convex';
  const w = 95 * scale;
  const stemLen = (p.stemShape === 'tall' ? 120 : p.stemShape === 'short' ? 52 : 82) * scale;
  const cb = groundY - stemLen;
  const capCol = c(p.cap, '#a0683a');
  const cap2 = c(p.cap2, shade(capCol, -0.3));
  const g = `${uidp}c${Math.round(cx)}`;
  let s = `<defs>
    <radialGradient id="${g}" cx=".38" cy=".25" r=".9">
      <stop offset="0" stop-color="${shade(capCol, 0.22)}"/><stop offset=".55" stop-color="${capCol}"/><stop offset="1" stop-color="${cap2}"/>
    </radialGradient>
    <clipPath id="${g}clip"><path d="${capPath(shape, cx, cb, w)}"/></clipPath>
  </defs>`;
  s += `<ellipse cx="${cx}" cy="${groundY + 2}" rx="${60 * scale}" ry="${8 * scale}" fill="#2f3f22" opacity=".28"/>`;
  s += stem(p, uidp + Math.round(cx), cx, cb + 6, groundY);
  if (shape !== 'funnel') s += underside(p, cx, cb, w, r);
  else {
    // Trichter: herablaufende Leisten/Lamellen sichtbar am Übergang
    const under = c(p.under, capCol);
    s += `<path d="M${cx - w + 6} ${cb - 36} C ${cx - 30} ${cb + 6}, ${cx - 18} ${cb + 20}, ${cx - 14} ${cb + 30} L ${cx + 14} ${cb + 30} C ${cx + 18} ${cb + 20}, ${cx + 30} ${cb + 6}, ${cx + w - 6} ${cb - 36} Z" fill="${shade(under, -0.05)}"/>`;
    for (let i = 0; i < 14; i++) {
      const t = i / 13; const x = cx - w + 10 + t * (w * 2 - 20);
      s += `<path d="M${x.toFixed(1)} ${cb - 34} Q ${(cx + (x - cx) * 0.4).toFixed(1)} ${cb} ${(cx + (x - cx) * 0.12).toFixed(1)} ${cb + 28}" stroke="${shade(under, -0.3)}" stroke-width="${p.gills === 'leisten' ? 2.2 : 1.1}" fill="none" opacity=".7"/>`;
    }
  }
  s += `<path d="${capPath(shape, cx, cb, w)}" fill="url(#${g})"/>`;
  s += capDecor(p, cx, cb, w, r, `${g}clip`);
  // Glanzlicht
  if (shape !== 'funnel') s += `<ellipse cx="${cx - w * 0.35}" cy="${cb - 48 * (shape === 'flat' ? 0.6 : 1)}" rx="${w * 0.22}" ry="9" fill="#fff" opacity=".18"/>`;
  return s;
}

function trunk(uidp, x = 0, w = 120) {
  return `<defs><linearGradient id="${uidp}bark" x1="0" x2="1">
      <stop offset="0" stop-color="#5a4632"/><stop offset=".6" stop-color="#7a6248"/><stop offset="1" stop-color="#4a3826"/>
    </linearGradient></defs>
    <rect x="${x}" y="0" width="${w}" height="262" fill="url(#${uidp}bark)"/>
    ${[18, 44, 70, 96].map((dx) => `<path d="M${x + dx} 0 C ${x + dx + 6} 80, ${x + dx - 6} 170, ${x + dx + 4} 262" stroke="#3b2d1f" stroke-width="2" fill="none" opacity=".45"/>`).join('')}`;
}

function bracket(p, uidp, r) {
  const col = c(p.cap, '#9a8a78'); const col2 = c(p.cap2, shade(col, -0.35)); const under = c(p.under, '#e9e2d0');
  let s = trunk(uidp, 0, 130);
  const tiers = p.tiers || 3;
  for (let i = 0; i < tiers; i++) {
    const y = 70 + i * (150 / tiers) + r() * 8;
    const w = (p.hoof ? 120 : 150) - i * 12; const h = p.hoof ? 52 : 30;
    const g = `${uidp}br${i}`;
    s += `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(col, 0.15)}"/><stop offset="1" stop-color="${col2}"/></linearGradient></defs>`;
    if (p.hoof) {
      s += `<path d="M126 ${y} C ${126 + w * 0.7} ${y - 4}, ${126 + w} ${y + h * 0.4}, ${126 + w * 0.9} ${y + h} L 126 ${y + h + 6} Z" fill="url(#${g})"/>`;
      for (let k = 1; k < 4; k++) s += `<path d="M126 ${y + k * 12} C ${126 + w * 0.6} ${y + k * 12 - 3}, ${126 + w * 0.85} ${y + k * 12 + 2}, ${126 + w * (0.9 - k * 0.02)} ${y + k * 12 + 4}" stroke="${shade(col, -0.4)}" stroke-width="1.6" fill="none" opacity=".5"/>`;
      s += `<path d="M126 ${y + h + 6} L ${126 + w * 0.9} ${y + h} Q ${126 + w * 0.5} ${y + h + 12} 126 ${y + h + 6}" fill="${under}"/>`;
    } else {
      s += `<path d="M126 ${y} C ${126 + w * 0.5} ${y - 10}, ${126 + w} ${y + 2}, ${126 + w} ${y + h * 0.7} Q ${126 + w * 0.6} ${y + h + 6} 126 ${y + h} Z" fill="url(#${g})"/>`;
      s += `<path d="M126 ${y + h} Q ${126 + w * 0.6} ${y + h + 6} ${126 + w} ${y + h * 0.7} Q ${126 + w * 0.6} ${y + h + 14} 126 ${y + h + 8} Z" fill="${under}"/>`;
      if (p.zones) {
        const zc = ['#3b4a6b', '#c9b9a0', '#6b4a2a', '#e6dccb', '#4a5a3a'];
        for (let k = 1; k < 5; k++) s += `<path d="M126 ${y + 2 + k * 4} C ${126 + w * 0.5} ${y - 8 + k * 4}, ${126 + w - k * 6} ${y + k * 3}, ${126 + w - k * 7} ${y + h * 0.7}" stroke="${zc[k % zc.length]}" stroke-width="3" fill="none" opacity=".7"/>`;
      }
    }
  }
  return s;
}

function oyster(p, uidp, r) {
  const col = c(p.cap, '#8a8a90'); const under = c(p.under, '#f1ece2');
  let s = trunk(uidp, 0, 120);
  [[80, 150], [120, 120], [170, 100]].forEach(([y, w], i) => {
    const g = `${uidp}oy${i}`;
    s += `<defs><radialGradient id="${g}" cx=".2" cy=".4" r="1"><stop offset="0" stop-color="${shade(col, 0.25)}"/><stop offset="1" stop-color="${shade(col, -0.25)}"/></radialGradient></defs>`;
    s += `<path d="M116 ${y + 16} C ${150} ${y - 12}, ${116 + w} ${y - 14}, ${116 + w} ${y + 14} Q ${116 + w * 0.6} ${y + 46} 116 ${y + 30} Z" fill="${under}"/>`;
    for (let k = 0; k < 10; k++) s += `<path d="M118 ${y + 26} L ${116 + w * (0.5 + k * 0.05)} ${y + 18 + k * 1.2}" stroke="${shade(under, -0.25)}" stroke-width="1" opacity=".6"/>`;
    s += `<path d="M116 ${y + 14} C ${150} ${y - 22}, ${116 + w} ${y - 26}, ${116 + w} ${y + 10} Q ${116 + w * 0.6} ${y + 22} 116 ${y + 20} Z" fill="url(#${g})"/>`;
  });
  return s;
}

function cluster(p, uidp, r) {
  let s = `<path d="M110 262 C 112 200, 130 186, 200 184 S 290 200, 292 262 Z" fill="#6e5a40"/>
    <ellipse cx="201" cy="186" rx="88" ry="14" fill="#a68b62"/>
    ${[30, 50, 70].map((rr) => `<ellipse cx="201" cy="186" rx="${rr}" ry="${rr * 0.15}" fill="none" stroke="#7a6446" stroke-width="1.5"/>`).join('')}`;
  const positions = [[150, 0.42, 196], [200, 0.5, 192], [252, 0.44, 198], [178, 0.34, 202], [228, 0.36, 204]];
  positions.forEach(([x, sc, gy]) => { s += standardMushroom({ ...p, stemShape: 'tall' }, uidp + x, r, x, sc, gy); });
  return s;
}

function coral(p, uidp, r) {
  const col = c(p.cap, '#e3d4a6');
  let s = `<ellipse cx="200" cy="254" rx="110" ry="12" fill="#2f3f22" opacity=".25"/>`;
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI; const rad = 20 + r() * 80;
    const x = 200 + Math.cos(a) * rad * (r() < 0.5 ? 1 : -1); const y = 245 - Math.sin(a) * rad * 0.95;
    const rot = r() * 360;
    s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} c 10 -14, 26 -8, 22 4 c -4 10, -16 6, -22 -4" fill="${shade(col, (r() - 0.5) * 0.25)}" stroke="${shade(col, -0.3)}" stroke-width="1.2" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return s;
}

function trumpet(p, uidp) {
  const col = c(p.cap, '#2f2a2a');
  let s = '';
  [[160, 0.8], [215, 1], [262, 0.7]].forEach(([x, sc]) => {
    const h = 150 * sc; const w = 46 * sc;
    s += `<path d="M${x - w} ${252 - h} Q ${x - w * 0.2} ${252 - h * 0.4} ${x - 8 * sc} 252 L ${x + 8 * sc} 252 Q ${x + w * 0.2} ${252 - h * 0.4} ${x + w} ${252 - h} Q ${x} ${252 - h + 18 * sc} ${x - w} ${252 - h} Z" fill="${shade(col, 0.2)}"/>`;
    s += `<ellipse cx="${x}" cy="${252 - h}" rx="${w}" ry="${10 * sc}" fill="${shade(col, -0.4)}"/>`;
    s += `<path d="M${x - w * 0.8} ${252 - h + 6} Q ${x - w * 0.3} ${252 - h * 0.5} ${x - 4} 250" stroke="${shade(col, 0.45)}" stroke-width="1.5" fill="none" opacity=".5"/>`;
  });
  return s;
}

function ball(p, uidp) {
  const col = c(p.cap, '#f2efe6');
  return `<defs><radialGradient id="${uidp}ball" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="${col}"/><stop offset="1" stop-color="${shade(col, -0.3)}"/></radialGradient></defs>
    <ellipse cx="200" cy="256" rx="110" ry="14" fill="#2f3f22" opacity=".3"/>
    <ellipse cx="200" cy="178" rx="108" ry="82" fill="url(#${uidp}ball)"/>
    <path d="M120 210 q 30 10 60 4 M210 236 q 30 -4 60 -18" stroke="${shade(col, -0.2)}" stroke-width="2" fill="none" opacity=".6"/>`;
}

function morel(p, uidp, r, brain = false) {
  const col = c(p.cap, '#c9a46a'); const stemC = c(p.stem, '#efe6d2');
  let s = `<ellipse cx="200" cy="254" rx="50" ry="8" fill="#2f3f22" opacity=".28"/>
    <path d="M178 252 C 172 220, 176 196, 180 180 L 220 180 C 224 196, 228 220, 222 252 Z" fill="${stemC}"/>`;
  if (!brain) {
    s += `<path d="M200 50 C 250 52, 262 120, 248 180 Q 200 196 152 180 C 138 120, 150 52, 200 50 Z" fill="${col}"/>`;
    for (let i = 0; i < 46; i++) {
      const x = 156 + r() * 88; const y = 62 + r() * 112;
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l 6 -4 l 6 4 l 0 8 l -6 4 l -6 -4 z" fill="${shade(col, -0.45)}" opacity=".75"/>`;
    }
  } else {
    s += `<path d="M150 186 C 120 150, 140 90, 180 84 C 196 64, 236 70, 246 96 C 280 110, 274 170, 252 186 Q 200 200 150 186 Z" fill="${col}"/>`;
    for (let i = 0; i < 9; i++) {
      const y = 96 + i * 10;
      s += `<path d="M${150 + r() * 10} ${y} c 14 -10, 22 10, 36 0 s 24 10, 36 0 s 18 8, 26 0" stroke="${shade(col, -0.45)}" stroke-width="3" fill="none" opacity=".7"/>`;
    }
  }
  return s;
}

function ear(p, uidp) {
  const col = c(p.cap, '#7a3f2a');
  let s = `<path d="M0 150 C 120 136, 280 160, 400 140 L 400 178 C 280 196, 120 172, 0 186 Z" fill="#6b5741"/>
    <path d="M0 160 C 120 148, 280 170, 400 152" stroke="#4e3e2c" stroke-width="2" fill="none"/>`;
  [[140, 196, 1], [230, 200, 0.85], [300, 186, 0.7]].forEach(([x, y, sc], i) => {
    s += `<path d="M${x} ${y - 20 * sc} C ${x - 50 * sc} ${y - 20 * sc}, ${x - 54 * sc} ${y + 60 * sc}, ${x} ${y + 64 * sc} C ${x + 46 * sc} ${y + 60 * sc}, ${x + 40 * sc} ${y - 16 * sc}, ${x} ${y - 20 * sc} Z" fill="${shade(col, i * 0.06)}" opacity=".95"/>
      <path d="M${x - 14 * sc} ${y + 8 * sc} q 10 14 0 30 M${x + 10 * sc} ${y + 4 * sc} q -6 18 4 34" stroke="${shade(col, -0.4)}" stroke-width="2" fill="none" opacity=".6"/>`;
  });
  return s;
}

function tall(p, uidp, r) {
  const col = c(p.cap, '#f1ece0');
  let s = `<ellipse cx="200" cy="254" rx="44" ry="7" fill="#2f3f22" opacity=".28"/>`;
  s += stem({ ...p, stemShape: 'tall', ring: p.ring }, uidp, 200, 140, 252);
  s += `<path d="M164 160 C 158 100, 170 50, 200 46 C 230 50, 242 100, 236 160 Q 200 170 164 160 Z" fill="${col}"/>`;
  s += `<path d="M178 60 C 186 48, 214 48, 222 60 Q 200 70 178 60 Z" fill="${c(p.cap2, '#b08a5a')}"/>`;
  for (let i = 0; i < 28; i++) {
    const x = 170 + r() * 60; const y = 66 + r() * 86;
    s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q 3 6 0 9" stroke="${c(p.scales, '#b09a7a')}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
  }
  s += `<path d="M164 160 Q 200 170 236 160 L 236 166 Q 200 178 164 166 Z" fill="${c(p.under, '#d9c9c0')}"/>`;
  return s;
}

/**
 * Liefert ein vollständiges <svg>-Element als String.
 * @param {object} m – Pilzeintrag aus der Datenbank
 */
export function illustrate(m, { title = true } = {}) {
  const p = m.illustration || {};
  const id = String(m.id || 'x').replace(/[^a-z0-9]/gi, '');
  const uidp = `i${id}${Math.floor(Math.random() * 1e6)}`;
  const r = rng(hash(m.id || 'x'));
  const type = p.type || 'cap';
  let body;
  switch (type) {
    case 'bracket': body = bracket(p, uidp, r); break;
    case 'oyster':  body = oyster(p, uidp, r); break;
    case 'cluster': body = cluster(p, uidp, r); break;
    case 'coral':   body = coral(p, uidp, r); break;
    case 'trumpet': body = trumpet(p, uidp, r); break;
    case 'ball':    body = ball(p, uidp, r); break;
    case 'morel':   body = morel(p, uidp, r, false); break;
    case 'brain':   body = morel(p, uidp, r, true); break;
    case 'ear':     body = ear(p, uidp, r); break;
    case 'tall':    body = tall(p, uidp, r); break;
    default:        body = standardMushroom(p, uidp, r);
  }
  const bg = background(uidp, rng(hash((m.id || 'x') + 'bg')), { forest: !['wiese', 'park'].includes(p.scene) });
  const label = title ? `<title>Schematische Illustration: ${String(m.name || '').replace(/[<>&"]/g, '')}</title>` : '';
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice">${label}${bg}${body}</svg>`;
}

/** Kleine Waldszene für den Startbereich. */
export function heroArt() {
  const r = rng(42);
  let trees = '';
  for (let i = 0; i < 14; i++) {
    const x = r() * 420 - 10; const h = 120 + r() * 140; const w = 26 + r() * 30;
    trees += `<path d="M${x.toFixed(0)} ${(260 - h).toFixed(0)} L ${(x + w / 2).toFixed(0)} 260 L ${(x - w / 2).toFixed(0)} 260 Z" fill="#0f2418" opacity="${(0.35 + r() * 0.4).toFixed(2)}"/>`;
  }
  return `<svg class="hero-art" viewBox="0 0 400 260" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
    <defs><radialGradient id="hglow" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="#e9c98f" stop-opacity=".35"/><stop offset="1" stop-color="#e9c98f" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="260" fill="url(#hglow)"/>
    <g transform="translate(120 0)">${trees}</g>
    <path d="M0 250 C 100 236 260 246 400 232 V 260 H 0 Z" fill="#0c1d13" opacity=".8"/>
  </svg>`;
}
