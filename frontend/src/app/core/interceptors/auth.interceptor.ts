import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Endpoints d'authentification eux-mêmes : jamais de tentative de rafraîchissement
 * dessus, sinon un /auth/refresh qui répond 401 (refresh token expiré/révoqué)
 * bouclerait sur lui-même indéfiniment.
 */
const AUTH_ENDPOINTS_WITHOUT_REFRESH = /\/auth\/(login|register|refresh|verify-mfa|verify-email|logout)(\?|$)/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const canAttemptRefresh = isUnauthorized && !!token && !AUTH_ENDPOINTS_WITHOUT_REFRESH.test(req.url);

      if (!canAttemptRefresh) {
        return throwError(() => error);
      }

      // Access token expiré (15 min) mais le refresh token (cookie httpOnly, 7 jours)
      // est peut-être encore valide : on tente un rafraîchissement silencieux avant de
      // forcer une reconnexion complète (mot de passe + MFA).
      return authService.refreshAccessToken().pipe(
        switchMap((result) => {
          // AuthResponse.accessToken est optionnel dans le type (cas MFA en attente),
          // mais /auth/refresh le renvoie toujours en cas de succès HTTP 2xx ; son
          // absence signale une réponse anormale, traitée comme un échec de refresh.
          if (!result.accessToken) {
            return throwError(() => error);
          }
          const retriedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${result.accessToken}` },
          });
          return next(retriedReq);
        }),
        catchError((refreshError) => {
          // Refresh token lui aussi invalide/expiré/révoqué : on nettoie la session
          // pour que les guards redirigent proprement vers la connexion.
          authService.clearSession();
          router.navigateByUrl('/auth/login');
          return throwError(() => refreshError);
        })
      );
    })
  );
};
