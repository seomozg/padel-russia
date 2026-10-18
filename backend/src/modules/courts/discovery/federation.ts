// Источник «Федерация падела» (federationpadel.ru/addresses):
// аккордеоны Tilda, контактные данные — текстом внутри .t849__text.
import * as cheerio from 'cheerio';
import { normalizePhone } from './normalize';

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
