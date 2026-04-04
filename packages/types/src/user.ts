export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: string;
  email: string;
  name: string;
  dob: string | null;
  onboardingCompletedAt: string | null;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export interface CognitiveProfile {
  id: string;
  userId: string;
  baselineEstablishedAt: string | null;
  domains: Record<CognitiveDomain, DomainAbility>;
}

export type CognitiveDomain =
  | 'memory'
  | 'attention'
  | 'processing_speed'
  | 'executive_function'
  | 'language'
  | 'visuospatial';

export interface DomainAbility {
  theta: number;
  uncertainty: number;
  lastUpdated: string;
}

export interface ConsentSettings {
  conversationalAI: boolean;
  cognitiveTracking: boolean;
  linguisticMonitoring: boolean;
  clinicalReports: boolean;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  dob?: string;
  healthContext?: {
    medications?: string[];
    familyHistory?: boolean;
    selfReportedConcerns?: string;
  };
  consent?: Partial<ConsentSettings>;
}
