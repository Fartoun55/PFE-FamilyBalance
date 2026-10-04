import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import {
  SurveyAnswerPayload,
  SurveyCatalogResponse,
  SurveyStartPayload,
  SurveyStateResponse,
} from '../../features/survey/models/survey.models';

interface CacheEntry {
  data: SurveyCatalogResponse;
  timestamp: number;
  age: number;
}

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private catalogCache: CacheEntry | null = null;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 heure
  private catalogRequest$: Observable<SurveyCatalogResponse> | null = null;

  constructor(private readonly http: HttpClient) {}

  private handleError(error: any) {
    console.error('Survey API Error:', error);
    const message = error.error?.message || 'Une erreur est survenue avec le questionnaire';
    return throwError(() => new Error(message));
  }

  private isCacheValid(age: number): boolean {
    if (!this.catalogCache) return false;
    if (this.catalogCache.age !== age) return false;
    const now = Date.now();
    return now - this.catalogCache.timestamp < this.CACHE_DURATION;
  }

  loadCatalog(age?: number, childId?: string): Observable<SurveyCatalogResponse> {
    if (childId) {
      // Mode "parent pilote un enfant" : l'âge est dérivé côté serveur, pas de cache local
      // (le contexte enfant peut changer d'une requête à l'autre).
      const params: { [key: string]: string } = { childId };
      if (age !== undefined) {
        params['age'] = String(age);
      }

      return this.http
        .get<SurveyCatalogResponse>(`${API_BASE_URL}/surveys/catalog`, { params, withCredentials: true })
        .pipe(catchError((error) => this.handleError(error)));
    }

    // Comportement historique inchangé (auto-évaluation par l'utilisateur connecté).
    if (age !== undefined && this.isCacheValid(age)) {
      return new Observable((observer) => {
        observer.next(this.catalogCache!.data);
        observer.complete();
      });
    }

    if (this.catalogRequest$) {
      return this.catalogRequest$;
    }

    this.catalogRequest$ = this.http
      .get<SurveyCatalogResponse>(`${API_BASE_URL}/surveys/catalog`, {
        params: age !== undefined ? { age: String(age) } : {},
        withCredentials: true,
      })
      .pipe(
        tap((data) => {
          this.catalogCache = { data, timestamp: Date.now(), age: age as number };
          this.catalogRequest$ = null;
        }),
        catchError((error) => {
          this.catalogRequest$ = null;
          return this.handleError(error);
        }),
        shareReplay(1)
      );

    return this.catalogRequest$;
  }

  startOrResumeSurvey(payload: SurveyStartPayload): Observable<SurveyStateResponse> {
    return this.http
      .post<SurveyStateResponse>(`${API_BASE_URL}/surveys/sessions/start`, payload, {
        withCredentials: true,
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  saveAnswer(sessionId: string, payload: SurveyAnswerPayload): Observable<SurveyStateResponse> {
    return this.http
      .patch<SurveyStateResponse>(
        `${API_BASE_URL}/surveys/sessions/${sessionId}/answers`,
        payload,
        { withCredentials: true }
      )
      .pipe(catchError((error) => this.handleError(error)));
  }

  completeSession(sessionId: string): Observable<SurveyStateResponse> {
    return this.http
      .post<SurveyStateResponse>(
        `${API_BASE_URL}/surveys/sessions/${sessionId}/complete`,
        {},
        { withCredentials: true }
      )
      .pipe(catchError((error) => this.handleError(error)));
  }

  clearCache(): void {
    this.catalogCache = null;
  }
}