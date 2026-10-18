// Дедупликация: сопоставление кандидата с уже существующими клубами
// (sourceUrl → название+город → координаты ближе 200 м).
import { CourtCandidate } from './types';

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// ──────────────────── дедупликация и сборка записи ────────────────────

export interface ExistingCourt {
  slug: string;
  name: string;
  city: string;
  sourceUrl: string | null;
  coordinates: unknown;
}

export interface DedupeResult {
  status: 'new' | 'duplicate';
  reason?: 'sourceUrl' | 'nameCity' | 'nearCoords';
  matchSlug?: string;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!()"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Общие слова, которые не могут быть признаком совпадения клубов
const GENERIC_NAME_TOKENS = new Set([
  'академия',
  'спортивный',
  'комплекс',
  'олимпийский',
  'молодежный',
  'государственный',
  'центральный',
  'международный',
]);

/** Значимые токены названия (длина ≥ 8, без «клубных» общих слов). */
function significantTokens(value: string): string[] {
  return normalizeName(value)
    .split(' ')
    .filter((token) => token.length >= 8 && !GENERIC_NAME_TOKENS.has(token));
}

/**
 * Дедуп против каталога: 1) sourceUrl, 2) нормализованное название+город
 * (в т.ч. вхождение и совпадение значимого токена: «Территория Сквоша» vs
 * «Территория. Сквош & Падел»), 3) координаты ближе 200 м.
 */
export function dedupeCandidate(
  existing: ExistingCourt[],
  candidate: CourtCandidate,
  thresholdMeters = 200
): DedupeResult {
  for (const court of existing) {
    if (court.sourceUrl && court.sourceUrl === candidate.sourceUrl) {
      return { status: 'duplicate', reason: 'sourceUrl', matchSlug: court.slug };
    }
  }

  const candName = normalizeName(candidate.name);
  const candCity = normalizeName(candidate.city);
  const candTokens = significantTokens(candidate.name);
  for (const court of existing) {
    if (normalizeName(court.city) !== candCity) continue;
    const dbName = normalizeName(court.name);
    const same =
      dbName === candName ||
      (candName.length >= 8 && dbName.includes(candName)) ||
      (dbName.length >= 8 && candName.includes(dbName)) ||
      candTokens.some((token) => dbName.includes(token)) ||
      significantTokens(court.name).some((token) => candName.includes(token));
    if (same) return { status: 'duplicate', reason: 'nameCity', matchSlug: court.slug };
  }

  if (candidate.coordinates) {
    for (const court of existing) {
      const coords = normalizeExistingCoordinates(court.coordinates);
      if (!coords) continue;
      if (haversineMeters(coords, candidate.coordinates) <= thresholdMeters) {
        return { status: 'duplicate', reason: 'nearCoords', matchSlug: court.slug };
      }
    }
  }

  return { status: 'new' };
}

/** Координаты из БД (Json, возможна двойная кодировка) → {lat,lng}. */
export function normalizeExistingCoordinates(raw: unknown): { lat: number; lng: number } | null {
  let value: any = raw;
  for (let i = 0; i < 3 && typeof value === 'string'; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const lat = Number((value as { lat?: unknown }).lat);
  const lng = Number((value as { lng?: unknown }).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
