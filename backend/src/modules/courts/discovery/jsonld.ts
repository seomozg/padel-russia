// Разбор JSON-LD блоков (Schema.org) со страниц каталогов.
import * as cheerio from 'cheerio';

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

export function isSportsLocation(node: any): boolean {
  if (!node || typeof node !== 'object') return false;
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t: unknown) => t === 'SportsActivityLocation' || t === 'SportsClub');
}
