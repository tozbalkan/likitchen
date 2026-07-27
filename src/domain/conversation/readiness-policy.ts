export const READINESS_WEIGHTS = {
  full_kitchen_remodel_bonus: 20, // project_type === "full_kitchen_remodel"
  budget_mentioned: 15, // budget_range !== "not_sure" && value exists
  has_photos: 10,
  timeline_defined: 15, // timeline !== "unsure" && value exists
  is_homeowner: 20,
} as const;

export const READINESS_THRESHOLD_ROUTE_TO_HUMAN = 40 as const;
