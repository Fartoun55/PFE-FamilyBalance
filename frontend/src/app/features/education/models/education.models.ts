export type EducationResourceContentType = 'image' | 'pdf' | 'video' | 'link';
export type EducationResourceStatus = 'draft' | 'published';

export interface EducationResource {
  _id: string;
  title: string;
  description: string;
  category: string;
  ageMin: number;
  ageMax: number;
  contentType: EducationResourceContentType;
  fileUrl?: string;
  externalUrl?: string;
  /** Toujours résolu par le backend en fileUrl || externalUrl : c'est ce champ qu'affiche l'UI. */
  contentUrl: string | null;
  themes: string[];
  estimatedMinutes: number;
  difficulty: 'debutant' | 'intermediaire' | 'avance';
  status: EducationResourceStatus;
  publishedAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload envoyé par le formulaire admin (hors fichier, géré séparément via FormData). */
export interface EducationResourceFormValue {
  title: string;
  description: string;
  category: string;
  ageMin: number;
  ageMax: number;
  contentType: EducationResourceContentType;
  externalUrl?: string;
  themes?: string;
  estimatedMinutes?: number;
  difficulty?: 'debutant' | 'intermediaire' | 'avance';
}

export interface LearningStep {
  id: string;
  title: string;
}

export interface LearningPath {
  id: string;
  title: string;
  theme: string;
  steps: LearningStep[];
  completedStepIds: string[];
  progressPercent: number;
  badges: string[];
  nextStep: LearningStep | null;
}

export interface ParentToolboxItem {
  _id: string;
  itemType: 'contract' | 'schedule';
  title: string;
  content: string;
  activities?: string[];
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface NewsletterPreview {
  newsletterId: string;
  subject: string;
  profileInsights: string[];
  scoreInsights: string[];
  recommendations: string[];
  suggestedThemes: string[];
}
