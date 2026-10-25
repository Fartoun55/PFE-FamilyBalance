import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  TeleconsultationAppointment,
  TeleconsultationMessage,
  TeleconsultationPatientSummary,
  TeleconsultationSpecialistProfile,
} from '../../features/teleconsultation/models/teleconsultation.models';

interface DirectoryResponse {
  status: string;
  count: number;
  specialists: TeleconsultationSpecialistProfile[];
}

interface SlotsResponse {
  status: string;
  count: number;
  slots: Array<{ start: string; end: string; label: string }>;
}

interface AppointmentsResponse {
  status: string;
  count: number;
  appointments: TeleconsultationAppointment[];
}

interface AppointmentResponse {
  status: string;
  message: string;
  appointment: TeleconsultationAppointment;
}

interface MessagesResponse {
  status: string;
  count: number;
  messages: TeleconsultationMessage[];
}

interface SendMessageResponse {
  status: string;
  message: string;
  conversationMessage: TeleconsultationMessage;
}

interface SpecialistDashboardResponse {
  status: string;
  specialistProfile: TeleconsultationSpecialistProfile;
  appointments: TeleconsultationAppointment[];
  patients: TeleconsultationPatientSummary[];
}

@Injectable({ providedIn: 'root' })
export class TeleconsultationService {
  constructor(private readonly http: HttpClient) {}

  getSpecialists(filters: { speciality?: string; language?: string; city?: string; maxTariff?: number; date?: string }): Observable<DirectoryResponse> {
    return this.http.get<DirectoryResponse>(`${API_BASE_URL}/teleconsultation/specialists`, {
      withCredentials: true,
      params: {
        ...(filters.speciality ? { speciality: filters.speciality } : {}),
        ...(filters.language ? { language: filters.language } : {}),
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.maxTariff !== undefined ? { maxTariff: String(filters.maxTariff) } : {}),
        ...(filters.date ? { date: filters.date } : {}),
      },
    });
  }

  getSlots(specialistId: string, date?: string): Observable<SlotsResponse> {
    return this.http.get<SlotsResponse>(`${API_BASE_URL}/teleconsultation/specialists/${specialistId}/slots`, {
      withCredentials: true,
      params: date ? { date } : {},
    });
  }

  bookAppointment(payload: {
    specialistProfileId: string;
    reason: string;
    consultationMode: 'video' | 'audio' | 'chat';
    slotStart: string;
    slotEnd: string;
    meetingProvider?: 'jitsi' | 'daily';
  }): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${API_BASE_URL}/teleconsultation/appointments`, payload, {
      withCredentials: true,
    });
  }

  rescheduleAppointment(appointmentId: string, payload: { slotStart: string; slotEnd: string }): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(
      `${API_BASE_URL}/teleconsultation/appointments/${appointmentId}/reschedule`,
      payload,
      { withCredentials: true }
    );
  }

  myAppointments(): Observable<AppointmentsResponse> {
    return this.http.get<AppointmentsResponse>(`${API_BASE_URL}/teleconsultation/appointments/me`, {
      withCredentials: true,
    });
  }

  shareBilan(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(
      `${API_BASE_URL}/teleconsultation/appointments/${appointmentId}/share-bilan`,
      {},
      { withCredentials: true }
    );
  }

  specialistDashboard(): Observable<SpecialistDashboardResponse> {
    return this.http.get<SpecialistDashboardResponse>(`${API_BASE_URL}/teleconsultation/dashboard`, {
      withCredentials: true,
    });
  }

  cancelAppointment(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(
      `${API_BASE_URL}/teleconsultation/appointments/${appointmentId}/cancel`,
      {},
      { withCredentials: true }
    );
  }

  getMessages(appointmentId: string): Observable<MessagesResponse> {
    return this.http.get<MessagesResponse>(`${API_BASE_URL}/teleconsultation/appointments/${appointmentId}/messages`, {
      withCredentials: true,
    });
  }

  sendMessage(appointmentId: string, content: string, messageType: 'pre' | 'post' = 'pre'): Observable<SendMessageResponse> {
    return this.http.post<SendMessageResponse>(
      `${API_BASE_URL}/teleconsultation/appointments/${appointmentId}/messages`,
      { content, messageType },
      { withCredentials: true }
    );
  }
}
