// Score combiné : sélection du dernier questionnaire de chaque domaine et couverture des domaines.
const { selectSessionsForScore, describeDomainCoverage, calculateSubScores } = require('../src/services/scoringService');

const day = (n) => new Date(Date.UTC(2026, 9, 1) + n * 24 * 60 * 60 * 1000);
const session = (id, domain, completedDay, extra = {}) => ({
  _id: id,
  domain,
  domainLabel: domain,
  ageSegment: '12-15',
  completedAt: day(completedDay),
  answers: [],
  ...extra,
});

const CATALOG = [
  { value: 'emotions', label: 'Émotions' },
  { value: 'comportements', label: 'Comportements' },
  { value: 'social', label: 'Social' },
  { value: 'screen_time', label: "Temps d'écran" },
];

describe('selectSessionsForScore', () => {
  it('retient la session de référence et le dernier questionnaire de chaque autre domaine', () => {
    const reference = session('ref', 'emotions', 30);
    const used = selectSessionsForScore(reference, [
      session('s1', 'social', 10),
      session('s2', 'social', 20),
      session('c1', 'comportements', 25),
    ]);

    expect(used.map((s) => s._id).sort()).toEqual(['c1', 'ref', 's2']);
  });

  it('ignore les autres sessions du même domaine que la référence', () => {
    const reference = session('ref', 'emotions', 30);
    const used = selectSessionsForScore(reference, [session('old', 'emotions', 5), session('new', 'emotions', 29)]);

    expect(used.map((s) => s._id)).toEqual(['ref']);
  });

  it('exclut les sessions trop anciennes (fenêtre de 90 jours)', () => {
    const reference = session('ref', 'emotions', 120);
    const used = selectSessionsForScore(reference, [session('vieux', 'social', 10), session('recent', 'social', 100)]);

    expect(used.map((s) => s._id).sort()).toEqual(['recent', 'ref']);
  });

  it('exclut les sessions postérieures à la référence (recalcul reproductible)', () => {
    const reference = session('ref', 'emotions', 30);
    const used = selectSessionsForScore(reference, [session('futur', 'social', 40)]);

    expect(used.map((s) => s._id)).toEqual(['ref']);
  });

  it("exclut les sessions d'une autre tranche d'âge", () => {
    const reference = session('ref', 'emotions', 30);
    const used = selectSessionsForScore(reference, [session('autre', 'social', 20, { ageSegment: '7-11' })]);

    expect(used.map((s) => s._id)).toEqual(['ref']);
  });
});

describe('describeDomainCoverage', () => {
  it('liste les domaines évalués et manquants dans l\'ordre du catalogue', () => {
    const { covered, missing } = describeDomainCoverage(
      [session('s', 'social', 1, { domainLabel: 'Social' }), session('e', 'emotions', 2, { domainLabel: 'Émotions' })],
      CATALOG
    );

    expect(covered.map((c) => c.domain)).toEqual(['emotions', 'social']);
    expect(missing).toEqual([
      { domain: 'comportements', domainLabel: 'Comportements' },
      { domain: 'screen_time', domainLabel: "Temps d'écran" },
    ]);
  });
});

describe('calculateSubScores (combinaison de domaines)', () => {
  const answer = (domain, value) => ({ domain, type: 'likert', answer: value, draft: false });

  it('le sous-score social reflète les réponses du domaine Social quand il est évalué', () => {
    const emotionsOnly = calculateSubScores([answer('emotions', 5), answer('emotions', 5)]);
    const combined = calculateSubScores([
      answer('emotions', 5),
      answer('emotions', 5),
      answer('social', 1),
      answer('social', 1),
    ]);

    // Avec Émotions seul, le social est déduit de réponses positives sur les émotions.
    expect(emotionsOnly.social).toBe(100);
    // Une fois le domaine Social évalué (réponses négatives), le sous-score social baisse nettement.
    expect(combined.social).toBeLessThan(40);
  });
});
