import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay, finalize } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  AuthResponse,
  LoginPayload,
  RegisterResponse,
  RegisterPayload,
  MfaVerifyPayload,
  UpdateProfilePayload,
  LinkedAdolescentProfile,
  UserProfile,
} from '../models/auth.models';

interface MeResponse {
  status: 'success' | 'fail' | 'error';
  user: UserProfile;
}

interface UpdateProfileResponse {
  status: 'success' | 'fail' | 'error';
  message: string;
  user: UserProfile;
}

interface MyAdolescentsResponse {
  status: 'success' | 'fail' | 'error';
  count: number;
  adolescents: LinkedAdolescentProfile[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessTokenKey = 'familybalance_access_token';
  private readonly currentUserKey = 'familybalance_current_user';
  private readonly currentUserSignal = signal<UserProfile | null>(null);
  /**
   * Mémorise le rafraîchissement en cours (le cas échéant) pour que plusieurs requêtes
   * qui échouent en 401 en même temps déclenchent un seul appel réseau à /auth/refresh
   * au lieu d'une rafale d'appels concurrents (voir authInterceptor).
   */
  private refreshInFlight$: Observable<AuthResponse> | null = null;

  readonly currentUser = computed(() => this.currentUserSignal());

  constructor(private readonly http: HttpClient) {
    // La session vivait auparavant dans localStorage (persistante entre fermetures du
    // navigateur). Elle est désormais en sessionStorage (voir getAccessToken/setSession) :
    // on purge ici toute trace de l'ancien stockage pour qu'un utilisateur qui rouvre
    // l'app après une mise à jour ne se retrouve pas connecté malgré lui.
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.currentUserKey);
    this.hydrateUserFromStorage();
  }

  /**
   * Volontairement une méthode et non un `computed()` : la validité dépend de
   * sessionStorage et de l'horloge (expiration du JWT), qui ne sont pas des signaux.
   * Un `computed()` sans dépendance réactive se figerait à sa première évaluation.
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  register(payload: RegisterPayload): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, payload, {
      withCredentials: true,
    });
  }

  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/verify-email`, { token }, { withCredentials: true })
      .pipe(tap((response) => this.applyAuthResponse(response)));
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, payload, { withCredentials: true })
      .pipe(tap((response) => this.applyAuthResponse(response)));
  }

  verifyMfa(payload: MfaVerifyPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/verify-mfa`, payload, { withCredentials: true })
      .pipe(tap((response) => this.applyAuthResponse(response)));
  }

  /**
   * Échange le refresh token (cookie httpOnly, envoyé automatiquement via
   * withCredentials) contre un nouvel access token, sans repasser par le mot de passe
   * ni la MFA. Utilisé exclusivement par authInterceptor lorsqu'une requête échoue en
   * 401 (access token expiré) : la session reste active tant que le refresh token
   * (7 jours) est valide, au lieu de forcer une reconnexion complète toutes les 15 min.
   */
  refreshAccessToken(): Observable<AuthResponse> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.applyAuthResponse(response)),
        shareReplay(1),
        finalize(() => {
          this.refreshInFlight$ = null;
        })
      );

    return this.refreshInFlight$;
  }

  me(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>(`${API_BASE_URL}/auth/me`, { withCredentials: true })
      .pipe(tap((response) => this.setCurrentUser(response.user)));
  }

  logout(): Observable<{ status: string; message: string }> {
    return this.http
      .post<{ status: string; message: string }>(
        `${API_BASE_URL}/auth/logout`,
        {},
        { withCredentials: true }
      )
      .pipe(tap(() => this.clearSession()));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UpdateProfileResponse> {
    return this.http
      .patch<UpdateProfileResponse>(`${API_BASE_URL}/auth/me`, payload, { withCredentials: true })
      .pipe(tap((response) => this.setCurrentUser(response.user)));
  }

  getMyAdolescents(): Observable<MyAdolescentsResponse> {
    return this.http.get<MyAdolescentsResponse>(`${API_BASE_URL}/auth/me/adolescents`, {
      withCredentials: true,
    });
  }

  /**
   * Retourne le token seulement s'il est présent ET non expiré. Un token expiré est
   * traité comme une absence de session (et purge le stockage au passage) : c'est le
   * point de vérité unique utilisé par les guards, l'intercepteur et les templates.
   */
  getAccessToken(): string | null {
    const token = sessionStorage.getItem(this.accessTokenKey);
    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      this.clearSession();
      return null;
    }

    return token;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadSegment = token.split('.')[1];
      if (!payloadSegment) {
        return true;
      }

      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded)) as { exp?: number };

      if (!payload.exp) {
        return true;
      }

      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  hydrateUserFromStorage(): void {
    if (!this.getAccessToken()) {
      this.currentUserSignal.set(null);
      sessionStorage.removeItem(this.currentUserKey);
      return;
    }

    const serializedUser = sessionStorage.getItem(this.currentUserKey);
    if (!serializedUser) {
      return;
    }

    try {
      const user = JSON.parse(serializedUser) as UserProfile;
      this.currentUserSignal.set(user);
    } catch {
      sessionStorage.removeItem(this.currentUserKey);
      this.currentUserSignal.set(null);
    }
  }

  hasRole(role: UserProfile['role']): boolean {
    return this.currentUserSignal()?.role === role;
  }

  getHomeRoute(): string {
    switch (this.currentUserSignal()?.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'adolescent':
        return '/dashboard/adolescent';
      case 'specialist':
        return '/teleconsultation';
      case 'parent':
      default:
        return '/family/dashboard';
    }
  }

  private setSession(user: UserProfile, token: string): void {
    sessionStorage.setItem(this.accessTokenKey, token);
    this.setCurrentUser(user);
  }

  private applyAuthResponse(response: AuthResponse): void {
    if (response.accessToken) {
      this.setSession(response.user, response.accessToken);
      return;
    }

    this.clearSession();
  }

  private setCurrentUser(user: UserProfile): void {
    sessionStorage.setItem(this.currentUserKey, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  clearSession(): void {
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.currentUserKey);
    this.currentUserSignal.set(null);
  }
}
