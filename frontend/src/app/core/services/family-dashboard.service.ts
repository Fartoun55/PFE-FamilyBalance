import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  FamilyDashboardChild,
  FamilyDashboardOverviewResponse,
} from '../../features/family/models/family-dashboard.models';

@Injectable({ providedIn: 'root' })
export class FamilyDashboardService {
  constructor(private readonly http: HttpClient) {}

  getOverview(): Observable<FamilyDashboardOverviewResponse> {
    return this.http.get<FamilyDashboardOverviewResponse>(`${API_BASE_URL}/family-dashboard/overview`, {
      withCredentials: true,
    });
  }

  downloadChildPdf(childId: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/family-dashboard/children/${childId}/report-pdf`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }
}
