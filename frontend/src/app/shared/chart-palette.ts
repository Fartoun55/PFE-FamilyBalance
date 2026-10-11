/**
 * Palette catégorielle des graphiques (ordre fixe, jamais recyclé).
 * Validée (bande de luminosité, chroma, séparation daltonisme ΔE ≥ 8, vision
 * normale) sur fond blanc. Contraste < 3:1 pour les créneaux 3 à 5 : les
 * graphiques affichent donc toujours une légende et des infobulles.
 */
export const CHART_SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'] as const;

/** Couleurs neutres partagées (axes, grilles, texte) — alignées sur les jetons --fb-*. */
export const CHART_INK = {
  text: '#475569',
  grid: '#e4eaf3',
  font: "'Figtree', 'Segoe UI', system-ui, sans-serif",
} as const;
