// Преобразование найденного кандидата в данные для prisma.court.create.
import { CourtCandidate } from './types';
import { slugify } from './normalize';

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
