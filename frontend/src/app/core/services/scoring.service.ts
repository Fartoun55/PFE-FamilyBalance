import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  CalculateScoringResponse,
  HistoryScoringResponse,
  LatestScoringResponse,
} from '../../features/scoring/models/scoring.models';

@Injectable({ providedIn: 'root' })
export class ScoringService {
  constructor(private readonly http: HttpClient) {}

  private childParams(childId?: string): { [param: string]: string } {
    return childId ? { childId } : {};
  }

  latest(childId?: string): Observable<LatestScoringResponse> {
    return this.http.get<LatestScoringResponse>(`${API_BASE_URL}/scoring/latest`, {
      withCredentials: true,
      params: this.childParams(childId),
    });
  }

  history(childId?: string): Observable<HistoryScoringResponse> {
    return this.http.get<HistoryScoringResponse>(`${API_BASE_URL}/scoring/history`, {
      withCredentials: true,
      params: this.childParams(childId),
    });
  }

  calculateFromSession(sessionId: string): Observable<CalculateScoringResponse> {
    return this.http.post<CalculateScoringResponse>(
      `${API_BASE_URL}/scoring/sessions/${sessionId}/calculate`,
      {},
      { withCredentials: true }
    );
  }

  downloadLatestReportPdf(childId?: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/scoring/report/latest-pdf`, {
      responseType: 'blob',
      withCredentials: true,
      params: this.childParams(childId),
    });
  }
}