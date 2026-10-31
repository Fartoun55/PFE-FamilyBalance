// Liens envoyés par e-mail (activation, mot de passe oublié) : adresse publique et confidentialité.
const { getAppUrl, buildAppUrl, exposeSecretLinkInDev } = require('../src/config/env');

describe('getAppUrl / buildAppUrl', () => {
  const saved = { APP_URL: process.env.APP_URL, CLIENT_ORIGIN: process.env.CLIENT_ORIGIN, NODE_ENV: process.env.NODE_ENV };

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('utilise APP_URL en priorité (sans barre finale)', () => {
    process.env.APP_URL = 'http://familybalance-app.com/';
    process.env.CLIENT_ORIGIN = 'https://autre.example';
    expect(buildAppUrl('/auth/verify-email?token=abc')).toBe('http://familybalance-app.com/auth/verify-email?token=abc');
  });

  it('prend la première origine quand CLIENT_ORIGIN en liste plusieurs', () => {
    delete process.env.APP_URL;
    process.env.CLIENT_ORIGIN = 'http://familybalance-app.com, https://familybalance-app.com';
    expect(getAppUrl()).toBe('http://familybalance-app.com');
  });

  it('se rabat sur le serveur de développement Angular', () => {
    delete process.env.APP_URL;
    delete process.env.CLIENT_ORIGIN;
    expect(getAppUrl()).toBe('http://localhost:4200');
  });
});

describe('exposeSecretLinkInDev', () => {
  const saved = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = saved; });

  it("n'expose jamais le lien en production", () => {
    process.env.NODE_ENV = 'production';
    expect(exposeSecretLinkInDev('http://x/reset?token=secret', false)).toBeUndefined();
    expect(exposeSecretLinkInDev('http://x/reset?token=secret', true)).toBeUndefined();
  });

  it("n'expose pas le lien quand l'e-mail est parti", () => {
    process.env.NODE_ENV = 'development';
    expect(exposeSecretLinkInDev('http://x/reset?token=secret', true)).toBeUndefined();
  });

  it("expose le lien en développement seulement si l'e-mail n'a pas pu partir", () => {
    process.env.NODE_ENV = 'development';
    expect(exposeSecretLinkInDev('http://x/reset?token=secret', false)).toBe('http://x/reset?token=secret');
  });
});
