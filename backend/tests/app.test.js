// Tests de l'API Express sans base de données : santé, sécurité HTTP, contrôle d'accès
// et validation des entrées. Aucune de ces requêtes n'atteint MongoDB.
process.env.NODE_ENV = 'test';
process.env.CLIENT_ORIGIN = 'http://localhost:4200';

const request = require('supertest');
const app = require('../src/app');

describe('Santé du service', () => {
  it('GET /health répond 200 (sonde Kubernetes)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'familybalance-backend' });
  });

  it('applique les en-têtes de sécurité (helmet)', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Routes inconnues', () => {
  it('renvoie une erreur 404 en JSON', async () => {
    const res = await request(app).get('/api/route-inexistante');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(JSON.stringify(res.body)).toContain('/api/route-inexistante');
  });
});

describe('Contrôle d\'accès (middleware protect)', () => {
  it.each([
    ['GET', '/api/auth/me'],
    ['GET', '/api/notifications'],
    ['GET', '/api/admin/specialists'],
    ['GET', '/api/teleconsultation/dashboard'],
    ['GET', '/api/family-dashboard'],
  ])('%s %s sans jeton -> 401', async (method, url) => {
    const res = await request(app)[method.toLowerCase()](url);

    expect(res.status).toBe(401);
  });

  it('refuse un jeton invalide -> 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer jeton.invalide.123');

    expect(res.status).toBe(401);
  });
});

describe('Validation des entrées (avant tout accès à la base)', () => {
  it('POST /api/auth/login sans identifiants -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login avec un e-mail invalide -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'pas-un-email', password: 'x' });

    expect(res.status).toBe(400);
  });
});

describe('CORS', () => {
  it('autorise l\'origine configurée dans CLIENT_ORIGIN', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:4200');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('n\'autorise pas une origine inconnue', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://site-malveillant.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
