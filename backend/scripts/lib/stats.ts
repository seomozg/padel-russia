// Статистика прогона поиска клубов и учёт дубликатов.
import { CourtCandidate, ExistingCourt } from '../../src/modules/courts/court-discovery';

export interface Stats {
  found: Record<string, number>;
  duplicates: { sourceUrl: number; nameCity: number; nearCoords: number };
  warnings: string[];
}
export function asExisting(candidate: CourtCandidate): ExistingCourt {
  return {
    slug: candidate.sourceUrl,
    name: candidate.name,
    city: candidate.city,
    sourceUrl: candidate.sourceUrl,
    coordinates: candidate.coordinates,
  };
}

export function registerDuplicate(stats: Stats, reason?: string) {
  if (reason === 'sourceUrl') stats.duplicates.sourceUrl++;
  else if (reason === 'nearCoords') stats.duplicates.nearCoords++;
  else stats.duplicates.nameCity++;
}
