// Режим --fill-images: дозаполнение photo у кортов-заглушек из листингов
// PadelMesh (фото) и МячМяч (логотипы) — без походов на страницы клубов.
import { prisma } from '../../src/config/database';
import { parseMyachmyachCity, parsePadelmeshListing } from '../../src/modules/courts/court-discovery';
import { SITE_DELAY_MS, downloadImage, httpGet, sleep } from './http';
import { MYACHMYACH_SITEMAP, PADELMESH_LISTING } from './sources';

// ──────────────── дозаполнение фотографий (--fill-images) ────────────────

/**
 * Дозаполняет image у кортов, у которых стоит заглушка.
 * URL берём пачкой из листинга PadelMesh (фото + логотип-пин) и городских
 * страниц МячМяч (логотипы) — без походов на страницы клубов.
 */
export async function fillImages(): Promise<void> {
  console.log('\n🖼 Дозаполнение фотографий (--fill-images)');

  const rows = await prisma.court.findMany({
    where: {
      image: '/images/court-placeholder.svg',
      source: { in: ['padelmesh', 'myachmyach'] },
    },
    select: { slug: true, source: true, sourceUrl: true },
  });
  console.log(`Кортов с заглушкой: ${rows.length}`);
  if (rows.length === 0) return;

  const imageByUrl = new Map<string, string>();

  if (rows.some((row) => row.source === 'padelmesh')) {
    console.log('📡 PadelMesh: листинг (фото и логотипы)…');
    for (let page = 1; page <= 8; page++) {
      const url = page === 1 ? PADELMESH_LISTING : `${PADELMESH_LISTING}?page=${page}`;
      const html = await httpGet(url);
      if (html) {
        for (const item of parsePadelmeshListing(html)) {
          if (item.image) imageByUrl.set(item.sourceUrl, item.image);
        }
      }
      await sleep(SITE_DELAY_MS);
    }
  }

  if (rows.some((row) => row.source === 'myachmyach')) {
    console.log('📡 МячМяч: городские страницы (логотипы)…');
    const sitemap = await httpGet(MYACHMYACH_SITEMAP);
    const cityUrls = sitemap
      ? Array.from(
          sitemap.matchAll(/<loc>(https:\/\/padel\.myachmyach\.ru\/padel[^<]*)<\/loc>/g)
        )
          .map((match) => match[1])
          .filter((cityUrl) => !cityUrl.includes('-metro-'))
      : [];

    for (const cityUrl of Array.from(new Set(cityUrls))) {
      const html = await httpGet(cityUrl);
      await sleep(SITE_DELAY_MS);
      if (!html) continue;
      for (const card of parseMyachmyachCity(html)) {
        if (card.logo) imageByUrl.set(card.url, card.logo);
      }
    }
  }

  console.log(`URL картинок собрано: ${imageByUrl.size}`);

  let filled = 0;
  let missed = 0;
  for (const row of rows) {
    if (!row.sourceUrl) {
      missed++;
      continue;
    }
    const imageUrl = imageByUrl.get(row.sourceUrl);
    if (!imageUrl) {
      missed++;
      continue;
    }
    const imagePath = await downloadImage(imageUrl, row.slug);
    await sleep(SITE_DELAY_MS);
    if (!imagePath) {
      missed++;
      continue;
    }
    await prisma.court.update({ where: { slug: row.slug }, data: { image: imagePath } });
    filled++;
    console.log(`  ✅ ${row.slug}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ --fill-images:');
  console.log(`  Обновлено: ${filled}, без картинки в источнике: ${missed}`);
  console.log('='.repeat(60));
}
