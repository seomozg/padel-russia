// Источник PadelMesh (padelmesh.com): листинг клубов (data-атрибуты)
// и страница клуба (JSON-LD SportsActivityLocation).
import * as cheerio from 'cheerio';
import { CourtCandidate } from './types';
import { canonicalHoursFromListing, canonicalHoursFromSchema, inferType, mapAmenities, normalizePhone, resolveImageUrl } from './normalize';
import { isSportsLocation, parseJsonLdBlocks } from './jsonld';

const PADELMESH_BASE = 'https://padelmesh.com';
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

    // Относительные URL ломали axios («Invalid URL») → резолвим, заглушки каталога отбрасываем
    let photo = resolveImageUrl(node.attr('data-photo-url'), PADELMESH_BASE);
    if (photo) photo = photo.replace('/small/', '/large/');
    // Если фото нет даже у каталога — берём логотип с карты (data-pin-image, есть у всех)
    const image = photo || resolveImageUrl(node.attr('data-pin-image'), PADELMESH_BASE);

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
      image,
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
  const image = resolveImageUrl(typeof images[0] === 'string' ? images[0] : null, PADELMESH_BASE);

  return {
    address: fullAddress || null,
    phone: normalizePhone(location.telephone),
    description: location.description ? String(location.description).trim() : null,
    image,
    amenities: mapAmenities(location.amenityFeature),
    workingHours: canonicalHoursFromSchema(location.openingHoursSpecification),
  };
}
