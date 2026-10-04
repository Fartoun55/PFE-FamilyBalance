export type SurveyQuestionType = 'single-choice' | 'likert' | 'text';

export interface SurveyOption {
  label: string;
  value: string;
}

export interface SurveyDomainSummary {
  value: string;
  label: string;
  questionCount: number;
}

export interface SurveyQuestion {
  code: string;
  domain: string;
  domainLabel: string;
  ageSegments: string[];
  order: number;
  type: SurveyQuestionType;
  prompt: string;
  helpText?: string;
  options?: SurveyOption[];
  defaultNextCode?: string;
  isEntryPoint?: boolean;
}

export interface SurveyAnswer {
  questionCode: string;
  questionPrompt?: string;
  domain: string;
  type: SurveyQuestionType;
  answer: string | number;
  draft: boolean;
  answeredAt: string;
  updatedAt: string;
}

export interface SurveySession {
  _id: string;
  user: string;
  domain: string;
  domainLabel: string;
  age: number;
  ageSegment: string;
  status: 'in-progress' | 'completed';
  currentQuestionCode?: string | null;
  answers: SurveyAnswer[];
  startedAt: string;
  lastSavedAt: string;
  completedAt?: string;
}

export interface SurveyCatalogResponse {
  status: 'success' | 'fail' | 'error';
  age: number;
  ageSegment: string;
  domains: SurveyDomainSummary[];
}

export interface SurveyStateResponse {
  status: 'success' | 'fail' | 'error';
  message: string;
  ageSegment: string;
  catalog: {
    ageSegment: string;
    domains: SurveyDomainSummary[];
  };
  session: SurveySession;
  currentQuestion: SurveyQuestion | null;
  completed: boolean;
  progress: {
    answered: number;
    total: number;
    percent: number;
  };
  draftSaved?: boolean;
}

export interface SurveyStartPayload {
  age?: number;
  domain?: string;
  childId?: string;
}

export interface SurveyAnswerPayload {
  answer: string | number;
  advance?: boolean;
}