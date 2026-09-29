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

/** Формируется ли координата из адреса корта: «улица, город» (исторически с «Россия»). */
export function buildGeocodeQuery(address: string, city: string): string {
  return [address, city, 'Россия']
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
}

// Сегменты адреса, которые ломают геокодер («стр.5», «этаж 6», «ТЦ РИО»…)
const JUNK_SEGMENT = /(стр\.?\s*\d|этаж\s*\d|помещение|^тц\b|отель|^бц\b|лит\.?\s*\d)/i;
// Слова-«шум»: топонимические сокращения и префиксы, которые мешают
// сравнивать адрес корта с display_name геокодера.
// «ул. Фучика» и «улица Фучика» → «фучика»; «г. Калуга» → «калуга».
const NOISE_WORDS = new Set([
  'улица', 'ул',
  'набережная', 'наб',
  'шоссе', 'ш',
  'проспект', 'просп', 'пр',
  'переулок', 'пер',
  'бульвар', 'б-р', 'бр',
  'г', 'город',
  'д', 'деревня',
  'пгт', 'пос', 'посёлок', 'поселок', 'село', 'с',
  'россия', 'дом', 'корпус', 'корп', 'стр', 'этаж', 'помещение',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Нормализация топонима: без регистра, ё, сокращений и префиксов. */
function normalizePlace(s: string): string {
  return normalize(s)
    .split(' ')
    .map((token) => token.replace(/\.$/, ''))
    .filter((token) => token && !NOISE_WORDS.has(token))
    .join(' ');
}

/** Сегменты адреса без мусора и дублей («Москва, Москва» → «Москва»). */
export function cleanAddressSegments(address: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawPart of (address || '').split(',')) {
    const part = rawPart.trim();
    if (!part) continue;
    if (/^россия$/i.test(part)) continue;
    if (JUNK_SEGMENT.test(part)) continue;

    const key = normalize(part);
    if (seen.has(key)) continue;
    seen.add(key);

    result.push(part);
  }

  return result;
}

/**
 * Цепочка запросов к геокодеру — от точного к грубому.
 * Nominatim возвращает пусто на «грязных» запросах («…, стр.5, Москва, Россия»),
 * поэтому чистим мусорные сегменты, убираем дубли города и, в конце концов,
 * спрашиваем только город (центр города лучше центра Москвы).
 */
export function buildGeocodeQueries(address: string, city: string): string[] {
  const queries: string[] = [];
  const push = (value: string) => {
    const trimmed = value.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
    if (trimmed && !queries.includes(trimmed)) queries.push(trimmed);
  };

  const cityPart = (city || '').trim();

  // 1. Оригинал + город + страна (так нашлось 20 из 46)
  push(buildGeocodeQuery(address, cityPart));
  // 2. Без страны
  push([address, cityPart].filter(Boolean).join(', '));
  // 3. Очищенные сегменты адреса + город
  const cleaned = cleanAddressSegments(address);
  if (cleaned.length > 0) push([...cleaned, cityPart].filter(Boolean).join(', '));
  // 4. Только населённый пункт из адреса + город
  const locality = cleaned.find((segment) => segment.length >= 4 && /\D/.test(segment));
  if (locality) push([locality, cityPart].filter(Boolean).join(', '));
  // 5. Только город
  if (cityPart) push(cityPart);

  return queries;
}

export interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
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
  const target = normalizePlace(city || '');
  if (!target) return true;

  const candidates = [
    displayName,
    address?.city,
    address?.town,
    address?.village,
    address?.county,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizePlace);

  // «Екатеринбург» входит в «ул. Академика Парина, Екатеринбург, Россия»
  // и наоборот; короткие совпадения (<3 символов) не считаем.
  return candidates.some(
    (candidate) =>
      candidate.length >= 3 &&
      (candidate.includes(target) || target.includes(candidate))
  );
}

/**
 * Запасная валидация: результат найден, если он содержит хотя бы один
 * осмысленный сегмент ИСХОДНОГО адреса корта («ул. Фучика» → «ТРЦ Рио,
 * улица Фучика, …»). Нужна для кортов, чей city в БД неверен
 * (например, «Москва» для Подмосковья).
 */
export function addressLocalityMatches(displayName: string, address: string): boolean {
  const display = normalizePlace(displayName || '');
  if (!display) return false;

  return cleanAddressSegments(address).some((segment) => {
    const candidate = normalizePlace(segment);
    if (candidate.length < 4 || !/\D/.test(candidate)) return false;
    return display.includes(candidate);
  });
}