import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ApiFieldErrors,
  SpecialistFilters,
  SpecialistListResponse,
  SpecialistPayload,
  SpecialistResponse,
} from '../models/specialist-admin.models';

/** Gestion des spécialistes — API réservée aux administrateurs (/api/admin/specialists). */
@Injectable({ providedIn: 'root' })
export class SpecialistAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/admin/specialists`;

  list(filters: SpecialistFilters = {}): Observable<SpecialistListResponse> {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters.city) params = params.set('city', filters.city);
    if (filters.specialization) params = params.set('specialization', filters.specialization);
    return this.http.get<SpecialistListResponse>(this.baseUrl, { params });
  }

  get(id: string): Observable<SpecialistResponse> {
    return this.http.get<SpecialistResponse>(`${this.baseUrl}/${id}`);
  }

  create(payload: SpecialistPayload): Observable<SpecialistResponse> {
    return this.http.post<SpecialistResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<SpecialistPayload>): Observable<SpecialistResponse> {
    return this.http.patch<SpecialistResponse>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(`${this.baseUrl}/${id}`);
  }

  /** Traduit une erreur HTTP en message lisible (réseau, droits, validation par champ). */
  static describeError(error: unknown, fallback: string): ApiFieldErrors {
    const http = error as HttpErrorResponse;
    if (http?.status === 0) {
      return { message: 'Serveur injoignable. Vérifiez votre connexion et réessayez.', fields: {} };
    }
    if (http?.status === 403) {
      return { message: "Accès refusé : cette action est réservée aux administrateurs.", fields: {} };
    }
    return {
      message: http?.error?.message || fallback,
      fields: (http?.error?.errors as Record<string, string>) || {},
    };
  }
}
