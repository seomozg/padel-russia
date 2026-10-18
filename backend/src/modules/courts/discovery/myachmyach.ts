// Источник МячМяч (padel.myachmyach.ru): городская страница (карточки клубов)
// и страница клуба (JSON-LD SportsClub + логотип).
import * as cheerio from 'cheerio';
import { normalizePhone, resolveImageUrl } from './normalize';
import { isSportsLocation, parseJsonLdBlocks } from './jsonld';

const MYACHMYACH_BASE = 'https://padel.myachmyach.ru';
/** Городская страница МячМяч: карточки .club-card → название, мета (город), ссылка и логотип. */
export function parseMyachmyachCity(
  html: string
): Array<{ name: string; url: string; meta: string; logo: string | null }> {
  const $ = cheerio.load(html);
  const result: Array<{ name: string; url: string; meta: string; logo: string | null }> = [];

  $('.club-card').each((_, el) => {
    const name = $(el).find('.club-name').first().text().trim();
    const href = $(el).find('.club-name-link').first().attr('href') || '';
    const meta = $(el).find('.club-meta').first().text().trim();
    // Логотип есть только на городской карточке (на странице клуба его нет)
    const logoSrc =
      $(el).find('img.club-logo').first().attr('src') ||
      $(el).find('img.club-logo').first().attr('data-src') ||
      '';
    if (!name || !href) return;
    result.push({
      name,
      url: href.startsWith('http') ? href : `${MYACHMYACH_BASE}${href}`,
      meta,
      logo: resolveImageUrl(logoSrc, MYACHMYACH_BASE),
    });
  });

  return result;
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
  const logoTag = $('img.club-logo').first();
  const logo = logoTag.attr('src') || logoTag.attr('data-src') || '';

  return {
    name: String(location.name || '').trim(),
    city,
    address: street || null,
    phone: normalizePhone(location.telephone),
    image: resolveImageUrl(logo, MYACHMYACH_BASE),
  };
}
