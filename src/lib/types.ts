export type Phase =
  | 'empty'
  | 'thinking'
  | 'confirmation'
  | 'running'
  | 'results';

export type ConfirmDecision = 'yes' | 'no' | null;

export type FetchedAppInfo = {
  appId: string;
  name: string;
  developer: string;
  category: string;
  rating: number;
  ratingCount: number;
  iconUrl: string;
  storeUrl: string;
};

export interface Message {
  kind: 'user' | 'ai-thinking' | 'ai-text' | 'confirm' | 'progress' | 'done';
  text?: string;
  appInfo?: FetchedAppInfo;
}

export interface AppData {
  name: string;
  shortName: string;
  developer: string;
  category: string;
  country: string;
  rating: number;
  iconLetter: string;
  iconGradient: string;
  iconColor: string;
  exampleUrl: string;
}

export interface AuditStep {
  id: string;
  label: string;
}

export interface Dimension {
  id: string;
  name: string;
  score: number;
  icon: string;
  issue: string;
}

export interface Recommendation {
  rank: number;
  impact: string;
  impactClass: string;
  dimension: string;
  title: string;
  why: string;
  before: string;
  after: string;
  evidence: string;
}

export interface Competitor {
  id: string;
  name: string;
  you?: boolean;
  iconLetter: string;
  iconGradient: string;
  iconColor: string;
  score: number;
  rating: number;
  titleKw: number;
  screenshots: string;
  preview: boolean;
  events: boolean;
}

export interface CompRow {
  key: string;
  label: string;
  fmt: (c: Competitor) => string | boolean;
  deltaFrom: number | null;
}

export interface TabDef {
  id: string;
  label: string;
  count: number | null;
}

export type AuditCompetitor = {
  id: string;
  name: string;
  you?: boolean;
  iconUrl: string;
  developer: string;
  rating: number;
  ratingCount: number;
  screenshotCount: number;
  category: string;
  price: number;
  url: string;
};

export type AuditResult = {
  app: FetchedAppInfo & {
    version: string;
    screenshotCount: number;
    ipadScreenshotCount: number;
    screenshotUrls: string[];
    hasPreviewVideo: boolean | null;
    subtitle: string | null;
    promotionalText: string | null;
    whatsNew: string | null;
    price: number;
    dataCompleteness: 'full' | 'partial' | 'api-only';
  };
  overallScore: number;
  dimensions: Dimension[];
  quickWins: Recommendation[];
  highImpact: Recommendation[];
  strategic: Recommendation[];
  competitors: AuditCompetitor[];
};
