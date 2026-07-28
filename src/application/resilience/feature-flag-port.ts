export type FeatureValue = boolean | number | string | Record<string, unknown>;

export interface FeatureFlagPort {
  getFlag<T extends FeatureValue>(key: string, defaultValue: T): Promise<T>;
}
