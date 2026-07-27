export enum RecommendationType {
  ContinueConversation = 'ContinueConversation',
  AskNextQuestion = 'AskNextQuestion',
  ReadyForQuotation = 'ReadyForQuotation',
  HumanHandoff = 'HumanHandoff',
  RejectConversation = 'RejectConversation',
  Complete = 'Complete',
}

export enum RecommendationReason {
  MissingRequiredInformation = 'MissingRequiredInformation',
  HighConfidenceReady = 'HighConfidenceReady',
  HumanReviewRequired = 'HumanReviewRequired',
  ConflictingFacts = 'ConflictingFacts',
  LowConfidenceExtraction = 'LowConfidenceExtraction',
  CommercialProject = 'CommercialProject',
  CustomKitchenDetected = 'CustomKitchenDetected',
  BudgetUnavailable = 'BudgetUnavailable',
  TimelineUnavailable = 'TimelineUnavailable',
  ConversationCancelled = 'ConversationCancelled',
  TerminalBranchReached = 'TerminalBranchReached',
  ForkingBranchDetected = 'ForkingBranchDetected',
  DefaultFallback = 'DefaultFallback',
}

export enum RecommendationSeverity {
  Immediate = 'Immediate',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export interface RecommendationRuleMetadata {
  readonly name: string;
  readonly version: string;
}

export interface RecommendationExplanation {
  readonly code: RecommendationReason;
  readonly metadata?: Record<string, unknown>;
  readonly message?: string;
}

export interface RecommendationCandidate {
  readonly rule: RecommendationRuleMetadata;
  readonly recommendation: RecommendationType;
  readonly severity: RecommendationSeverity;
  readonly explanations: readonly RecommendationExplanation[];
}

export interface RecommendationDecision {
  readonly recommendation: RecommendationType;
  readonly winningRule: RecommendationRuleMetadata;
  readonly severity: RecommendationSeverity;
  readonly candidates: readonly RecommendationCandidate[];
  readonly explanations: readonly RecommendationExplanation[];
}

export interface RecommendationEngineMetadata {
  readonly engineVersion: string;
  readonly ruleSetVersion: string;
  readonly evaluationVersion: string;
}
