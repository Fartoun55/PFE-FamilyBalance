export type UserRole = 'parent' | 'adolescent' | 'specialist' | 'admin';

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Présent uniquement pour role === 'adolescent'. */
  adolescentProfile?: {
    birthDate?: string;
    ageSegment?: string;
    consentGiven?: boolean;
  };
}

export interface AuthResponse {
  status: 'success' | 'fail' | 'error';
  message: string;
  user: UserProfile;
  accessToken?: string;
  refreshToken?: string;
  requiresMfa?: boolean;
  mfaToken?: string;
  mfaCodeSent?: boolean;
  maskedEmail?: string;
  challengeExpiresAt?: string;
}

export interface RegisterResponse {
  status: 'success' | 'fail' | 'error';
  message: string;
  user: UserProfile;
  requiresEmailVerification?: boolean;
  verificationEmailSent?: boolean;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  adminRegistrationKey?: string;
  phone?: string;
  specialistProfile?: {
    specialization: string;
    licenseNumber: string;
    city?: string;
    tariff?: number;
  };
  adolescentProfile?: {
    parentId: string;
    birthDate: string;
    consentGiven: boolean;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MfaVerifyPayload {
  token: string;
  code: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialistProfile?: {
    specialization?: string;
    licenseNumber?: string;
    city?: string;
    tariff?: number;
  };
}

export interface LinkedAdolescentProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  adolescentProfile?: {
    birthDate?: string;
    consentGiven?: boolean;
  };
}
