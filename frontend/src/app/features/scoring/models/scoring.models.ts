export interface ScoreBreakdown {
  comportemental: number;
  emotionnel: number;
  social: number;
  parental: number;
}

export interface ScoreWeights {
  comportemental: number;
  emotionnel: number;
  social: number;
  parental: number;
}

export interface ScoreRecord {
  _id: string;
  user: string;
  sourceSession: string;
  age: number;
  ageSegment: string;
  subScores: ScoreBreakdown;
  weights: ScoreWeights;
  globalScore: number;
  riskLevel: 'green' | 'orange' | 'red';
  riskCategory: 'equilibre-sain' | 'vigilance-legere' | 'risque-modere' | 'risque-eleve';
  recommendations: string[];
  answerCount: number;
  trigger: 'auto' | 'manual';
  calculatedAt: string;
}

export interface RiskAlert {
  _id: string;
  user: string;
  scoreRecord: string;
  level: 'red';
  status: 'open' | 'resolved';
  message: string;
  createdAt: string;
}

export interface ScorePeriodStat {
  months: 3 | 6 | 12;
  count: number;
  averageGlobalScore: number | null;
  latestGlobalScore: number | null;
  riskDistribution: {
    green: number;
    orange: number;
    red: number;
  };
}

export interface LatestScoringResponse {
  status: 'success' | 'fail' | 'error';
  latestRecord: ScoreRecord | null;
  openAlerts: RiskAlert[];
  latestCompletedSessionId: string | null;
}

export interface HistoryScoringResponse {
  status: 'success' | 'fail' | 'error';
  records: ScoreRecord[];
  periodStats: ScorePeriodStat[];
  openAlerts: RiskAlert[];
}

export interface CalculateScoringResponse {
  status: 'success' | 'fail' | 'error';
  message: string;
  score: ScoreRecord;
  alert?: RiskAlert | null;
}