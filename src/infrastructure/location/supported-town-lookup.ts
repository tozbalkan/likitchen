import {
  ServiceAreaStatuses,
  type ResolvedFacts,
} from '../../domain/conversation';
import type { LocationLookup } from '../../application/ports';

// Mock dictionary for V1
const SUPPORTED_TOWNS: Record<string, string> = {
  austin: 'Travis',
  'round rock': 'Williamson',
  'cedar park': 'Williamson',
  georgetown: 'Williamson',
  pflugerville: 'Travis',
};

export class SupportedTownLookup implements LocationLookup {
  public async lookup(town: string): Promise<ResolvedFacts> {
    const county = SUPPORTED_TOWNS[town];
    if (county) {
      return {
        town,
        county,
        service_area_status: ServiceAreaStatuses.Supported,
      };
    }

    return {
      service_area_status: ServiceAreaStatuses.Unsupported,
    };
  }
}
