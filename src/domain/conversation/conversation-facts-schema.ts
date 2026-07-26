/**
 * CONVERSATION FACTS SCHEMA — üç katmanlı model + ayrı Conversation State
 *
 *   ConversationState  → kendi state'i (stage, followup_count, ...) — Facts değil
 *   Extracted Facts     → konuşmadan gelen HAM bilgi (AI'ın dokunduğu tek katman)
 *   Resolved Facts       → sistemin doğruladığı / normalize ettiği bilgi
 *   Business Decision    → Eligibility + Readiness + Confidence + Recommendation
 *
 * Kural: "Yarın AI değişir, Facts değişmez, Conversation state de değişmez."
 * Üç yapı birbirinden bağımsız evrilebilmeli.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// 0. CONVERSATION STATE — Facts DEĞİL. Conversation Engine'in kendi state'i.
//    followup_count burada duruyor çünkü konuşmadan çıkarılan bir bilgi
//    değil, motorun "kaç kez ek soru sordum" sayacı.
// ---------------------------------------------------------------------------

export const ConversationStatusEnum = z.enum([
  "open",
  "qualified",
  "consultation",
  "estimate",
  "won",
  "lost",
]);

export const ConversationStateSchema = z.object({
  conversation_id: z.string(),
  stage: z.string(), // bkz. STAGES aşağıda
  followup_count: z.number().default(0),
  last_question: z.string().optional(),
  last_message_id: z.string().optional(),
  status: ConversationStatusEnum.default("open"),
});

export type ConversationState = z.infer<typeof ConversationStateSchema>;

// ---------------------------------------------------------------------------
// 1. FIELD DEFINITIONS
// ---------------------------------------------------------------------------

export const ProjectTypeEnum = z.enum([
  "full_kitchen_remodel",
  "cabinets_only",
  "countertops_only",
  "bathroom_remodel", // "Kitchen & Bed" olduğu için bathroom da olası
  "other",
]);

export const BudgetRangeEnum = z.enum([
  "under_15k",
  "15k_30k",
  "30k_60k",
  "60k_plus",
  "not_sure",
]);

export const TimelineEnum = z.enum([
  "asap",
  "1_3_months",
  "3_6_months",
  "unsure",
]);

export const LanguageEnum = z.enum(["en", "es", "tr", "other"]);

export const AttachmentTypeEnum = z.enum(["image", "pdf", "video"]);

export const AttachmentSchema = z.object({
  id: z.string(),
  type: AttachmentTypeEnum,
  url: z.string().url(),
  caption: z.string().optional(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

// ---------------------------------------------------------------------------
// 2A. EXTRACTED FACTS — konuşmadan gelen ham bilgi. AI sadece burayı doldurur.
//     location_raw BİLEREK serbest metin: normalize etme işi Resolved Facts
//     katmanının sorumluluğu, extraction'ın değil.
// ---------------------------------------------------------------------------

export const ExtractedFactsSchema = z.object({
  schema_version: z.number().default(1),

  project_type: ProjectTypeEnum.optional(),

  location_raw: z.string().min(2).optional(), // ham metin, insana da gösterilir

  budget_range: BudgetRangeEnum.optional(), // buton mesajıyla toplanır, serbest metin değil

  timeline: TimelineEnum.optional(),

  // V1'de sadece "image" kullanılır; pdf/video tip olarak tanımlı ama
  // işlenmiyor — attachments'ı V1'de photo_urls gibi genişletmeden
  // kullanmak, sonradan migrate etmekten daha ucuz olduğu için şimdiden.
  attachments: z.array(AttachmentSchema).default([]),

  is_homeowner: z.boolean().optional(),

  // Adam İngilizce yazıp sonra "Spanish'e geçebilir miyiz?" diyebilir —
  // bunlar farklı sinyaller, tek "language" alanı ikisini karıştırırdı.
  detected_language: LanguageEnum.optional(), // mesajdan otomatik algılanan
  preferred_language: LanguageEnum.optional(), // müşteri açıkça talep ettiyse

  // "AI'ın satış temsilcisi için oluşturduğu özet" — raw_notes belirsizdi.
  conversation_summary: z.string().optional(),
});

export type ExtractedFacts = z.infer<typeof ExtractedFactsSchema>;

// ---------------------------------------------------------------------------
// 2B. RESOLVED FACTS — sistemin doğruladığı / normalize ettiği bilgi.
//     Location Resolver burada çalışır. Üç durumlu (tri-state):
//     location_raw hiç çözülemezse "unresolved" — sessizce "unsupported"
//     sayılmaz, çünkü bu iyi bir lead'i yanlışlıkla eleyebilir.
// ---------------------------------------------------------------------------

export const ServiceAreaStatusEnum = z.enum([
  "supported",
  "unsupported",
  "unresolved", // town tanınamadı — bir soru daha sormak gerekebilir
]);

export const ResolvedFactsSchema = z.object({
  town: z.string().optional(),
  county: z.string().optional(),
  service_area_status: ServiceAreaStatusEnum,
});

export type ResolvedFacts = z.infer<typeof ResolvedFactsSchema>;

// Extracted + Resolved birleşimi — Business Decision katmanının girdisi.
export const ConversationFactsSchema = ExtractedFactsSchema.merge(
  ResolvedFactsSchema.partial(),
);
export type ConversationFacts = z.infer<typeof ConversationFactsSchema>;

// ---------------------------------------------------------------------------
// 3. REQUIRED vs OPTIONAL — akışı durduran tek şey bu liste.
// ---------------------------------------------------------------------------

export const REQUIRED_FIELDS: (keyof ExtractedFacts)[] = [
  "project_type",
  "location_raw",
];

export const CONFIDENCE_FIELDS: (keyof ExtractedFacts)[] = [
  "project_type",
  "location_raw",
  "budget_range",
  "timeline",
  "attachments",
  "is_homeowner",
];

// ---------------------------------------------------------------------------
// 4. STATE MACHINE — sıra, hangi soru sorulacağını belirler. `stage` artık
//    ConversationState içinde tutulur, Facts'in bir parçası değil.
//    ÖNEMLİ: extraction her turn'de TÜM şemayı tarar, stage sadece "sırada
//    hangi soru" der — "hangi bilgi kabul edilir" demez.
// ---------------------------------------------------------------------------

export const STAGES = [
  "greeting",
  "project_type",
  "location",
  "budget",
  "timeline",
  "photos",
  "summary",
  "done",
] as const;

export type Stage = (typeof STAGES)[number];

const STAGE_FIELD_MAP: Partial<Record<Stage, keyof ExtractedFacts>> = {
  project_type: "project_type",
  location: "location_raw",
  budget: "budget_range",
  timeline: "timeline",
};

/** Şu anki facts'e bakıp sıradaki stage'i belirler. */
export function nextStage(facts: ExtractedFacts): Stage {
  for (const stage of STAGES) {
    const field = STAGE_FIELD_MAP[stage];
    if (field && !facts[field]) return stage;
  }
  if (facts.attachments.length === 0) return "photos";
  return "summary";
}

// ---------------------------------------------------------------------------
// 5. LOCATION RESOLVER — kendi domain'i, kendi içinde üç küçük katman:
//    Normalize → Validate → Resolve. Bu ayrım ileride ZIP, GPS, county
//    desteği eklendiğinde dış arayüzü (resolveServiceArea) değiştirmeden
//    genişlemeyi sağlar.
// ---------------------------------------------------------------------------

/**
 * NORMALIZE — ham metni bilinen bir town adına çevirir (typo düzeltme,
 * "near X" gibi ifadeleri ayıklama). Fuzzy match ya da LLM-assisted olabilir.
 * Çözemezse null döner (throw etmez — bu beklenen bir durum).
 */
function normalizeLocation(locationRaw: string): string | null {
  throw new Error("normalizeLocation henüz implemente edilmedi");
}

/**
 * VALIDATE + RESOLVE — normalize edilmiş town'ı Supabase'deki lookup
 * tablosuna karşı kontrol eder (town → county → supported).
 */
function lookupTown(
  normalizedTown: string,
): Omit<ResolvedFacts, "service_area_status"> & {
  service_area_status: "supported" | "unsupported";
} {
  throw new Error("lookupTown henüz implemente edilmedi");
}

/**
 * Dış arayüz — Resolver'ın iç adımlarını (normalize/lookup) bilmeye gerek
 * bırakmaz. Sonuç HER ZAMAN tri-state: town tanınamazsa "unresolved" döner,
 * "unsupported" DEĞİL.
 */
export function resolveServiceArea(locationRaw: string): ResolvedFacts {
  const normalized = normalizeLocation(locationRaw);
  if (!normalized) {
    return { service_area_status: "unresolved" };
  }
  return lookupTown(normalized);
}

// ---------------------------------------------------------------------------
// 6. CONFIDENCE — pure code, AI yok. "Elimizde veri var mı?" sorusunun cevabı
//    (Completeness). "Bu veriye güveniyor muyum?" (asdfasdf gibi anlamsız
//    girdileri ayıklamak) V2 roadmap'ine bırakıldı — V1'de gerekli değil.
// ---------------------------------------------------------------------------

export function calculateConfidence(facts: ExtractedFacts): number {
  const filled = CONFIDENCE_FIELDS.filter((field) => {
    const value = facts[field];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== "";
  });
  return Math.round((filled.length / CONFIDENCE_FIELDS.length) * 100);
}

// ---------------------------------------------------------------------------
// 7. ELIGIBILITY + READINESS — ayrı kavramlar. Eligibility "hizmet
//    veriyor muyuz" sorusuna cevap verir; unsupported ise Readiness hiç
//    HESAPLANMAZ (0 değil, null/N/A) — "düşük puan" ile "bizim müşterimiz
//    değil" iş açısından aynı şey değil.
// ---------------------------------------------------------------------------

export function getEligibility(facts: ConversationFacts): ServiceAreaStatus {
  return facts.service_area_status ?? "unresolved";
}

type ServiceAreaStatus = z.infer<typeof ServiceAreaStatusEnum>;

export const READINESS_WEIGHTS: Record<string, number> = {
  full_kitchen_remodel_bonus: 20, // project_type === "full_kitchen_remodel"
  budget_mentioned: 15, // budget_range !== "not_sure" ve dolu
  has_photos: 10,
  timeline_defined: 15, // timeline !== "unsure" ve dolu
  is_homeowner: 20,
};
// Not: "service area" ağırlığı kalktı — artık Eligibility bir ön koşul,
// Readiness'e giren bir puan bileşeni değil.

/** Eligibility "unsupported" ise null döner — 0 değil, "N/A" anlamında. */
export function calculateReadiness(facts: ConversationFacts): number | null {
  if (getEligibility(facts) === "unsupported") return null;

  let score = 0;

  if (facts.project_type === "full_kitchen_remodel") {
    score += READINESS_WEIGHTS.full_kitchen_remodel_bonus;
  }
  if (facts.budget_range && facts.budget_range !== "not_sure") {
    score += READINESS_WEIGHTS.budget_mentioned;
  }
  if (facts.attachments.length > 0) {
    score += READINESS_WEIGHTS.has_photos;
  }
  if (facts.timeline && facts.timeline !== "unsure") {
    score += READINESS_WEIGHTS.timeline_defined;
  }
  if (facts.is_homeowner) {
    score += READINESS_WEIGHTS.is_homeowner;
  }

  return score; // max 80 (20+15+10+15+20) — service area artık ayrı bir eligibility kontrolü
}

// ---------------------------------------------------------------------------
// 8. RECOMMENDATION — Eligibility + Readiness + Confidence üçüne bakar.
//    out_of_service_area, low_priority'den AYRI: biri "bizim müşterimiz
//    değil" der, diğeri "düşük kaliteli lead" der — iş kararı olarak
//    tamamen farklı anlamlara gelirler (örn. Brooklyn'e V3'te açılırsanız
//    bu kayıtları geri çağırmak isteyebilirsiniz, low_priority'yi değil).
// ---------------------------------------------------------------------------

export type Recommendation =
  | "ask_followup" // confidence düşük ya da location unresolved, en fazla 1 ek soru
  | "route_to_human" // eligible + readiness + confidence yeterli
  | "low_priority" // eligible ama readiness düşük
  | "out_of_service_area"; // hizmet bölgesi dışı — kalite ile ilgisi yok

export function getRecommendation(facts: ConversationFacts): {
  eligibility: ServiceAreaStatus;
  readiness: number | null;
  confidence: number;
  recommendation: Recommendation;
} {
  const eligibility = getEligibility(facts);
  const readiness = calculateReadiness(facts);
  const confidence = calculateConfidence(facts);

  const requiredFilled = REQUIRED_FIELDS.every((f) => Boolean(facts[f]));

  let recommendation: Recommendation;
  if (!requiredFilled) {
    recommendation = "ask_followup";
  } else if (eligibility === "unresolved") {
    // Town tanınamadı — "unsupported" saymak yerine bir kez daha sor.
    // (Kaç kez sorulduğu ConversationState.followup_count'ta tutulur,
    // bu fonksiyon onu bilmez — çağıran taraf kararı verir.)
    recommendation = "ask_followup";
  } else if (eligibility === "unsupported") {
    recommendation = "out_of_service_area";
  } else if (confidence < 50) {
    recommendation = "ask_followup";
  } else if (readiness !== null && readiness >= 40) {
    // max 80 üzerinden ~%50 — orijinal eşiğin oranı korunuyor, gerçek
    // won/lost verisiyle kalibre edilecek (V2 roadmap).
    recommendation = "route_to_human";
  } else {
    recommendation = "low_priority";
  }

  return { eligibility, readiness, confidence, recommendation };
}
