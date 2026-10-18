// Нормализация данных каталогов: телефоны, часы работы, типы кортов,
// удобства, URL картинок, slug. Чистые функции — покрыты court-discovery.test.ts.
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

/**
 * Делает URL картинки абсолютным и отсекает заглушки каталога.
 * В листингах попадаются относительные пути (`/assets/…`, `assets/…`) и
 * протокол-относительные (`//host/…`) — на них падал axios («Invalid URL»).
 * `club-placeholder` — собственная заглушка PadelMesh, её не качаем.
 */
export function resolveImageUrl(
  url: string | null | undefined,
  base: string
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^data:/i.test(trimmed)) return null;
  if (/club-placeholder/i.test(trimmed)) return null;

  let absolute: string;
  if (trimmed.startsWith('//')) {
    absolute = `https:${trimmed}`;
  } else if (trimmed.startsWith('/')) {
    absolute = `${base.replace(/\/$/, '')}${trimmed}`;
  } else if (/^https?:\/\//i.test(trimmed)) {
    absolute = trimmed;
  } else {
    absolute = `${base.replace(/\/$/, '')}/${trimmed}`;
  }

  try {
    new URL(absolute);
  } catch {
    return null;
  }
  return absolute;
}
