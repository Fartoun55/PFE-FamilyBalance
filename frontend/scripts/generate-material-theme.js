const fs = require('fs');
const css = fs.readFileSync('node_modules/@angular/material/prebuilt-themes/indigo-pink.css', 'utf8');
const map = {
  '#3f51b5': 'var(--fb-primary)',
  '#ff4081': 'var(--fb-accent)',
  'rgba(63, 81, 181, 0.87)': 'rgba(var(--fb-primary-rgb), 0.87)',
  'rgba(63, 81, 181, 0.54)': 'rgba(var(--fb-primary-rgb), 0.54)',
  'rgba(63, 81, 181, 0.2)': 'rgba(var(--fb-primary-rgb), 0.2)',
  'rgba(63, 81, 181, 0.25)': 'rgba(var(--fb-primary-rgb), 0.25)',
  'rgba(63, 81, 181, 0.1)': 'rgba(var(--fb-primary-rgb), 0.1)',
  'rgba(255, 64, 129, 0.87)': 'rgba(var(--fb-accent-rgb), 0.87)',
  'rgba(255, 64, 129, 0.54)': 'rgba(var(--fb-accent-rgb), 0.54)',
  'rgba(255, 64, 129, 0.2)': 'rgba(var(--fb-accent-rgb), 0.2)',
  'rgba(255, 64, 129, 0.25)': 'rgba(var(--fb-accent-rgb), 0.25)',
  'rgba(255, 64, 129, 0.1)': 'rgba(var(--fb-accent-rgb), 0.1)',
  '#f44336': 'var(--fb-danger)',
  'rgba(244, 67, 54, 0.87)': 'rgba(var(--fb-danger-rgb), 0.87)',
};
const out = [];
const seen = new Set();
const unmapped = new Set();
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim();
  if (sel.startsWith('@')) continue;
  const decls = m[2].split(';').filter(d => d.trim().startsWith('--'));
  const keep = [];
  for (const d of decls) {
    const i = d.indexOf(':'); const name = d.slice(0, i).trim(); const val = d.slice(i + 1).trim();
    let v = map[val];
    const rg = val.match(/^rgba\((63, 81, 181|255, 64, 129|244, 67, 54), ([\d.]+)\)$/);
    if (rg) v = `rgba(var(${{'63, 81, 181':'--fb-primary-rgb','255, 64, 129':'--fb-accent-rgb','244, 67, 54':'--fb-danger-rgb'}[rg[1]]}), ${rg[2]})`;
    // Composants sans couleur explicite (checkbox, radio, slide-toggle…) : Material
    // les met en "accent" par défaut ; on les aligne sur la couleur de marque.
    if (v && sel === 'html') v = v.replace('--fb-accent', '--fb-primary');
    if (v !== undefined) keep.push(`${name}: ${v}`);
    else if (/63, ?81, ?181|255, ?64, ?129/.test(val)) unmapped.add(val);
  }
  if (keep.length) {
    const rule = `${sel} {\n  ${keep.join(';\n  ')};\n}`;
    if (!seen.has(rule)) { seen.add(rule); out.push(rule); }
  }
}
const header = `/*
 * Généré à partir du thème prébuilt Angular Material (indigo-pink) :
 * chaque jeton de couleur primaire/accent/warn est redirigé vers la palette
 * FamilyBalance (variables --fb-* de styles.css). Ne pas éditer à la main :
 * relancer « node scripts/generate-material-theme.js » si Angular Material change.
 */\n`;
fs.writeFileSync('src/styles/material-theme.css', header + out.join('\n') + '\n');
console.log('rules', out.length, 'unmapped', [...unmapped]);
