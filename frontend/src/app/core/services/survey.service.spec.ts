import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SurveyService } from './survey.service';
import {
  SurveyCatalogResponse,
  SurveyStateResponse,
  SurveyAnswerPayload,
  SurveyStartPayload,
} from '../../features/survey/models/survey.models';
import { API_BASE_URL } from '../config/api.config';

describe('SurveyService', () => {
  let service: SurveyService;
  let httpMock: HttpTestingController;

  const mockCatalogResponse: SurveyCatalogResponse = {
    status: 'success',
    age: 12,
    ageSegment: '12-15',
    domains: [
      { value: 'emotions', label: 'Émotions', questionCount: 2 },
      { value: 'comportements', label: 'Comportements', questionCount: 3 },
    ],
  };

  const mockStateResponse: SurveyStateResponse = {
    status: 'success',
    message: 'Session survey prête.',
    ageSegment: '12-15',
    catalog: { ageSegment: '12-15', domains: [] },
    session: {
      _id: 'session123',
      user: 'user123',
      domain: 'emotions',
      domainLabel: 'Émotions',
      age: 12,
      ageSegment: '12-15',
      status: 'in-progress',
      currentQuestionCode: 'A1215_1',
      answers: [],
      startedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    },
    currentQuestion: {
      code: 'A1215_1',
      domain: 'emotions',
      domainLabel: 'Émotions',
      ageSegments: ['12-15'],
      order: 1,
      type: 'single-choice',
      prompt: 'Comment te sens-tu ?',
      options: [
        { label: 'Bien', value: 'good' },
        { label: 'Mal', value: 'sad' },
      ],
    },
    completed: false,
    progress: { answered: 0, total: 8, percent: 0 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SurveyService],
    });

    service = TestBed.inject(SurveyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadCatalog', () => {
    it('devrait récupérer le catalogue pour un âge donné', (done) => {
      const age = 12;

      service.loadCatalog(age).subscribe((response) => {
        expect(response.status).toBe('success');
        expect(response.age).toBe(age);
        expect(response.ageSegment).toBe('12-15');
        expect(response.domains.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(
        (request) =>
          request.url === `${API_BASE_URL}/surveys/catalog` && request.params.get('age') === '12'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCatalogResponse);
    });

    it('devrait utiliser le cache pour le même âge', (done) => {
      const age = 12;

      // Première requête
      service.loadCatalog(age).subscribe(() => {
        // Deuxième requête (doit venir du cache)
        service.loadCatalog(age).subscribe((response) => {
          expect(response.status).toBe('success');
          done();
        });

        // Vérifier qu'il n'y a qu'une seule requête HTTP
        httpMock.expectNone(`${API_BASE_URL}/surveys/catalog`);
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/surveys/catalog`);
      req.flush(mockCatalogResponse);
    });

    it('devrait invalider le cache pour un âge différent', (done) => {
      const age1 = 12;
      const age2 = 8;

      // Première requête
      service.loadCatalog(age1).subscribe(() => {
        // Deuxième requête avec un âge différent
        service.loadCatalog(age2).subscribe(() => {
          done();
        });

        const req2 = httpMock.expectOne(
          (request) => request.url === `${API_BASE_URL}/surveys/catalog` && request.params.get('age') === '8'
        );
        expect(req2.request.method).toBe('GET');
        req2.flush(mockCatalogResponse);
      });

      const req1 = httpMock.expectOne(
        (request) => request.url === `${API_BASE_URL}/surveys/catalog` && request.params.get('age') === '12'
      );
      req1.flush(mockCatalogResponse);
    });

    it('devrait gérer les erreurs correctement', (done) => {
      const age = 12;

      service.loadCatalog(age).subscribe(
        () => {
          fail('devrait avoir généré une erreur');
        },
        (error) => {
          expect(error.message).toContain('Une erreur est survenue');
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE_URL}/surveys/catalog`);
      req.error(new ErrorEvent('Network error'), {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });

    it('devrait nettoyer le cache avec clearCache()', (done) => {
      const age = 12;

      service.loadCatalog(age).subscribe(() => {
        service.clearCache();

        service.loadCatalog(age).subscribe(() => {
          done();
        });

        const req2 = httpMock.expectOne(`${API_BASE_URL}/surveys/catalog`);
        req2.flush(mockCatalogResponse);
      });

      const req1 = httpMock.expectOne(`${API_BASE_URL}/surveys/catalog`);
      req1.flush(mockCatalogResponse);
    });
  });

  describe('startOrResumeSurvey', () => {
    it('devrait démarrer une nouvelle session survey', (done) => {
      const payload: SurveyStartPayload = { age: 12, domain: 'emotions' };

      service.startOrResumeSurvey(payload).subscribe((response) => {
        expect(response.status).toBe('success');
        expect(response.session.status).toBe('in-progress');
        done();
      });

      const req = httpMock.expectOne(`${API_BASE_URL}/surveys/sessions/start`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockStateResponse);
    });

    it('devrait transmettre les credentials', (done) => {
      const payload: SurveyStartPayload = { age: 12 };

      service.startOrResumeSurvey(payload).subscribe(() => done());

      const req = httpMock.expectOne(`${API_BASE_URL}/surveys/sessions/start`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockStateResponse);
    });
  });

  describe('saveAnswer', () => {
    it('devrait sauvegarder une réponse', (done) => {
      const sessionId = 'session123';
      const payload: SurveyAnswerPayload = { answer: 'good', advance: true };

      service.saveAnswer(sessionId, payload).subscribe((response) => {
        expect(response.status).toBe('success');
        done();
      });

      const req = httpMock.expectOne(
        `${API_BASE_URL}/surveys/sessions/${sessionId}/answers`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush(mockStateResponse);
    });

    it('devrait envoyer advance=false pour les brouillons', (done) => {
      const sessionId = 'session123';
      const payload: SurveyAnswerPayload = { answer: 'good', advance: false };

      service.saveAnswer(sessionId, payload).subscribe(() => done());

      const req = httpMock.expectOne(
        `${API_BASE_URL}/surveys/sessions/${sessionId}/answers`
      );
      expect(req.request.body.advance).toBe(false);
      req.flush(mockStateResponse);
    });
  });

  describe('completeSession', () => {
    it('devrait finaliser une session', (done) => {
      const sessionId = 'session123';

      service.completeSession(sessionId).subscribe((response) => {
        expect(response.status).toBe('success');
        done();
      });

      const req = httpMock.expectOne(
        `${API_BASE_URL}/surveys/sessions/${sessionId}/complete`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockStateResponse);
    });
  });

  describe('Error handling', () => {
    it('devrait logger les erreurs API', (done) => {
      spyOn(console, 'error');
      const age = 12;

      service.loadCatalog(age).subscribe(
        () => {},
        () => {
          expect(console.error).toHaveBeenCalledWith('Survey API Error:', jasmine.any(Object));
          done();
        }
      );

      const req = httpMock.expectOne(`${API_BASE_URL}/surveys/catalog`);
      req.error(new ErrorEvent('Network error'));
    });
  });
});
