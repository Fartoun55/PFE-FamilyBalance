import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

@Injectable()
export class HttpTimeoutInterceptor implements HttpInterceptor {
  private readonly TIMEOUT_MS = 30000; // 30 secondes
  private readonly RETRY_ATTEMPTS = 2;
  private readonly RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      timeout(this.TIMEOUT_MS),
      retry({
        count: this.RETRY_ATTEMPTS,
        delay: (error: any, retryCount: number) => {
          // Retry uniquement sur certains codes d'erreur
          if (error instanceof HttpErrorResponse) {
            if (!this.RETRYABLE_STATUS_CODES.includes(error.status)) {
              return throwError(() => error);
            }
          }
          // Délai exponentiel : 1s, 2s, 4s
          const delayMs = Math.pow(2, retryCount) * 1000;
          console.warn(
            `Retry tentative ${retryCount}/${this.RETRY_ATTEMPTS} après ${delayMs}ms`
          );
          return new Observable((observer) => {
            setTimeout(() => observer.complete(), delayMs);
          });
        },
      }),
      catchError((error: any) => {
        if (error.name === 'TimeoutError') {
          console.error('Requête expirée après 30 secondes');
          return throwError(
            () => new Error('La requête a expiré. Veuillez vérifier votre connexion.')
          );
        }
        return throwError(() => error);
      })
    );
  }
}
