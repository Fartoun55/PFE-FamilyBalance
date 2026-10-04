export interface FamilyDashboardChildScorePoint {
  calculatedAt: string;
  globalScore: number;
  subScores: {
    comportemental: number;
    emotionnel: number;
    social: number;
    parental: number;
  };
  riskLevel: 'green' | 'orange' | 'red';
}

export interface FamilyDashboardLatestRecord {
  calculatedAt: string;
  globalScore: number;
  riskLevel: 'green' | 'orange' | 'red';
  riskCategory?: 'equilibre-sain' | 'vigilance-legere' | 'risque-modere' | 'risque-eleve';
  subScores: {
    comportemental: number;
    emotionnel: number;
    social: number;
    parental: number;
  };
  recommendations: string[];
}

export interface FamilyDashboardChild {
  child: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    email: string;
    phone?: string;
    birthDate?: string | null;
    consentGiven: boolean;
  };
  latestRecord: FamilyDashboardLatestRecord | null;
  history: FamilyDashboardChildScorePoint[];
  reminders: {
    frequencyMonths: number;
    nextReevaluationDate: string;
    due: boolean;
    daysRemaining: number;
  };
  openAlerts: Array<{
    _id: string;
    message: string;
    createdAt: string;
  }>;
}

export interface FamilyDashboardOverviewResponse {
  status: 'success' | 'fail' | 'error';
  parent: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  totalChildren: number;
  dueReminders: number;
  children: FamilyDashboardChild[];
}
