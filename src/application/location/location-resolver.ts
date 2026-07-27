import {
  ServiceAreaStatuses,
  type ResolvedFacts,
} from '../../domain/conversation';
import type { LocationLookup } from '../ports/location-lookup';

export class LocationResolver {
  constructor(private readonly lookupService: LocationLookup) {}

  private normalizeLocation(locationRaw: string): string | null {
    if (!locationRaw || locationRaw.trim() === '') return null;
    const cleaned = locationRaw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '');
    if (cleaned === '') return null;
    return cleaned;
  }

  public async resolve(locationRaw: string): Promise<ResolvedFacts> {
    const normalized = this.normalizeLocation(locationRaw);
    if (!normalized) {
      return { service_area_status: ServiceAreaStatuses.Unresolved };
    }

    return this.lookupService.lookup(normalized);
  }
}
