import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTimeoutInterceptor } from './http-timeout.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

describe('HttpTimeoutInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: HttpTimeoutInterceptor,
          multi: true,
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait compléter les requêtes rapides sans timeout', (done) => {
    httpClient.get('/test').subscribe((data) => {
      expect(data).toEqual({ success: true });
      done();
    });

    const req = httpMock.expectOne('/test');
    req.flush({ success: true });
  });

  it('devrait retry sur les erreurs 5xx', (done) => {
    spyOn(console, 'warn');

    httpClient.get('/test').subscribe(
      () => {},
      (error: HttpErrorResponse) => {
        expect(error.status).toBe(503);
        expect(console.warn).toHaveBeenCalled();
        done();
      }
    );

    // Première tentative : erreur 503
    const req1 = httpMock.expectOne('/test');
    req1.flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });

    // Deuxième tentative (après 1s) : erreur 503
    setTimeout(() => {
      const req2 = httpMock.expectOne('/test');
      req2.flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });

      // Troisième tentative (après 2s) : erreur 503
      setTimeout(() => {
        const req3 = httpMock.expectOne('/test');
        req3.flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
      }, 2100);
    }, 1100);
  }, 10000);

  it('devrait ne pas retry sur les erreurs 4xx', (done) => {
    httpClient.get('/test').subscribe(
      () => {},
      (error: HttpErrorResponse) => {
        expect(error.status).toBe(400);
        done();
      }
    );

    const req = httpMock.expectOne('/test');
    req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
  });

  it('devrait retry sur timeout 408', (done) => {
    spyOn(console, 'warn');

    httpClient.get('/test').subscribe(
      () => {},
      (error: HttpErrorResponse) => {
        expect(error.status).toBe(408);
        expect(console.warn).toHaveBeenCalled();
        done();
      }
    );

    const req1 = httpMock.expectOne('/test');
    req1.flush('Request timeout', { status: 408, statusText: 'Request Timeout' });

    setTimeout(() => {
      const req2 = httpMock.expectOne('/test');
      req2.flush('Request timeout', { status: 408, statusText: 'Request Timeout' });

      setTimeout(() => {
        const req3 = httpMock.expectOne('/test');
        req3.flush('Request timeout', { status: 408, statusText: 'Request Timeout' });
      }, 2100);
    }, 1100);
  }, 10000);

  it('devrait retry sur rate limit 429', (done) => {
    spyOn(console, 'warn');

    httpClient.get('/test').subscribe(
      () => {},
      (error: HttpErrorResponse) => {
        expect(error.status).toBe(429);
        done();
      }
    );

    const req1 = httpMock.expectOne('/test');
    req1.flush('Too many requests', { status: 429, statusText: 'Too Many Requests' });

    setTimeout(() => {
      const req2 = httpMock.expectOne('/test');
      req2.flush('Too many requests', { status: 429, statusText: 'Too Many Requests' });

      setTimeout(() => {
        const req3 = httpMock.expectOne('/test');
        req3.flush('Too many requests', { status: 429, statusText: 'Too Many Requests' });
      }, 2100);
    }, 1100);
  }, 10000);
});
