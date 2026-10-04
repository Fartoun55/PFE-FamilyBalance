export interface TeleconsultationSpecialistProfile {
  _id: string;
  displayName: string;
  specialization: string;
  languages: string[];
  tariff: number;
  city?: string;
  bio?: string;
  averageRating?: number;
  hasAvailability?: boolean;
  nextSlots?: Array<{ start: string; end: string; label: string }>;
}

export interface TeleconsultationAppointment {
  _id: string;
  reason: string;
  consultationMode: 'video' | 'audio' | 'chat';
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  slotStart: string;
  slotEnd: string;
  meetingProvider: 'jitsi' | 'daily';
  meetingUrl: string;
  waitingRoomMessage: string;
  bilanShared?: boolean;
  bilanSharedAt?: string;
  sharedScoreSnapshot?: {
    globalScore: number;
    riskLevel: 'green' | 'orange' | 'red';
    subScores: {
      comportemental: number;
      emotionnel: number;
      social: number;
      parental: number;
    };
    recommendations: string[];
    ageSegment: string;
    calculatedAt: string;
  };
  specialistProfile: TeleconsultationSpecialistProfile;
  /** Présent quand l'appel provient du tableau de bord spécialiste (patient concerné par le rendez-vous). */
  patient?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface TeleconsultationMessage {
  _id: string;
  sender: string;
  recipient: string;
  messageType: 'pre' | 'post';
  content: string;
  createdAt: string;
}

export interface TeleconsultationPatientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  latestScore?: {
    globalScore: number;
    riskLevel: string;
    calculatedAt: string;
  } | null;
  openAlerts: Array<{ message: string; createdAt: string }>;
}
