import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { EducationResource } from '../../education/models/education.models';

export interface AdolescentDashboard {
  adolescent: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    adolescentProfile: {
      birthDate: string;
      parentId: string;
      consentGiven: boolean;
    };
  };
  parent: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  stats: {
    totalSurveys: number;
    lastSurveyDate: string | null;
    averageScore: number;
    riskLevel: string;
  };
  latestScore: any;
  recentScores: any[];
  surveySessions: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AdolescentDashboardService {
  private baseUrl = `${API_BASE_URL}/adolescent-dashboard`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<AdolescentDashboard> {
    return this.http.get<AdolescentDashboard>(`${this.baseUrl}/overview`, { withCredentials: true });
  }

  getResources(): Observable<{ status: string; age: number | null; ageGroup: string; resources: EducationResource[] }> {
    return this.http.get<{ status: string; age: number | null; ageGroup: string; resources: EducationResource[] }>(
      `${this.baseUrl}/resources`,
      { withCredentials: true }
    );
  }
}
