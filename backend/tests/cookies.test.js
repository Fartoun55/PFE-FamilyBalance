// Attribut « Secure » du cookie de session selon l'environnement.
const { useSecureCookies } = require('../src/config/env');

describe('useSecureCookies', () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, COOKIE_SECURE: process.env.COOKIE_SECURE };

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('est actif par défaut en production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.COOKIE_SECURE;
    expect(useSecureCookies()).toBe(true);
  });

  it('est inactif par défaut en développement', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.COOKIE_SECURE;
    expect(useSecureCookies()).toBe(false);
  });

  it('COOKIE_SECURE=false le désactive en production (site en HTTP)', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECURE = 'false';
    expect(useSecureCookies()).toBe(false);
  });

  it('COOKIE_SECURE=true le force', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SECURE = 'true';
    expect(useSecureCookies()).toBe(true);
  });
});
