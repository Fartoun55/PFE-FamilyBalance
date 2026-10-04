import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';

export interface Adolescent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  adolescentProfile: {
    birthDate: string;
    ageSegment?: string;
    consentGiven: boolean;
  };
  createdAt: string;
}

export interface AddAdolescentRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  consentGiven: boolean;
  ageSegment?: string;
}

export interface AddAdolescentResponse {
  status: string;
  message: string;
  adolescent: Adolescent;
  verificationEmailSent: boolean;
  verificationUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdolescentService {
  private baseUrl = `${API_BASE_URL}/auth`;

  constructor(private http: HttpClient) {}

  getMyAdolescents(): Observable<{ status: string; count: number; adolescents: Adolescent[] }> {
    return this.http.get<{ status: string; count: number; adolescents: Adolescent[] }>(
      `${this.baseUrl}/me/adolescents`,
      { withCredentials: true }
    );
  }

  addAdolescent(data: AddAdolescentRequest): Observable<AddAdolescentResponse> {
    return this.http.post<AddAdolescentResponse>(`${this.baseUrl}/me/adolescents`, data, {
      withCredentials: true,
    });
  }
}
