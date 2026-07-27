export type ServiceAreaStatus = 'supported' | 'unsupported' | 'unresolved';

export const ServiceAreaStatuses = {
  Supported: 'supported' as const,
  Unsupported: 'unsupported' as const,
  Unresolved: 'unresolved' as const,
};
