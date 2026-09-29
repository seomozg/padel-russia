// Поиск и парсинг новых падел-клубов из безключевых каталогов.
// Источники (проверены 29.09.2026):
//   1. PadelMesh  — /ru/ru/clubs?page=N: в листинге data-атрибуты (координаты,
//                   часы, тип, фото), на странице клуба JSON-LD (адрес, телефон,
//                   описание, удобства).
//   2. МячМяч     — padel-<город> → club-<slug>: JSON-LD (адрес, телефон),
//                   координаты берём из Nominatim.
//   3. Федерация  — federationpadel.ru/addresses: аккордеоны Tilda, координаты из Nominatim.
// Чистые функции покрыты юнит-тестами (court-discovery.test.ts).
import * as cheerio from 'cheerio';

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

const DAY_MAP: Record<string, string> = {
  Mon: 'понедельник',
  Tue: 'вторник',
  Wed: 'среда',
  Thu: 'четверг',
  Fri: 'пятница',
  Sat: 'суббота',
  Sun: 'воскресенье',
};

const SCHEMA_DAY_MAP: Record<string, string> = {
  Monday: 'понедельник',
  Tuesday: 'вторник',
  Wednesday: 'среда',
  Thursday: 'четверг',
  Friday: 'пятница',
  Saturday: 'суббота',
  Sunday: 'воскресенье',
  Mo: 'понедельник',
  Tu: 'вторник',
  We: 'среда',
  Th: 'четверг',
  Fr: 'пятница',
  Sa: 'суббота',
  Su: 'воскресенье',
};

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) return raw.replace(/\s+/g, ' ').trim() || null;
  const normalized = digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
  if (!normalized.startsWith('7')) return raw.trim();
  return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`;
}

/** Часы из data-filter-working_hours листинга PadelMesh → канон-строка. */
export function canonicalHoursFromListing(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const parts: string[] = [];
  for (const [abbr, value] of Object.entries(parsed)) {
    const day = DAY_MAP[abbr];
    if (!day) continue;
    const time = (value || '').trim();
    if (!time || /closed|выходной|off/i.test(time)) continue;
    parts.push(`${day}: ${time.replace('-', '–')}`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/** Часы из JSON-LD openingHoursSpecification → канон-строка. */
export function canonicalHoursFromSchema(
  spec: Array<{ dayOfWeek?: string | string[]; opens?: string; closes?: string }> | undefined
): string | null {
  if (!Array.isArray(spec) || spec.length === 0) return null;
  const parts: string[] = [];
  for (const entry of spec) {
    const days = Array.isArray(entry.dayOfWeek) ? entry.dayOfWeek : [entry.dayOfWeek];
    for (const dayRaw of days) {
      if (!dayRaw) continue;
      const dayKey = String(dayRaw).split('/').pop() || '';
      const day = SCHEMA_DAY_MAP[dayKey] || SCHEMA_DAY_MAP[dayKey.slice(0, 3)] || null;
      if (!day) continue;
      if (!entry.opens || !entry.closes) continue;
      parts.push(`${day}: ${entry.opens}–${entry.closes}`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

// Маппинг удобств каталогов на значения из нашей БД (см. CourtCard AMENITY_ICONS)
const AMENITY_MAP: Record<string, string> = {
  'Душ': 'Душевые',
  'Душевые': 'Душевые',
  'Раздевалки': 'Душевые',
  'Бесплатная парковка': 'Парковка',
  'Парковка': 'Парковка',
  'Кафе / Снэк-бар': 'Кафе',
  'Кафе': 'Кафе',
  'Бар': 'Кафе',
  'Ресторан': 'Ресторан',
  'Прокат инвентаря': 'Прокат ракеток',
  'Прокат ракеток': 'Прокат ракеток',
  'Wi-Fi': 'Wi-Fi',
  'Вай-фай': 'Wi-Fi',
  'Инструктор': 'Инструктор',
  'Тренер': 'Инструктор',
  'Бассейн': 'Бассейн',
};

export function mapAmenities(features: unknown[] | undefined | null): string[] {
  if (!Array.isArray(features)) return [];
  const result: string[] = [];
  for (const feature of features) {
    const name =
      typeof feature === 'string'
        ? feature
        : feature && typeof feature === 'object' && 'name' in feature
          ? String((feature as { name: unknown }).name)
          : '';
    if (!name) continue;
    const mapped = AMENITY_MAP[name.trim()] || name.trim();
    if (!result.includes(mapped)) result.push(mapped);
  }
  return result;
}

/** «indoor,outdoor» / «Крытый» → indoor | outdoor | mixed. */
export function inferType(raw: string | null | undefined): 'indoor' | 'outdoor' | 'mixed' {
  if (!raw) return 'mixed';
  const value = raw.toLowerCase();
  const indoor = value.includes('indoor') || value.includes('крыт');
  const outdoor = value.includes('outdoor') || value.includes('открыт');
  if (indoor && outdoor) return 'mixed';
  if (indoor) return 'indoor';
  if (outdoor) return 'outdoor';
  return 'mixed';
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

/** Название похоже на падел-клуб. */
export function isPadelRelated(text: string): boolean {
  const value = text.toLowerCase();
  return value.includes('padel') || value.includes('падел') || value.includes('tejo');
}

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

// ──────────────────────────── парсеры ────────────────────────────

const PADELMESH_BASE = 'https://padelmesh.com';
const MYACHMYACH_BASE = 'https://padel.myachmyach.ru';

/** Все JSON-LD блоки страницы (с разворотом @graph). */
export function parseJsonLdBlocks(html: string): any[] {
  const $ = cheerio.load(html);
  const result: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) result.push(...parsed);
      else if (parsed && Array.isArray(parsed['@graph'])) result.push(...parsed['@graph']);
      else if (parsed) result.push(parsed);
    } catch {
      /* некорректный JSON-LD пропускаем */
    }
  });
  return result;
}

function isSportsLocation(node: any): boolean {
  if (!node || typeof node !== 'object') return false;
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t: unknown) => t === 'SportsActivityLocation' || t === 'SportsClub');
}

/** Листинг PadelMesh: <li data-club-url … data-latitude …> — координаты, часы, тип, фото. */
export function parsePadelmeshListing(html: string): CourtCandidate[] {
  const $ = cheerio.load(html);
  const items: CourtCandidate[] = [];

  $('li[data-club-url]').each((_, el) => {
    const node = $(el);
    const name = (node.attr('data-name') || '').trim();
    const city = (node.attr('data-city') || '').trim();
    const clubUrl = (node.attr('data-club-url') || '').trim();
    const lat = parseFloat(node.attr('data-latitude') || '');
    const lng = parseFloat(node.attr('data-longitude') || '');
    if (!name || !clubUrl || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let courtsCount: number | null = null;
    try {
      const tags: unknown[] = JSON.parse(node.attr('data-balloon-tags') || '[]');
      for (const tag of tags) {
        const match = String(tag).match(/(\d+)\s*корт/i);
        if (match) {
          courtsCount = parseInt(match[1], 10);
          break;
        }
      }
    } catch {
      /* нет тегов — не страшно */
    }

    let photo = (node.attr('data-photo-url') || '').trim() || null;
    if (photo) photo = photo.replace('/small/', '/large/');

    items.push({
      source: 'padelmesh',
      sourceUrl: clubUrl.startsWith('http') ? clubUrl : `${PADELMESH_BASE}${clubUrl}`,
      name,
      city,
      address: null,
      coordinates: { lat, lng },
      type: inferType(node.attr('data-filter-court_types') || ''),
      phone: null,
      workingHours: canonicalHoursFromListing(node.attr('data-filter-working_hours')),
      description: null,
      image: photo,
      amenities: [],
      courtsCount,
    });
  });

  return items;
}

export interface PadelmeshClubDetails {
  address: string | null;
  phone: string | null;
  description: string | null;
  image: string | null;
  amenities: string[];
  workingHours: string | null;
}

/** Страница клуба PadelMesh: JSON-LD SportsActivityLocation. */
export function parsePadelmeshClub(html: string): PadelmeshClubDetails | null {
  const location = parseJsonLdBlocks(html).find(isSportsLocation);
  if (!location) return null;

  const address = location.address || {};
  const street = String(address.streetAddress || '').trim();
  const locality = String(address.addressLocality || '').trim();
  const fullAddress = [street, locality && !street.includes(locality) ? locality : '']
    .filter(Boolean)
    .join(', ');

  const images = Array.isArray(location.image) ? location.image : [location.image];
  const image = typeof images[0] === 'string' ? images[0] : null;

  return {
    address: fullAddress || null,
    phone: normalizePhone(location.telephone),
    description: location.description ? String(location.description).trim() : null,
    image,
    amenities: mapAmenities(location.amenityFeature),
    workingHours: canonicalHoursFromSchema(location.openingHoursSpecification),
  };
}

/** Городская страница МячМяч: карточки .club-card → название, мета (город) и ссылка. */
export function parseMyachmyachCity(
  html: string
): Array<{ name: string; url: string; meta: string }> {
  const $ = cheerio.load(html);
  const result: Array<{ name: string; url: string; meta: string }> = [];

  $('.club-card').each((_, el) => {
    const name = $(el).find('.club-name').first().text().trim();
    const href = $(el).find('.club-name-link').first().attr('href') || '';
    const meta = $(el).find('.club-meta').first().text().trim();
    if (!name || !href) return;
    result.push({ name, url: href.startsWith('http') ? href : `${MYACHMYACH_BASE}${href}`, meta });
  });

  return result;
}

/** «Свердловская область, Екатеринбург» → «Екатеринбург» (последний сегмент). */
export function cityFromMeta(meta: string): string {
  const segments = meta
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}

export interface MyachmyachClubDetails {
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  image: string | null;
}

/** Страница клуба МячМяч: JSON-LD SportsClub + логотип. */
export function parseMyachmyachClub(html: string): MyachmyachClubDetails | null {
  const location = parseJsonLdBlocks(html).find(isSportsLocation);
  if (!location) return null;

  const address = location.address || {};
  const street = String(address.streetAddress || '').trim();
  const city = String(address.addressLocality || '').trim() || null;

  const $ = cheerio.load(html);
  const logo = $('img.club-logo').first().attr('src') || '';
  const image = logo ? (logo.startsWith('http') ? logo : `${MYACHMYACH_BASE}/${logo.replace(/^\//, '')}`) : null;

  return {
    name: String(location.name || '').trim(),
    city,
    address: street || null,
    phone: normalizePhone(location.telephone),
    image,
  };
}

export interface FederationEntry {
  city: string;
  name: string | null; // у части записей в заголовке только город — без имени не берём
  address: string | null;
  phone: string | null;
  description: string | null;
  image: string | null;
}

/** federationpadel.ru/addresses — аккордеоны Tilda (.t849__wrapper). */
export function parseFederationAddresses(html: string): FederationEntry[] {
  const $ = cheerio.load(html);
  const entries: FederationEntry[] = [];

  $('.t849__wrapper').each((_, el) => {
    const title = $(el).find('.t849__title').first().text().trim();
    if (!title) return;

    let city = title;
    let name: string | null = null;
    const parts = title.split(/\s+[-–—]\s+/);
    if (parts.length >= 2) {
      city = parts[0].trim();
      name = parts.slice(1).join(' - ').trim();
    }

    // HTML → текст с переводами строк
    const textHolder = $('<div>');
    textHolder.append($(el).find('.t849__text').first().html() || '');
    textHolder.find('br').replaceWith('\n');
    const text = textHolder.text().replace(/\u00a0/g, ' ');

    const addressMatch = text.match(/Адрес:\s*([\s\S]*?)(?=\n?\s*Телефон:|\n?\s*Контактное лицо:|\n?\s*Описание:|$)/);
    const address = addressMatch ? addressMatch[1].split('\n')[0].trim() : null;

    const phoneMatch = text.match(/Телефон:\s*([^\n]*)/);
    const phone = phoneMatch ? normalizePhone(phoneMatch[1]) : null;

    const descriptionMatch = text.match(/Описание:\s*([\s\S]*?)\s*$/);
    const description = descriptionMatch ? descriptionMatch[1].replace(/\s+/g, ' ').trim() : null;

    const imageTag = $(el).find('.t849__img').first();
    const image = (imageTag.attr('data-original') || imageTag.attr('src') || '').trim() || null;

    entries.push({ city, name, address, phone, description, image });
  });

  return entries;
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

/**
 * Дедуп против каталога: 1) sourceUrl, 2) нормализованное название+город
 * (в т.ч. когда одно название — часть другого), 3) координаты ближе 200 м.
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
  for (const court of existing) {
    if (normalizeName(court.city) !== candCity) continue;
    const dbName = normalizeName(court.name);
    const same =
      dbName === candName ||
      (candName.length >= 8 && dbName.includes(candName)) ||
      (dbName.length >= 8 && candName.includes(dbName));
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

export function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base.replace(/^-+|-+$/g, '') || 'club';
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  for (let i = 2; i < 1000; i++) {
    const candidate = `${slug}-${i}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `${slug}-${Date.now()}`;
  used.add(fallback);
  return fallback;
}

/** Кандидат → данные для prisma.court.create. */
export function candidateToCourtData(
  candidate: CourtCandidate,
  options: { imagePath: string; usedSlugs: Set<string> }
): {
  slug: string;
  name: string;
  city: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: string;
  amenities: string[];
  phone: string | null;
  workingHours: string | null;
  description: string;
  prices: never[];
  image: string;
  rating: number;
  reviewCount: number;
  likes: number;
  courtsCount: number;
  tags: null;
  source: string;
  sourceUrl: string;
} {
  if (!candidate.coordinates) {
    throw new Error(`У кандидата «${candidate.name}» нет координат`);
  }

  return {
    slug: uniqueSlug(slugify(candidate.name), options.usedSlugs),
    name: candidate.name,
    city: candidate.city,
    address: candidate.address || `${candidate.city}, адрес не указан`,
    coordinates: candidate.coordinates,
    type: candidate.type,
    amenities: candidate.amenities,
    phone: candidate.phone,
    workingHours: candidate.workingHours,
    description:
      candidate.description ||
      `Падел-клуб «${candidate.name}» в городе ${candidate.city}.`,
    prices: [],
    image: options.imagePath,
    rating: 0,
    reviewCount: 0,
    likes: 0,
    courtsCount: candidate.courtsCount || 1,
    tags: null,
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
  };
}