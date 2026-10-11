export interface AvailabilityRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active?: boolean;
}

export interface SpecialistStats {
  totalAppointments: number;
  upcomingAppointments: number;
  patientCount: number;
}

export interface AdminSpecialist {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  specialization: string;
  licenseNumber: string;
  city: string;
  tariff: number | null;
  languages: string[];
  bio: string;
  availabilityRules: AvailabilityRule[];
  averageRating: number | null;
  directoryProfileId: string | null;
  listedInDirectory: boolean;
  stats: SpecialistStats;
  recentAppointments?: Array<{
    _id: string;
    slotStart: string;
    status: string;
    reason: string;
    patientName: string;
    patientRole: string | null;
  }>;
}

export interface SpecialistListResponse {
  status: string;
  count: number;
  specialists: AdminSpecialist[];
  filters: { cities: string[]; specializations: string[] };
}

export interface SpecialistResponse {
  status: string;
  message?: string;
  specialist: AdminSpecialist;
}

export interface SpecialistPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialization: string;
  licenseNumber: string;
  city?: string;
  tariff?: number | null;
  languages: string[];
  bio?: string;
  isActive: boolean;
  availabilityRules: AvailabilityRule[];
  password?: string;
  confirmPassword?: string;
}

export interface SpecialistFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  city?: string;
  specialization?: string;
}

/** Erreur API normalisée : message global + erreurs par champ (`errors`). */
export interface ApiFieldErrors {
  message: string;
  fields: Record<string, string>;
}
