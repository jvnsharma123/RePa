export type PlanTier = 'FREE' | 'RESEARCHER' | 'PRO_RESEARCHER';
export type SubscriptionStatus = 'active' | 'authenticated' | 'cancelled' | 'expired' | 'halted' | 'pending';

export interface PlanLimits {
  tier: PlanTier;
  name: string;
  price: number; // in INR
  billingPeriod: string;
  maxActiveProjects: number;
  maxAiAnalysesPerMonth: number;
  maxReferencesPerProject: number;
  maxExportsPerMonth: number;
  allCitationStyles: boolean;
  allManuscriptFormats: boolean;
  advancedAiAnalysis: boolean;
  priorityProcessing: boolean;
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanTier, PlanLimits> = {
  FREE: {
    tier: 'FREE',
    name: 'Free',
    price: 0,
    billingPeriod: 'Forever',
    maxActiveProjects: 1,
    maxAiAnalysesPerMonth: 10,
    maxReferencesPerProject: 20,
    maxExportsPerMonth: 2,
    allCitationStyles: false,
    allManuscriptFormats: false,
    advancedAiAnalysis: false,
    priorityProcessing: false,
    features: [
      '1 active project',
      '10 AI analyses/month',
      '20 references',
      '2 DOCX/PDF exports/month',
      'Standard citation styles (Vancouver, APA, IEEE)',
      'Primary research fact extraction',
    ],
  },
  RESEARCHER: {
    tier: 'RESEARCHER',
    name: 'Researcher',
    price: 299,
    billingPeriod: 'month',
    maxActiveProjects: 5,
    maxAiAnalysesPerMonth: 100,
    maxReferencesPerProject: Infinity,
    maxExportsPerMonth: Infinity,
    allCitationStyles: true,
    allManuscriptFormats: true,
    advancedAiAnalysis: false,
    priorityProcessing: false,
    features: [
      '5 active projects',
      '100 AI analyses/month',
      'Unlimited references',
      'Unlimited DOCX/PDF exports',
      'All citation styles',
      'All manuscript formats',
      'BibTeX, RIS & DOI batch enrichment',
    ],
  },
  PRO_RESEARCHER: {
    tier: 'PRO_RESEARCHER',
    name: 'Pro Researcher',
    price: 699,
    billingPeriod: 'month',
    maxActiveProjects: Infinity,
    maxAiAnalysesPerMonth: 300,
    maxReferencesPerProject: Infinity,
    maxExportsPerMonth: Infinity,
    allCitationStyles: true,
    allManuscriptFormats: true,
    advancedAiAnalysis: true,
    priorityProcessing: true,
    features: [
      'Unlimited projects',
      '300 AI analyses/month',
      'Unlimited references',
      'Unlimited DOCX/PDF exports',
      'Advanced AI analysis',
      'Priority processing',
      'All citation styles & manuscript formats',
      'Institutional thesis & journal compliance checks',
    ],
  },
};

export interface SubscriptionState {
  plan: PlanTier;
  status: SubscriptionStatus;
  razorpaySubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  usage: {
    aiAnalysesThisMonth: number;
    exportsThisMonth: number;
  };
}
