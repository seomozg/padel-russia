// Общие типы подсистемы поиска новых клубов (см. court-discovery.ts).
export type CourtSource = 'padelmesh' | 'myachmyach' | 'federation';

export interface CourtCandidate {
  source: CourtSource;
  sourceUrl: string;
  name: string;
  city: string;
  address: string | null;
  coordinates: { lat: number; lng: number } | null;
  type: 'indoor' | 'outdoor' | 'mixed';
  phone: string | null;
  workingHours: string | null; // канон: «понедельник: 08:00–00:00, вторник: …»
  description: string | null;
  image: string | null; // URL картинки для скачивания
  amenities: string[];
  courtsCount: number | null;
}

export interface ParseWarning {
  source: CourtSource;
  url: string;
  reason: string;
}
