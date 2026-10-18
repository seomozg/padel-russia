// Города: извлечение из meta-строк каталогов и очистка от мусора адресов.
/** «Свердловская область, Екатеринбург» → «Екатеринбург» (последний сегмент). */
export function cityFromMeta(meta: string): string {
  const segments = meta
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}

// Слова, которых не бывает в названии города (мусор из адресов/названий)
const NOT_CITY_PARTS =
  /(улица|ул\.|проспект|пр\.|шоссе|переулок|проезд|тракт|бульвар|набережная|микрорайон|спуск|территория|padel|падел|court|корты|клуб|этаж|стр\.|деревня|посёлок|поселок|мкр|тц |жк |кп )/i;
const REGION_PARTS = /(край|область|округ|республика|федеральный)/i;

/** Похоже ли значение на название города. */
export function looksLikeCity(value: string): boolean {
  const trimmed = (value || '').trim();
  if (trimmed.length < 2 || trimmed.length > 45) return false;
  if (/\d/.test(trimmed)) return false;
  return !NOT_CITY_PARTS.test(trimmed);
}

/**
 * Город из каталога бывает мусорным («Венецианская улица», «Падел Владивосток»).
 * Если city не похож на город — достаём первый правдоподобный сегмент адреса,
 * пропуская региональные («Свердловская область, Екатеринбург, …» → «Екатеринбург»).
 */
export function refineCity(city: string, address: string | null): string {
  const trimmed = (city || '').trim();
  if (looksLikeCity(trimmed)) return trimmed;

  for (const segment of (address || '').split(',').map((s) => s.trim())) {
    if (!segment || REGION_PARTS.test(segment)) continue;
    if (looksLikeCity(segment)) return segment;
  }
  return trimmed;
}
