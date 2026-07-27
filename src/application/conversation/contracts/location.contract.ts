import { z, type ZodType } from 'zod';
import type { ServiceAreaStatus } from '../../../domain/conversation/location';

export const ServiceAreaStatusSchema: ZodType<ServiceAreaStatus> = z.enum([
  'supported',
  'unsupported',
  'unresolved',
]);
