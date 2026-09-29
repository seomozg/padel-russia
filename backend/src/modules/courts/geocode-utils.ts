// Чистые функции геокодинга кортов — используются scripts/geocode-courts.ts
// и покрыты unit-тестом (geocode-utils.test.ts).

// Фиктивные координаты центра Москвы — fallback скрапера для кортов,
// которые не прошли геокодинг. Служат маркером «координаты не определены».
export const DEFAULT_COORDINATES = { lat: 55.751244, lng: 37.618423 };

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Приводит координаты к {lat, lng}.
 * В БД поле Json: Prisma может вернуть объект либо JSON-строку
 * (в истории были случаи двойной кодировки) — раскодируем оба варианта.
 */
export function normalizeCoordinates(raw: unknown): Coordinates | null {
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

/** Нуждаются ли координаты в геокодинге: фиктивные, битые или отсутствующие. */
export function isDefaultCoordinates(raw: unknown): boolean {
  const coords = normalizeCoordinates(raw);
  if (!coords) return true;
  return coords.lat === DEFAULT_COORDINATES.lat && coords.lng === DEFAULT_COORDINATES.lng;
}

/** Формируется ли координата из адреса корта: «улица, город, Россия». */
export function buildGeocodeQuery(address: string, city: string): string {
  return [address, city, 'Россия']
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

/**
 * Проверка, что найденный адрес действительно относится к городу корта
 * (иначе геокодер мог вернуть одноимённый населённый пункт в другой области).
 */
export function cityMatches(
  displayName: string,
  city: string,
  address?: NominatimAddress
): boolean {
  const target = normalize(city || '');
  if (!target) return true;

  const candidates = [
    displayName,
    address?.city,
    address?.town,
    address?.village,
    address?.county,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalize);

  // «Екатеринбург» входит в «ул. Академика Парина, Екатеринбург, Россия»
  // и наоборот; короткие совпадения (<3 символов) не считаем.
  return candidates.some(
    (candidate) =>
      candidate.length >= 3 &&
      (candidate.includes(target) || target.includes(candidate))
  );
}