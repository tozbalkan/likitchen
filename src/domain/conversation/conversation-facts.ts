import type { ServiceAreaStatus } from './location';

export type ConversationStatus =
  'open' | 'qualified' | 'consultation' | 'estimate' | 'won' | 'lost';

export interface ConversationState {
  readonly conversation_id: string;
  readonly stage: string;
  readonly followup_count: number;
  readonly last_question?: string | undefined;
  readonly last_message_id?: string | undefined;
  readonly status: ConversationStatus;
}

export type ProjectType =
  | 'full_kitchen_remodel'
  | 'cabinets_only'
  | 'countertops_only'
  | 'bathroom_remodel'
  | 'other';

export type BudgetRange =
  'under_15k' | '15k_30k' | '30k_60k' | '60k_plus' | 'not_sure';

export type Timeline = 'asap' | '1_3_months' | '3_6_months' | 'unsure';

export type Language = 'en' | 'es' | 'tr' | 'other';

export type AttachmentType = 'image' | 'pdf' | 'video';

export interface Attachment {
  readonly id: string;
  readonly type: AttachmentType;
  readonly url: string;
  readonly caption?: string | undefined;
}

export interface ExtractedFacts {
  readonly schema_version: number;
  readonly project_type?: ProjectType | undefined;
  readonly location_raw?: string | undefined;
  readonly budget_range?: BudgetRange | undefined;
  readonly timeline?: Timeline | undefined;
  readonly attachments: ReadonlyArray<Attachment>;
  readonly is_homeowner?: boolean | undefined;
  readonly detected_language?: Language | undefined;
  readonly preferred_language?: Language | undefined;
  readonly conversation_summary?: string | undefined;
}

export interface ResolvedFacts {
  readonly town?: string | undefined;
  readonly county?: string | undefined;
  readonly service_area_status: ServiceAreaStatus;
}

export type ConversationFacts = ExtractedFacts & Partial<ResolvedFacts>;
