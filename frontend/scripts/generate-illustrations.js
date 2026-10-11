/* eslint-disable */
/**
 * Génère la bibliothèque d'illustrations SVG de FamilyBalance
 * (src/assets/illustrations/*.svg).
 *
 * Illustrations originales du projet (aucune ressource tierce) : libres d'usage,
 * légères (quelques Ko) et alignées sur la charte de l'application.
 *
 *   node scripts/generate-illustrations.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'illustrations');

// Charte (src/styles.css)
const C = {
  ink: '#0E1726',
  inkSoft: '#334155',
  teal: '#0D7A6F',
  tealDark: '#095C54',
  tealMid: '#3FA89C',
  tealTint: '#E3F3F1',
  tealPale: '#F0F8F7',
  amber: '#F89810',
  amberDark: '#B45A00',
  amberSoft: '#FDEFD6',
  blue: '#5B8DEF',
  blueSoft: '#EEF3FB',
  rose: '#E86F7E',
  roseSoft: '#FCE7EA',
  green: '#0F8A63',
  red: '#C2410C',
  white: '#FFFFFF',
  line: '#CBD5E1',
  paper: '#F7F9FD',
  shoe: '#1F2937',
};
const SKIN = ['#F2C7A5', '#D9A273', '#A86B45', '#7A4A2E'];
const HAIR = ['#2B1B12', '#5A3622', '#1C1C1C', '#8A5A2B'];

const W = 480;
const H = 360;

// ── Primitives ──────────────────────────────────────────────────────────
const f = (n) => Math.round(n * 10) / 10;
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}="${v}"`).join(' ');
const rect = (x, y, w, h, fill, rx = 0, extra = {}) => `<rect ${attrs({ x: f(x), y: f(y), width: f(w), height: f(h), rx: rx || undefined, fill, ...extra })}/>`;
const circle = (cx, cy, r, fill, extra = {}) => `<circle ${attrs({ cx: f(cx), cy: f(cy), r: f(r), fill, ...extra })}/>`;
const ellipse = (cx, cy, rx, ry, fill, extra = {}) => `<ellipse ${attrs({ cx: f(cx), cy: f(cy), rx: f(rx), ry: f(ry), fill, ...extra })}/>`;
const pathEl = (d, fill, extra = {}) => `<path ${attrs({ d, fill, ...extra })}/>`;
const line = (x1, y1, x2, y2, stroke, w = 2, extra = {}) => `<line ${attrs({ x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), stroke, 'stroke-width': w, 'stroke-linecap': 'round', ...extra })}/>`;
const poly = (pts, stroke, w, extra = {}) => `<polyline ${attrs({ points: pts.map((p) => p.map(f).join(',')).join(' '), fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra })}/>`;
const g = (content, transform) => `<g${transform ? ` transform="${transform}"` : ''}>${content}</g>`;

/** Fond organique : forme lisse fermée autour de (cx, cy). */
function blob(cx, cy, r, fill, seed = 1, wobble = 0.1, sx = 1.22, sy = 0.8) {
  const n = 8;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wobble * Math.sin(seed * 1.7 + i * 2.3) + wobble * 0.5 * Math.cos(seed + i * 1.1);
    pts.push([cx + Math.cos(a) * r * k * sx, cy + Math.sin(a) * r * k * sy]);
  }
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return pathEl(d + 'Z', fill);
}

const ground = (y = 318, x1 = 70, x2 = 410) => ellipse((x1 + x2) / 2, y, (x2 - x1) / 2, 7, C.ink, { opacity: 0.06 });

function sparkle(x, y, s = 1, fill = C.amber) {
  const d = `M${x},${y - 9 * s} Q${x + 1.5 * s},${y - 1.5 * s} ${x + 9 * s},${y} Q${x + 1.5 * s},${y + 1.5 * s} ${x},${y + 9 * s} Q${x - 1.5 * s},${y + 1.5 * s} ${x - 9 * s},${y} Q${x - 1.5 * s},${y - 1.5 * s} ${x},${y - 9 * s}Z`;
  return pathEl(d, fill);
}
const dot = (x, y, r, fill) => circle(x, y, r, fill);

function heart(x, y, s = 1, fill = C.rose) {
  const d = `M${x},${y + 14 * s} C${x - 22 * s},${y} ${x - 16 * s},${y - 16 * s} ${x},${y - 7 * s} C${x + 16 * s},${y - 16 * s} ${x + 22 * s},${y} ${x},${y + 14 * s}Z`;
  return pathEl(d, fill);
}

function checkBadge(x, y, r = 16, fill = C.teal) {
  return circle(x, y, r, fill) + poly([[x - r * 0.42, y + r * 0.02], [x - r * 0.1, y + r * 0.34], [x + r * 0.45, y - r * 0.3]], C.white, r * 0.2);
}
function plusBadge(x, y, r = 16, fill = C.amber) {
  return circle(x, y, r, fill) + line(x - r * 0.42, y, x + r * 0.42, y, C.white, r * 0.2) + line(x, y - r * 0.42, x, y + r * 0.42, C.white, r * 0.2);
}

function plant(x, y, s = 1) {
  return g(
    pathEl(`M-14,0 L14,0 L10,26 L-10,26Z`, C.amber, { transform: 'translate(0,-26)' }) +
      pathEl('M0,-26 C-4,-50 -24,-58 -30,-70 C-10,-68 2,-52 0,-26Z', C.teal) +
      pathEl('M0,-26 C4,-56 22,-66 30,-80 C34,-60 14,-44 0,-26Z', C.tealMid) +
      pathEl('M0,-26 C-2,-46 2,-66 8,-86 C14,-66 8,-44 0,-26Z', C.teal),
    `translate(${x},${y}) scale(${s})`,
  );
}

// ── Personnages (style géométrique, sans visage) ─────────────────────────
/**
 * Personnage debout, pieds en (0,0), hauteur ≈ 170 à l'échelle 1.
 * opts: skin, hair, hairStyle(short|long|bun|curly|none), top, bottom,
 *       arms: {l:'down'|'up'|'hold'|'hip'|'wave', r:...}, coat (blouse), headphones, stetho
 */
function person(x, y, s, o = {}) {
  const skin = o.skin || SKIN[0];
  const hair = o.hair || HAIR[0];
  const top = o.top || C.teal;
  const bottom = o.bottom || C.ink;
  const arms = Object.assign({ l: 'down', r: 'down' }, o.arms || {});
  let back = '', body = '', front = '';

  // cheveux arrière
  if (o.hairStyle === 'long') back += rect(-21, -166, 42, 44, hair, 16);
  if (o.hairStyle === 'bun') back += circle(0, -178, 9, hair);
  // jambes + chaussures
  body += rect(-15, -72, 13, 72, bottom, 6) + rect(2, -72, 13, 72, bottom, 6);
  body += ellipse(-10, -2, 11, 5, C.shoe) + ellipse(11, -2, 11, 5, C.shoe);
  // cou
  body += rect(-5, -140, 10, 14, skin, 3);
  // torse
  if (o.coat) {
    body += rect(-24, -130, 48, 74, C.white, 16, { stroke: C.line, 'stroke-width': 1.5 });
    body += pathEl('M-8,-130 L0,-112 L8,-130Z', top);
    body += line(0, -112, 0, -62, C.line, 1.5);
  } else {
    body += rect(-23, -130, 46, 68, top, 16);
  }
  // tête
  body += circle(0, -154, 17, skin);
  // cheveux avant
  const hs = o.hairStyle || 'short';
  if (hs === 'short' || hs === 'bun' || hs === 'long') {
    body += pathEl('M-18,-150 C-21,-178 21,-178 18,-150 C14,-163 -6,-168 -18,-150Z', hair);
  } else if (hs === 'curly') {
    body += [[-14, -164], [-5, -170], [6, -170], [14, -164], [18, -155], [-18, -155]].map(([cx, cy]) => circle(cx, cy, 7, hair)).join('');
  }
  if (o.headphones) {
    body += pathEl('M-19,-154 C-21,-182 21,-182 19,-154', 'none', { stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
    body += rect(-23, -160, 8, 15, C.amber, 4) + rect(15, -160, 8, 15, C.amber, 4);
  }
  // bras
  const sleeve = o.coat ? C.white : top;
  const arm = (side) => {
    const sx = side === 'l' ? -1 : 1;
    const sh = [20 * sx, -122];
    const pose = arms[side];
    let pts;
    if (pose === 'up') pts = [sh, [34 * sx, -150], [38 * sx, -182]];
    else if (pose === 'wave') pts = [sh, [40 * sx, -132], [46 * sx, -168]];
    else if (pose === 'hold') pts = [sh, [24 * sx, -96], [44 * sx, -100]];
    else if (pose === 'point') pts = [sh, [40 * sx, -116], [62 * sx, -128]];
    else if (pose === 'hip') pts = [sh, [36 * sx, -100], [22 * sx, -82]];
    else pts = [sh, [26 * sx, -100], [27 * sx, -74]];
    const end = pts[pts.length - 1];
    const strokeExtra = o.coat ? { stroke: sleeve } : {};
    return poly(pts, sleeve, 11, strokeExtra) + circle(end[0], end[1], 5.5, skin);
  };
  front += arm('l') + arm('r');
  if (o.stetho) {
    front += pathEl('M-10,-134 C-14,-110 -6,-96 4,-96 C14,-96 16,-112 12,-130', 'none', { stroke: C.inkSoft, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    front += circle(4, -94, 4.5, C.inkSoft);
  }
  return g(back + body + front, `translate(${x},${y}) scale(${s})`);
}

/** Personnage assis, assise en (0,0) (haut des cuisses), pieds au sol à y=+58. */
function seated(x, y, s, o = {}) {
  const skin = o.skin || SKIN[0];
  const hair = o.hair || HAIR[0];
  const top = o.top || C.teal;
  const bottom = o.bottom || C.ink;
  const dir = o.dir || 1; // 1 : tourné vers la droite
  let out = '';
  if (o.hairStyle === 'long') out += rect(-21, -112, 42, 44, hair, 16);
  // cuisses + tibias
  out += rect(-14, -12, 50, 16, bottom, 7);
  out += rect(26, -4, 14, 62, bottom, 6);
  out += ellipse(38, 56, 12, 5, C.shoe);
  // torse, cou, tête
  out += rect(-5, -86, 10, 14, skin, 3);
  out += rect(-23, -76, 46, 66, top, 16);
  out += circle(0, -100, 17, skin);
  const hs = o.hairStyle || 'short';
  if (hs === 'curly') out += [[-14, -110], [-5, -116], [6, -116], [14, -110], [18, -101], [-18, -101]].map(([cx, cy]) => circle(cx, cy, 7, hair)).join('');
  else out += pathEl('M-18,-96 C-21,-124 21,-124 18,-96 C14,-109 -6,-114 -18,-96Z', hair);
  if (o.headphones) {
    out += pathEl('M-19,-100 C-21,-128 21,-128 19,-100', 'none', { stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
    out += rect(-23, -106, 8, 15, C.amber, 4) + rect(15, -106, 8, 15, C.amber, 4);
  }
  // bras vers l'avant
  out += poly([[16, -66], [30, -40], [52, -46]], top, 11) + circle(52, -46, 5.5, skin);
  return g(out, `translate(${x},${y}) scale(${s * dir},${s})`);
}

// ── Objets ───────────────────────────────────────────────────────────────
function phone(x, y, w, h, screen = C.tealTint, frame = C.ink) {
  return rect(x, y, w, h, frame, w * 0.16) + rect(x + w * 0.08, y + h * 0.07, w * 0.84, h * 0.84, screen, w * 0.1) + rect(x + w * 0.38, y + h * 0.025, w * 0.24, h * 0.02, C.inkSoft, 2);
}
function card(x, y, w, h, fill = C.white, rx = 14) {
  return rect(x + 3, y + 5, w, h, C.ink, rx, { opacity: 0.06 }) + rect(x, y, w, h, fill, rx);
}
function textLines(x, y, widths, color = C.line, gap = 12, h = 6) {
  return widths.map((w, i) => rect(x, y + i * gap, w, h, color, h / 2)).join('');
}
function avatar(cx, cy, r, skin = SKIN[1], hair = HAIR[0], bg = C.tealTint) {
  return circle(cx, cy, r, bg) + g(
    circle(0, -0.12 * r, 0.36 * r, skin) +
      pathEl(`M${-0.62 * r},${0.72 * r} C${-0.6 * r},${0.2 * r} ${0.6 * r},${0.2 * r} ${0.62 * r},${0.72 * r}Z`, C.teal) +
      pathEl(`M${-0.38 * r},${-0.1 * r} C${-0.42 * r},${-0.62 * r} ${0.42 * r},${-0.62 * r} ${0.38 * r},${-0.1 * r} C${0.28 * r},${-0.36 * r} ${-0.1 * r},${-0.4 * r} ${-0.38 * r},${-0.1 * r}Z`, hair),
    `translate(${cx},${cy})`,
  ) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${C.white}" stroke-width="3"/>`;
}
function clipboard(x, y, w, h) {
  let out = card(x, y, w, h, C.white, 12);
  out += rect(x + w / 2 - 26, y - 10, 52, 20, C.ink, 7);
  const rows = 4;
  for (let i = 0; i < rows; i++) {
    const ry = y + 36 + i * ((h - 52) / rows);
    const checked = i < 2;
    out += rect(x + 18, ry - 9, 18, 18, checked ? C.teal : C.white, 5, checked ? {} : { stroke: C.line, 'stroke-width': 2 });
    if (checked) out += poly([[x + 22, ry], [x + 26, ry + 4], [x + 32, ry - 4]], C.white, 2.5);
    out += rect(x + 46, ry - 4, (w - 70) * (i % 2 ? 0.7 : 0.95), 8, i < 2 ? C.tealTint : C.blueSoft, 4);
  }
  return out;
}
function calendar(x, y, w, h, hi = 10) {
  let out = card(x, y, w, h, C.white, 14);
  out += rect(x, y, w, 34, C.teal, 14) + rect(x, y + 20, w, 14, C.teal);
  out += rect(x + w * 0.25, y - 8, 8, 20, C.ink, 4) + rect(x + w * 0.75 - 8, y - 8, 8, 20, C.ink, 4);
  const cols = 5, rows = 3, cw = (w - 28) / cols, ch = (h - 58) / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cx = x + 14 + c * cw + cw / 2, cy = y + 48 + r * ch + ch / 2;
      if (i === hi) out += circle(cx, cy, Math.min(cw, ch) * 0.42, C.amber);
      else out += rect(cx - 6, cy - 4, 12, 8, C.blueSoft, 3);
    }
  return out;
}
function envelope(x, y, w, h, fill = C.white) {
  return rect(x + 3, y + 5, w, h, C.ink, 10, { opacity: 0.06 }) + rect(x, y, w, h, fill, 10) +
    pathEl(`M${x + 4},${y + 6} L${x + w / 2},${y + h * 0.58} L${x + w - 4},${y + 6}`, 'none', { stroke: C.line, 'stroke-width': 3, 'stroke-linejoin': 'round' });
}
function shield(cx, cy, s, fill = C.teal) {
  const d = `M0,-60 L46,-42 C46,6 28,40 0,58 C-28,40 -46,6 -46,-42Z`;
  return g(pathEl(d, fill) + pathEl('M0,-46 L34,-33 C34,4 20,30 0,44Z', C.white, { opacity: 0.14 }) +
    poly([[-18, 0], [-5, 14], [20, -14]], C.white, 8), `translate(${cx},${cy}) scale(${s})`);
}
function padlock(cx, cy, s, body = C.amber) {
  return g(
    pathEl('M-30,-18 L-30,-44 C-30,-84 30,-84 30,-44 L30,-18', 'none', { stroke: C.ink, 'stroke-width': 12, 'stroke-linecap': 'round' }) +
      rect(-48, -24, 96, 80, body, 18) + circle(0, 10, 10, C.ink) + rect(-4, 12, 8, 22, C.ink, 4),
    `translate(${cx},${cy}) scale(${s})`,
  );
}
function key(cx, cy, s, fill = C.teal) {
  return g(circle(0, 0, 22, fill) + circle(0, 0, 9, C.white) + rect(18, -6, 70, 12, fill, 6) + rect(66, 4, 10, 18, fill, 3) + rect(80, 4, 8, 12, fill, 3),
    `translate(${cx},${cy}) rotate(-24) scale(${s})`);
}
function bell(cx, cy, s, fill = C.amber) {
  return g(
    pathEl('M-38,22 C-30,14 -30,4 -30,-14 C-30,-38 -16,-52 0,-52 C16,-52 30,-38 30,-14 C30,4 30,14 38,22Z', fill) +
      rect(-44, 18, 88, 12, C.amberDark, 6) + circle(0, 38, 10, C.amberDark) + circle(0, -56, 7, C.amberDark),
    `translate(${cx},${cy}) scale(${s}) rotate(-10)`,
  );
}
function bubble(x, y, w, h, fill, tail = 'left') {
  const tx = tail === 'left' ? x + 22 : x + w - 22;
  const d = tail === 'left' ? `M${tx},${y + h - 2} L${tx - 10},${y + h + 16} L${tx + 14},${y + h - 2}Z` : `M${tx},${y + h - 2} L${tx + 10},${y + h + 16} L${tx - 14},${y + h - 2}Z`;
  return rect(x, y, w, h, fill, 18) + pathEl(d, fill);
}
function book(x, y, w, h, cover, page = C.white) {
  return rect(x, y, w, h, cover, 4) + rect(x + 6, y + 4, w - 10, h - 8, page, 2) + rect(x, y, 10, h, cover, 3);
}
function bars(x, y, vals, bw, gap, colors, maxH) {
  return vals.map((v, i) => rect(x + i * (bw + gap), y - v * maxH, bw, v * maxH, colors[i % colors.length], Math.min(6, bw / 2))).join('');
}
function gauge(cx, cy, r) {
  const arc = (a0, a1, color) => {
    const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return pathEl(`M${f(x0)},${f(y0)} A${r},${r} 0 0 1 ${f(x1)},${f(y1)}`, 'none', { stroke: color, 'stroke-width': r * 0.28, 'stroke-linecap': 'butt' });
  };
  const PI = Math.PI;
  return arc(PI, PI * 1.36, C.green) + arc(PI * 1.38, PI * 1.62, C.amber) + arc(PI * 1.64, PI * 2, C.red) +
    line(cx, cy, cx + r * 0.7 * Math.cos(PI * 1.25), cy + r * 0.7 * Math.sin(PI * 1.25), C.ink, 5) + circle(cx, cy, 8, C.ink);
}
function laptop(x, y, w, h, screenContent = '') {
  return rect(x, y, w, h, C.ink, 12) + rect(x + 8, y + 8, w - 16, h - 16, C.paper, 6) + screenContent +
    pathEl(`M${x - 24},${y + h} L${x + w + 24},${y + h} L${x + w + 8},${y + h + 14} L${x - 8},${y + h + 14}Z`, C.inkSoft) +
    rect(x + w / 2 - 22, y + h, 44, 5, C.ink, 2);
}
function magnifier(cx, cy, s) {
  return g(circle(0, 0, 40, C.white, { stroke: C.teal, 'stroke-width': 12 }) + circle(0, 0, 40, C.tealTint, { opacity: 0.5 }) +
    line(30, 30, 66, 66, C.teal, 16), `translate(${cx},${cy}) scale(${s})`);
}
function gear(cx, cy, r, fill) {
  let d = '';
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    d += rect(-r * 0.18, -r * 1.25, r * 0.36, r * 0.5, fill, 2, { transform: `rotate(${f((a * 180) / Math.PI)})` });
  }
  return g(d + circle(0, 0, r, fill) + circle(0, 0, r * 0.42, C.white), `translate(${cx},${cy})`);
}
function lightbulb(cx, cy, s) {
  let rays = '';
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.05 + (i / 6) * 0.9);
    rays += line(Math.cos(a) * 52, Math.sin(a) * 52 - 8, Math.cos(a) * 66, Math.sin(a) * 66 - 8, C.amber, 5);
  }
  return g(rays + circle(0, -8, 34, C.amber) + pathEl('M-16,18 L16,18 L12,34 L-12,34Z', C.amberSoft) + rect(-14, 34, 28, 8, C.inkSoft, 3) + rect(-10, 44, 20, 6, C.inkSoft, 3) +
    pathEl('M-8,10 C-8,-4 -14,-6 -14,-14 M8,10 C8,-4 14,-6 14,-14', 'none', { stroke: C.amberDark, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    `translate(${cx},${cy}) scale(${s})`);
}
function balance(cx, cy, s) {
  // balance : téléphone d'un côté, livre + ballon de l'autre, en équilibre
  return g(
    rect(-6, -110, 12, 110, C.inkSoft, 5) + rect(-40, -6, 80, 12, C.ink, 6) +
      rect(-110, -114, 220, 8, C.ink, 4) + circle(0, -112, 9, C.amber) +
      line(-92, -108, -110, -60, C.inkSoft, 2.5) + line(-92, -108, -74, -60, C.inkSoft, 2.5) +
      line(92, -108, 74, -60, C.inkSoft, 2.5) + line(92, -108, 110, -60, C.inkSoft, 2.5) +
      pathEl('M-122,-60 L-62,-60 C-66,-44 -118,-44 -122,-60Z', C.teal) + pathEl('M62,-60 L122,-60 C118,-44 66,-44 62,-60Z', C.teal) +
      phone(-102, -110, 26, 48, C.blueSoft) +
      book(68, -78, 40, 16, C.amber) + circle(96, -94, 14, C.rose) + pathEl('M84,-96 C92,-90 100,-90 108,-96', 'none', { stroke: C.white, 'stroke-width': 2 }),
    `translate(${cx},${cy}) scale(${s})`,
  );
}
function videoWindow(x, y, w, h) {
  let out = rect(x, y, w, h, C.tealTint, 8);
  out += g(circle(0, -14, 22, SKIN[1]) + pathEl('M-24,-22 C-28,-52 28,-52 24,-22 C18,-36 -8,-40 -24,-22Z', HAIR[2]) +
    pathEl('M-44,60 C-44,22 44,22 44,60Z', C.white) + pathEl('M-8,22 L0,36 L8,22Z', C.teal) +
    pathEl('M-14,24 C-18,44 -6,52 2,52', 'none', { stroke: C.inkSoft, 'stroke-width': 2.5 }), `translate(${x + w * 0.5},${y + h * 0.52}) scale(${(h / 150).toFixed(3)})`);
  out += rect(x + w - 62, y + h - 50, 52, 40, C.amberSoft, 6) + circle(x + w - 36, y + h - 34, 9, SKIN[0]) + pathEl(`M${x + w - 50},${y + h - 12} C${x + w - 50},${y + h - 26} ${x + w - 22},${y + h - 26} ${x + w - 22},${y + h - 12}Z`, C.amber);
  out += circle(x + w / 2 - 18, y + h - 16, 8, C.red) + circle(x + w / 2 + 6, y + h - 16, 8, C.inkSoft);
  return out;
}

// ── Scènes ──────────────────────────────────────────────────────────────
const svg = (title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t"><title id="t">${title}</title>${body}</svg>\n`;

const scenes = {
  // Famille réunie : parent, adolescent, enfant ; téléphone posé dans un panier.
  'family-hero': svg('Une famille réunie, le téléphone mis de côté',
    blob(240, 190, 150, C.tealTint, 3) + circle(372, 96, 40, C.amberSoft) + ground(318, 80, 400) +
    plant(92, 318, 0.95) +
    person(176, 318, 1, { skin: SKIN[1], hair: HAIR[0], hairStyle: 'long', top: C.teal, bottom: C.ink, arms: { r: 'hold', l: 'down' } }) +
    person(258, 318, 0.86, { skin: SKIN[2], hair: HAIR[2], hairStyle: 'curly', top: C.amber, bottom: C.inkSoft, arms: { l: 'hold', r: 'wave' } }) +
    person(326, 318, 0.6, { skin: SKIN[0], hair: HAIR[3], hairStyle: 'bun', top: C.blue, bottom: C.teal, arms: { l: 'up', r: 'down' } }) +
    rect(366, 286, 52, 32, C.amberSoft, 8) + rect(366, 286, 52, 9, C.amber, 4) + phone(380, 268, 22, 34, C.blueSoft) +
    heart(246, 108, 1.1) + sparkle(150, 96, 1.1) + sparkle(318, 76, 0.8, C.teal) + sparkle(420, 160, 0.7)),

  // Inscription : la famille rejoint FamilyBalance.
  'family-welcome': svg('Un parent accueille sa famille sur FamilyBalance',
    blob(240, 188, 148, C.amberSoft, 5) + ground(318, 90, 400) +
    card(286, 92, 130, 150, C.white) + avatar(351, 134, 26, SKIN[1], HAIR[1]) + textLines(312, 174, [78, 60, 70], C.line, 14) + checkBadge(410, 98, 16) +
    person(196, 318, 1, { skin: SKIN[0], hair: HAIR[1], hairStyle: 'short', top: C.teal, arms: { r: 'point', l: 'down' } }) +
    person(128, 318, 0.66, { skin: SKIN[2], hair: HAIR[2], hairStyle: 'curly', top: C.amber, bottom: C.teal, arms: { l: 'wave' } }) +
    sparkle(110, 110, 1) + sparkle(440, 280, 0.8, C.teal) + heart(250, 98, 0.8)),

  // MFA : code reçu sur le téléphone + bouclier.
  'auth-secure': svg('Vérification en deux étapes',
    blob(240, 180, 130, C.tealTint, 7) +
    phone(176, 58, 112, 214, C.white) + rect(196, 98, 72, 10, C.tealTint, 5) +
    [0, 1, 2].map((i) => rect(196 + i * 26, 132, 20, 28, C.blueSoft, 6) + circle(206 + i * 26, 146, 4, C.ink)).join('') +
    [0, 1, 2].map((i) => rect(196 + i * 26, 168, 20, 28, C.blueSoft, 6)).join('') +
    rect(196, 214, 72, 24, C.teal, 10) +
    shield(306, 236, 0.9) + sparkle(140, 96, 1) + sparkle(352, 92, 0.8, C.teal) + dot(128, 236, 5, C.amber)),

  // Vérification d'e-mail.
  'auth-email': svg('Adresse e-mail confirmée',
    blob(240, 184, 132, C.blueSoft, 2) +
    rect(186, 92, 108, 120, C.white, 8, { stroke: C.line, 'stroke-width': 1.5 }) + textLines(204, 112, [70, 56, 64], C.line, 14) +
    envelope(150, 150, 180, 112, C.amberSoft) + pathEl('M150,160 L240,222 L330,160 L330,262 L150,262Z', C.amber, { opacity: 0.25 }) +
    checkBadge(320, 156, 24) +
    pathEl('M98,120 C120,96 136,108 150,96', 'none', { stroke: C.teal, 'stroke-width': 2.5, 'stroke-dasharray': '6 6', 'stroke-linecap': 'round' }) +
    pathEl('M150,96 L174,86 L160,108Z', C.teal) + sparkle(374, 112, 0.9) + sparkle(116, 250, 0.8, C.teal)),

  // Mot de passe oublié / réinitialisation.
  'auth-key': svg('Réinitialisation du mot de passe',
    blob(240, 186, 128, C.amberSoft, 4) +
    padlock(214, 196, 1.15, C.teal) + key(290, 226, 0.95, C.amber) +
    pathEl('M330,108 A52,52 0 1 1 298,92', 'none', { stroke: C.teal, 'stroke-width': 6, 'stroke-linecap': 'round' }) + pathEl('M292,80 L306,96 L286,104Z', C.teal) +
    sparkle(140, 104, 1) + sparkle(372, 270, 0.8, C.teal)),

  // Questionnaire.
  'survey': svg('Remplir le questionnaire d\'évaluation',
    blob(240, 184, 146, C.tealTint, 9) + ground(318, 90, 400) +
    clipboard(116, 70, 170, 210) +
    person(358, 318, 0.92, { skin: SKIN[2], hair: HAIR[2], hairStyle: 'curly', top: C.amber, bottom: C.ink, arms: { l: 'point', r: 'hip' } }) +
    sparkle(100, 96, 1) + sparkle(420, 120, 0.8, C.teal)),

  // Résultats / scoring : jauge vert-orange-rouge + évolution.
  'results': svg('Résultats et niveau de risque',
    blob(240, 182, 148, C.blueSoft, 6) +
    card(92, 84, 196, 200, C.white) + textLines(112, 104, [90, 60], C.line, 14) +
    gauge(190, 230, 64) +
    card(262, 132, 132, 132, C.white) + bars(282, 246, [0.35, 0.55, 0.48, 0.8], 18, 10, [C.tealTint, C.tealMid, C.tealMid, C.teal], 90) +
    poly([[286, 196], [314, 178], [342, 186], [372, 150]], C.amber, 3.5) + circle(372, 150, 6, C.amber) +
    heart(394, 104, 0.9) + sparkle(96, 300, 0.9, C.teal) + sparkle(84, 70, 0.8)),

  // Tableau de bord famille.
  'family-dashboard': svg('Suivi des profils des enfants',
    blob(240, 186, 150, C.tealTint, 11) + ground(318, 70, 410) +
    card(178, 70, 228, 176, C.white) + textLines(198, 90, [96], C.ink, 0, 8) +
    [0, 1].map((i) => {
      const y = 116 + i * 60;
      return rect(198, y, 188, 48, i ? C.amberSoft : C.tealPale, 10) + avatar(222, y + 24, 16, SKIN[i + 1], HAIR[i + 1], C.white) +
        textLines(248, y + 14, [70, 46], C.line, 12) + circle(358, y + 24, 14, 'none', { stroke: C.line, 'stroke-width': 5 }) +
        pathEl(`M358,${y + 10} A14,14 0 ${i ? 0 : 1} 1 ${i ? 370 : 352},${i ? y + 31 : y + 37}`, 'none', { stroke: i ? C.amber : C.teal, 'stroke-width': 5, 'stroke-linecap': 'round' });
    }).join('') +
    person(122, 318, 1, { skin: SKIN[1], hair: HAIR[0], hairStyle: 'long', top: C.teal, arms: { r: 'point', l: 'down' } }) +
    sparkle(80, 110, 1) + sparkle(430, 270, 0.8, C.teal)),

  // Ajouter un adolescent.
  'add-child': svg('Ajouter le profil d\'un adolescent',
    blob(240, 186, 140, C.amberSoft, 8) + ground(318, 90, 400) +
    card(232, 86, 160, 170, C.white) + avatar(312, 136, 32, SKIN[2], HAIR[2]) + textLines(266, 184, [92, 70], C.line, 14) +
    rect(266, 220, 92, 22, C.teal, 10) + plusBadge(386, 92, 20) +
    person(168, 318, 1, { skin: SKIN[0], hair: HAIR[1], hairStyle: 'short', top: C.teal, arms: { r: 'point', l: 'down' } }) +
    sparkle(110, 118, 1) + sparkle(428, 250, 0.8, C.teal)),

  // Espace adolescent : équilibre écrans / activités.
  'teen-space': svg('Trouver l\'équilibre entre écrans et activités',
    blob(240, 186, 150, C.blueSoft, 12) + ground(318, 70, 410) +
    balance(312, 318, 0.95) +
    person(134, 318, 0.95, { skin: SKIN[2], hair: HAIR[2], hairStyle: 'curly', top: C.amber, bottom: C.ink, headphones: true, arms: { l: 'down', r: 'wave' } }) +
    sparkle(96, 96, 1) + sparkle(220, 80, 0.8, C.teal) + sparkle(420, 120, 0.9) + dot(390, 84, 6, C.teal)),

  // Téléconsultation (patient).
  'teleconsultation': svg('Consultation vidéo avec un spécialiste',
    blob(240, 184, 152, C.tealTint, 13) + ground(318, 60, 420) +
    laptop(196, 96, 210, 150, videoWindow(204, 104, 194, 134)) +
    rect(150, 260, 290, 10, C.amberDark, 5) + rect(170, 268, 8, 50, C.amberDark, 3) + rect(412, 268, 8, 50, C.amberDark, 3) +
    seated(112, 230, 0.95, { skin: SKIN[0], hair: HAIR[1], hairStyle: 'long', top: C.amber, bottom: C.ink }) +
    rect(70, 232, 70, 14, C.inkSoft, 7) + rect(76, 244, 10, 74, C.inkSoft, 4) +
    bubble(98, 70, 74, 40, C.white) + textLines(112, 84, [46, 30], C.line, 10, 5) +
    sparkle(440, 92, 0.9) + sparkle(70, 150, 0.7, C.teal)),

  // Spécialiste.
  'specialist': svg('Un spécialiste à l\'écoute des familles',
    blob(240, 186, 146, C.tealTint, 14) + ground(318, 90, 400) +
    calendar(250, 92, 150, 140, 7) +
    person(176, 318, 1, { skin: SKIN[1], hair: HAIR[2], hairStyle: 'short', top: C.teal, coat: true, stetho: true, arms: { l: 'down', r: 'hold' } }) +
    rect(214, 196, 40, 52, C.amberSoft, 6, { transform: 'rotate(-8 234 222)' }) + textLines(220, 210, [26, 20, 24], C.amber, 9, 4) +
    heart(400, 268, 0.8) + sparkle(110, 104, 1) + sparkle(420, 86, 0.8, C.teal)),

  // Gestion des spécialistes (admin).
  'specialists-team': svg('L\'équipe des spécialistes',
    blob(240, 186, 150, C.blueSoft, 15) +
    [[96, 110, SKIN[1], HAIR[2]], [196, 82, SKIN[0], HAIR[1]], [296, 110, SKIN[3], HAIR[0]]].map(([x, y, sk, hr], i) =>
      card(x, y, 92, 128, C.white) + avatar(x + 46, y + 40, 24, sk, hr, i === 1 ? C.amberSoft : C.tealTint) +
      textLines(x + 18, y + 76, [56, 40], C.line, 12) + rect(x + 18, y + 104, 56, 12, i === 1 ? C.amber : C.teal, 6)).join('') +
    plusBadge(386, 104, 20) + sparkle(84, 86, 1) + sparkle(410, 270, 0.8, C.teal)),

  // Messagerie sécurisée.
  'messaging': svg('Messagerie sécurisée',
    blob(240, 180, 140, C.tealTint, 16) +
    bubble(106, 82, 200, 72, C.white, 'left') + avatar(92, 168, 18, SKIN[1], HAIR[2]) + textLines(126, 102, [150, 110, 128], C.line, 13) +
    bubble(186, 176, 200, 64, C.teal, 'right') + avatar(398, 258, 18, SKIN[0], HAIR[1], C.amberSoft) + textLines(206, 194, [150, 104], '#FFFFFF', 13) +
    g(padlock(0, 0, 0.32, C.amber), 'translate(330,104)') + sparkle(404, 92, 0.9) + sparkle(110, 270, 0.8, C.teal)),

  // Ressources éducatives.
  'education': svg('Ressources éducatives et parcours d\'apprentissage',
    blob(240, 186, 150, C.amberSoft, 17) + ground(318, 80, 400) +
    book(118, 278, 150, 22, C.teal) + book(128, 256, 130, 22, C.amber) + book(122, 234, 140, 22, C.blue) +
    pathEl('M276,300 C306,288 340,288 360,296 L360,214 C340,206 306,206 276,218Z', C.white) +
    pathEl('M276,300 C246,288 212,288 192,296 L192,214', 'none') +
    textLines(290, 232, [52, 44, 50, 36], C.line, 14, 5) +
    lightbulb(196, 140, 0.95) + plant(392, 318, 0.9) + sparkle(110, 110, 1, C.teal) + sparkle(304, 96, 0.8)),

  // Rendez-vous.
  'appointments': svg('Agenda des rendez-vous',
    blob(240, 184, 140, C.blueSoft, 18) +
    calendar(132, 82, 200, 190, 6) +
    circle(330, 230, 50, C.white) + circle(330, 230, 50, 'none', { stroke: C.teal, 'stroke-width': 8 }) +
    line(330, 230, 330, 200, C.ink, 6) + line(330, 230, 352, 240, C.amber, 6) + circle(330, 230, 6, C.ink) +
    checkBadge(162, 90, 18) + sparkle(392, 116, 0.9) + sparkle(100, 268, 0.8, C.teal)),

  // Notifications.
  'notifications': svg('Notifications',
    blob(240, 182, 136, C.amberSoft, 19) +
    card(232, 98, 170, 46, C.white, 12) + circle(256, 121, 11, C.tealTint) + textLines(276, 113, [96, 64], C.line, 12, 5) +
    card(250, 160, 170, 46, C.white, 12) + circle(274, 183, 11, C.amberSoft) + textLines(294, 175, [96, 64], C.line, 12, 5) +
    bell(156, 186, 1.05) + circle(184, 128, 14, C.red) + sparkle(110, 104, 1, C.teal) + sparkle(420, 262, 0.8)),

  // Administration.
  'admin': svg('Pilotage de la plateforme',
    blob(240, 186, 152, C.tealTint, 20) +
    card(86, 72, 300, 210, C.white) + rect(86, 72, 300, 26, C.paper, 14) + rect(86, 86, 300, 12, C.paper) +
    [0, 1, 2].map((i) => circle(102 + i * 14, 85, 4, [C.red, C.amber, C.green][i])).join('') +
    rect(86, 98, 62, 184, C.ink, 0) + textLines(98, 116, [38, 30, 34, 26], '#FFFFFF', 18, 5) +
    [0, 1, 2].map((i) => rect(162 + i * 72, 112, 62, 44, [C.tealPale, C.amberSoft, C.blueSoft][i], 8) + textLines(172 + i * 72, 124, [30, 20], [C.teal, C.amber, C.blue][i], 12, 6)).join('') +
    bars(170, 266, [0.45, 0.7, 0.55, 0.85, 0.62, 0.92], 22, 12, [C.tealMid, C.teal], 86) +
    gear(392, 98, 26, C.amber) + gear(418, 146, 14, C.teal) + sparkle(78, 300, 0.9, C.teal)),

  // Profil.
  'profile': svg('Mon profil',
    blob(240, 184, 140, C.blueSoft, 21) +
    card(130, 84, 220, 160, C.white) + rect(130, 84, 220, 46, C.teal, 14) + rect(130, 116, 220, 14, C.teal) +
    avatar(186, 140, 34, SKIN[1], HAIR[1], C.amberSoft) + textLines(232, 146, [92, 70], C.line, 14) + textLines(152, 196, [176, 140, 160], C.blueSoft, 14, 7) +
    shield(354, 236, 0.62) + sparkle(110, 104, 1) + sparkle(392, 90, 0.8, C.teal)),

  // État vide / recherche sans résultat.
  'empty-search': svg('Aucun résultat',
    blob(240, 186, 128, C.blueSoft, 22) +
    rect(150, 150, 150, 110, C.white, 14, { stroke: C.line, 'stroke-width': 3, 'stroke-dasharray': '10 8' }) +
    textLines(174, 178, [80, 100, 60], C.blueSoft, 18, 8) +
    magnifier(296, 150, 0.95) + sparkle(130, 110, 0.9, C.teal) + sparkle(384, 262, 0.8)),
};

// Motif de fond discret (pages « carte » d'authentification).
const pattern = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><g fill="${C.teal}" opacity="0.07">` +
  [[20, 20], [100, 20], [60, 60], [140, 60], [20, 100], [100, 100], [60, 140], [140, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('') +
  `</g><path d="M0,128 C40,112 80,144 120,128 S160,112 160,112" fill="none" stroke="${C.amber}" stroke-opacity="0.08" stroke-width="2"/></svg>\n`;

fs.mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(scenes)) fs.writeFileSync(path.join(OUT, `${name}.svg`), content);
fs.writeFileSync(path.join(OUT, 'bg-pattern.svg'), pattern);
console.log(`${Object.keys(scenes).length + 1} fichiers écrits dans ${path.relative(process.cwd(), OUT)}`);
