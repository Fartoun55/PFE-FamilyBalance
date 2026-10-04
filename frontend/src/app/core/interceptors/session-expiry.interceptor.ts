import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Endpoints d'authentification eux-mêmes : un 401 renvoyé par ces routes signale un
 * échec métier normal (mauvais mot de passe, token de rafraîchissement expiré, code MFA
 * invalide...), pas une session applicative à invalider. Ne jamais rediriger dessus,
 * sinon la page de login se recharge elle-même en boucle sur une simple erreur de saisie.
 */
const AUTH_FLOW_URL_FRAGMENTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-mfa',
  '/auth/verify-email',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
];

/**
 * Filet de sécurité global : si une requête protégée revient en 401 (token absent,
 * invalide ou expiré côté serveur), on force la déconnexion locale et on renvoie vers
 * le login — sans attendre qu'une page pense elle-même à gérer ce cas.
 */
export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthFlowRequest = AUTH_FLOW_URL_FRAGMENTS.some((fragment) => req.url.includes(fragment));

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthFlowRequest) {
        const wasAuthenticated = authService.isAuthenticated();
        authService.clearSession();

        if (wasAuthenticated && !router.url.startsWith('/auth/login')) {
          router.navigateByUrl('/auth/login');
        }
      }

      return throwError(() => error);
    })
  );
};
