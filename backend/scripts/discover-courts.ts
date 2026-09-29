// Поиск новых падел-клубов в безключевых каталогах и добавление их в каталог.
//
// Запуск в backend-контейнере:
//   npx ts-node scripts/discover-courts.ts                 # dry-run (отчёт, без записи)
//   npx ts-node scripts/discover-courts.ts --apply         # записать найденные клубы
//   npx ts-node scripts/discover-courts.ts --sources=padelmesh --city=Москва
//   npx ts-node scripts/discover-courts.ts --limit=5       # отладочный прогон
import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/config/database';
import {
  CourtCandidate,
  ExistingCourt,
  candidateToCourtData,
  cityFromMeta,
  dedupeCandidate,
  looksLikeCity,
  parseFederationAddresses,
  parseMyachmyachCity,
  parseMyachmyachClub,
  parsePadelmeshClub,
  parsePadelmeshListing,
  refineCity,
} from '../src/modules/courts/court-discovery';
import {
  addressLocalityMatches,
  buildGeocodeQueries,
  cityMatches,
} from '../src/modules/courts/geocode-utils';

const APPLY = process.argv.includes('--apply');
const NO_GEOCODE = process.argv.includes('--no-geocode');
const FILL_IMAGES = process.argv.includes('--fill-images');
const LIMIT = parseInt(getArg('--limit') || '0', 10) || 0;
const CITY_FILTER = (getArg('--city') || '').trim().toLowerCase();
const SOURCES = (getArg('--sources') || 'padelmesh,myachmyach,federation')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function getArg(name: string): string | null {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return null;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SITE_DELAY_MS = 500; // вежливость к каталогам
const GEOCODE_DELAY_MS = 1100; // лимит Nominatim 1 req/sec

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function httpGet(url: string, timeout = 20000): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout,
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru,ru-RU;q=0.9,en;q=0.6' },
      responseType: 'text',
      maxRedirects: 5,
    });
    return typeof response.data === 'string' ? response.data : String(response.data);
  } catch (error: any) {
    console.error(`  ❌ GET ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Геокодинг Nominatim для кандидатов без координат (та же цепочка, что у геокодинга кортов).
 * 'address' — координаты по адресу (принимаем), 'city' — только центр города
 * (НЕ принимаем: центр города ≠ адрес клуба, такие записи уходят в отчёт на ручную проверку).
 */
async function geocodeCandidate(candidate: CourtCandidate): Promise<'address' | 'city' | null> {
  const queries = buildGeocodeQueries(candidate.address || '', candidate.city);

  for (let i = 0; i < queries.length; i++) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: queries[i], format: 'json', limit: 1, addressdetails: 1 },
        headers: { 'User-Agent': 'PadelRussiaDiscover/1.0 (https://padel-russia.online)' },
        timeout: 20000,
      });
      await sleep(GEOCODE_DELAY_MS);

      const rows = Array.isArray(response.data) ? response.data : [];
      if (rows.length === 0) continue;

      const lat = parseFloat(rows[0].lat);
      const lng = parseFloat(rows[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const displayName = String(rows[0].display_name || '');
      const valid =
        cityMatches(displayName, candidate.city, rows[0].address) ||
        addressLocalityMatches(displayName, candidate.address || '');
      if (!valid) continue;

      // Последний запрос в цепочке — «только город»: такой результат отклоняем
      if (queries.length > 1 && i === queries.length - 1) return 'city';

      candidate.coordinates = { lat, lng };
      return 'address';
    } catch (error: any) {
      console.error(`  ❌ Nominatim: ${error.message}`);
      await sleep(GEOCODE_DELAY_MS);
    }
  }

  return null;
}

/** Скачивание картинки клуба в public/images/courts (в контейнере это volume → доступно сразу). */
async function downloadImage(url: string, slug: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const contentType = String(response.headers['content-type'] || '');
    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('jpeg') || contentType.includes('jpg')
          ? 'jpg'
          : (path.extname(new URL(url).pathname).replace('.', '').toLowerCase() || 'jpg');
    const imagesDir = path.join(process.cwd(), 'public', 'images', 'courts');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const filename = `${slug}_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(imagesDir, filename), Buffer.from(response.data as ArrayBuffer));
    return `/images/courts/${filename}`;
  } catch (error: any) {
    console.error(`  ⚠️ Не скачалось фото (${error.message})`);
    return null;
  }
}

// ────────────────────────── сбор кандидатов ──────────────────────────

interface Stats {
  found: Record<string, number>;
  duplicates: { sourceUrl: number; nameCity: number; nearCoords: number };
  warnings: string[];
}

function matchesCity(city: string): boolean {
  if (!CITY_FILTER) return true;
  return city.trim().toLowerCase() === CITY_FILTER;
}

function asExisting(candidate: CourtCandidate): ExistingCourt {
  return {
    slug: candidate.sourceUrl,
    name: candidate.name,
    city: candidate.city,
    sourceUrl: candidate.sourceUrl,
    coordinates: candidate.coordinates,
  };
}

function registerDuplicate(stats: Stats, reason?: string) {
  if (reason === 'sourceUrl') stats.duplicates.sourceUrl++;
  else if (reason === 'nearCoords') stats.duplicates.nearCoords++;
  else stats.duplicates.nameCity++;
}

const PADELMESH_LISTING = 'https://padelmesh.com/ru/ru/clubs';

async function collectPadelmesh(
  pool: ExistingCourt[],
  accepted: CourtCandidate[],
  stats: Stats
): Promise<void> {
  console.log('📡 PadelMesh: листинг клубов…');
  const items: CourtCandidate[] = [];

  for (let page = 1; page <= 8; page++) {
    const url = page === 1 ? PADELMESH_LISTING : `${PADELMESH_LISTING}?page=${page}`;
    const html = await httpGet(url);
    if (html) items.push(...parsePadelmeshListing(html));
    await sleep(SITE_DELAY_MS);
  }

  stats.found.padelmesh = items.length;
  let kept = 0;
  for (const item of items) {
    if (!matchesCity(item.city)) continue;
    const dedupe = dedupeCandidate(pool, item);
    if (dedupe.status === 'duplicate') {
      registerDuplicate(stats, dedupe.reason);
      continue;
    }
    accepted.push(item);
    pool.push(asExisting(item));
    kept++;
  }
  console.log(`   Найдено: ${items.length}, новых после дедупа: ${kept}`);
}

const MYACHMYACH_SITEMAP = 'https://padel.myachmyach.ru/sitemap.xml';

async function collectMyachmyach(
  pool: ExistingCourt[],
  accepted: CourtCandidate[],
  stats: Stats
): Promise<void> {
  console.log('📡 МячМяч: sitemap городов…');
  const sitemap = await httpGet(MYACHMYACH_SITEMAP);
  if (!sitemap) return;

  const cityUrls = Array.from(
    sitemap.matchAll(/<loc>(https:\/\/padel\.myachmyach\.ru\/padel[^<]*)<\/loc>/g)
  )
    .map((match) => match[1])
    .filter((url) => !url.includes('-metro-'));

  let found = 0;
  let kept = 0;
  for (const cityUrl of Array.from(new Set(cityUrls))) {
    const html = await httpGet(cityUrl);
    await sleep(SITE_DELAY_MS);
    if (!html) continue;

    for (const card of parseMyachmyachCity(html)) {
      found++;
      const city = cityFromMeta(card.meta);
      if (!city || !matchesCity(city)) continue;

      const preDedupe = dedupeCandidate(pool, {
        source: 'myachmyach',
        sourceUrl: card.url,
        name: card.name,
        city,
        address: null,
        coordinates: null,
        type: 'mixed',
        phone: null,
        workingHours: null,
        description: null,
        image: null,
        amenities: [],
        courtsCount: null,
      });
      if (preDedupe.status === 'duplicate') {
        registerDuplicate(stats, preDedupe.reason);
        continue;
      }

      // Детальная страница: JSON-LD даёт адрес/телефон/город
      const detailHtml = await httpGet(card.url);
      await sleep(SITE_DELAY_MS);
      const details = detailHtml ? parseMyachmyachClub(detailHtml) : null;

      const candidate: CourtCandidate = {
        source: 'myachmyach',
        sourceUrl: card.url,
        name: details?.name || card.name,
        city: details?.city || city,
        address: details?.address || null,
        coordinates: null,
        type: 'mixed',
        phone: details?.phone || null,
        workingHours: null,
        description: null,
        image: details?.image || card.logo || null,
        amenities: [],
        courtsCount: null,
      };

      const dedupe = dedupeCandidate(pool, candidate);
      if (dedupe.status === 'duplicate') {
        registerDuplicate(stats, dedupe.reason);
        continue;
      }
      accepted.push(candidate);
      pool.push(asExisting(candidate));
      kept++;
    }
  }

  stats.found.myachmyach = found;
  console.log(`   Найдено: ${found}, новых после дедупа: ${kept}`);
}

async function collectFederation(
  pool: ExistingCourt[],
  accepted: CourtCandidate[],
  stats: Stats
): Promise<void> {
  console.log('📡 Федерация падел (адреса клубов)…');
  const html = await httpGet('https://federationpadel.ru/addresses');
  if (!html) return;

  const entries = parseFederationAddresses(html);
  stats.found.federation = entries.length;
  let kept = 0;
  let skippedNoName = 0;

  for (const entry of entries) {
    if (!entry.name) {
      skippedNoName++;
      stats.warnings.push(
        `federation: «${entry.city}» — в заголовке только город, название клуба отсутствует, пропущено`
      );
      continue;
    }
    if (!matchesCity(entry.city)) continue;

    const candidate: CourtCandidate = {
      source: 'federation',
      sourceUrl: `https://federationpadel.ru/addresses#${entry.city}-${entry.name}`,
      name: entry.name,
      city: entry.city,
      address: entry.address,
      coordinates: null,
      type: 'mixed',
      phone: entry.phone,
      workingHours: null,
      description: entry.description,
      image: entry.image,
      amenities: [],
      courtsCount: null,
    };

    const dedupe = dedupeCandidate(pool, candidate);
    if (dedupe.status === 'duplicate') {
      registerDuplicate(stats, dedupe.reason);
      continue;
    }
    accepted.push(candidate);
    pool.push(asExisting(candidate));
    kept++;
  }

  console.log(
    `   Записей: ${entries.length}, без названия пропущено: ${skippedNoName}, новых: ${kept}`
  );
}

// ──────────────── дозаполнение фотографий (--fill-images) ────────────────

/**
 * Дозаполняет image у кортов, у которых стоит заглушка.
 * URL берём пачкой из листинга PadelMesh (фото + логотип-пин) и городских
 * страниц МячМяч (логотипы) — без походов на страницы клубов.
 */
async function fillImages(): Promise<void> {
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

// ───────────────────────────── main ─────────────────────────────

async function main() {
  if (FILL_IMAGES) {
    await fillImages();
    return;
  }

  console.log(`\n🔎 Поиск новых падел-клубов (${APPLY ? 'APPLY' : 'DRY-RUN, без записи'})`);
  console.log(
    `Источники: ${SOURCES.join(', ')}${CITY_FILTER ? ` | город: ${CITY_FILTER}` : ''}${
      LIMIT ? ` | limit: ${LIMIT}` : ''
    }\n`
  );

  const existingRows = await prisma.court.findMany({
    select: { slug: true, name: true, city: true, sourceUrl: true, coordinates: true },
  });
  const original: ExistingCourt[] = existingRows.map((row) => ({
    slug: row.slug,
    name: row.name,
    city: row.city,
    sourceUrl: row.sourceUrl,
    coordinates: row.coordinates,
  }));
  const pool: ExistingCourt[] = [...original];
  const stats: Stats = {
    found: {},
    duplicates: { sourceUrl: 0, nameCity: 0, nearCoords: 0 },
    warnings: [],
  };
  const accepted: CourtCandidate[] = [];

  console.log(`Каталог: ${original.length} кортов`);

  if (SOURCES.includes('padelmesh')) await collectPadelmesh(pool, accepted, stats);
  if (SOURCES.includes('myachmyach')) await collectMyachmyach(pool, accepted, stats);
  if (SOURCES.includes('federation')) await collectFederation(pool, accepted, stats);

  if (LIMIT > 0 && accepted.length > LIMIT) {
    accepted.splice(LIMIT);
    console.log(`   ⚠️ --limit=${LIMIT}: обрабатываем ${accepted.length} кандидатов`);
  }

  // Детали PadelMesh (адрес, телефон, описание, удобства) — только для новых клубов
  let detailsLoaded = 0;
  for (const candidate of accepted) {
    if (candidate.source !== 'padelmesh' || candidate.address) continue;
    const html = await httpGet(candidate.sourceUrl);
    await sleep(SITE_DELAY_MS);
    if (!html) continue;
    const details = parsePadelmeshClub(html);
    if (!details) {
      stats.warnings.push(`padelmesh: нет JSON-LD на ${candidate.sourceUrl}`);
      continue;
    }
    candidate.address = details.address;
    candidate.phone = candidate.phone || details.phone;
    candidate.description = details.description;
    candidate.amenities = details.amenities;
    candidate.workingHours = candidate.workingHours || details.workingHours;
    if (details.image) candidate.image = details.image;
    detailsLoaded++;
  }
  if (detailsLoaded > 0) console.log(`   📄 Детальных страниц получено: ${detailsLoaded}`);

  // Очистка поля city (в каталогах встречаются «Венецианская улица», «Падел Владивосток»)
  // и отсев того, что городом так и не стало — координаты и фильтры были бы мусорными
  for (let i = accepted.length - 1; i >= 0; i--) {
    const candidate = accepted[i];
    candidate.city = refineCity(candidate.city, candidate.address);
    if (!looksLikeCity(candidate.city)) {
      stats.warnings.push(
        `city: «${candidate.name}» — не удалось определить город (${candidate.city}), пропущено`
      );
      accepted.splice(i, 1);
    }
  }

  // Геокодинг кандидатов без координат
  const needGeocode = accepted.filter((candidate) => !candidate.coordinates);
  if (!NO_GEOCODE && needGeocode.length > 0) {
    console.log(`📍 Геокодинг Nominatim: ${needGeocode.length} клубов…`);
    let cityOnly = 0;
    for (const candidate of needGeocode) {
      const result = await geocodeCandidate(candidate);
      if (result === 'city') {
        cityOnly++;
        stats.warnings.push(
          `geocode(центр города): «${candidate.name}» (${candidate.city}) — адрес не найден, нужна ручная проверка`
        );
      } else if (result === null) {
        stats.warnings.push(
          `nogeo: «${candidate.name}» (${candidate.city}) — координаты не найдены`
        );
      }
    }
    if (cityOnly > 0) console.log(`   ⚠️ Только центр города (не добавляем): ${cityOnly}`);
  }

  // Финальная разбивка: дедуп геокодированных против исходного каталога
  // И против уже принятых кандидатов (иначе один клуб из двух источников
  // добавился бы дважды) — порядок accepted: padelmesh, myachmyach, federation.
  const newList: CourtCandidate[] = [];
  const nogeo: CourtCandidate[] = [];
  const finalPool: ExistingCourt[] = [...original];
  for (const candidate of accepted) {
    if (!candidate.coordinates) {
      nogeo.push(candidate);
      continue;
    }
    const dedupe = dedupeCandidate(finalPool, candidate);
    if (dedupe.status === 'duplicate') {
      registerDuplicate(stats, dedupe.reason);
      continue;
    }
    newList.push(candidate);
    finalPool.push(asExisting(candidate));
  }

  // Отчёт
  console.log('\n' + '='.repeat(60));
  console.log('📊 ОТЧЁТ ПО ПОИСКУ КЛУБОВ');
  console.log(
    `  Найдено в источниках: padelmesh=${stats.found.padelmesh ?? 0}, myachmyach=${
      stats.found.myachmyach ?? 0
    }, federation=${stats.found.federation ?? 0}`
  );
  console.log(
    `  Дубликаты (пропущены): sourceUrl=${stats.duplicates.sourceUrl}, name+city=${
      stats.duplicates.nameCity
    }, coords<200м=${stats.duplicates.nearCoords}`
  );
  console.log(`  Без координат (не будут добавлены): ${nogeo.length}`);
  console.log(`  ✅ НОВЫХ К ДОБАВЛЕНИЮ: ${newList.length}`);
  if (stats.warnings.length > 0) {
    console.log(`  ⚠️ Предупреждения (${stats.warnings.length}):`);
    for (const warning of stats.warnings.slice(0, 20)) console.log(`     - ${warning}`);
    if (stats.warnings.length > 20) console.log(`     … ещё ${stats.warnings.length - 20}`);
  }

  if (newList.length > 0) {
    console.log('\nСписок новых клубов:');
    for (const candidate of newList) {
      const coords = candidate.coordinates
        ? `${candidate.coordinates.lat.toFixed(5)}, ${candidate.coordinates.lng.toFixed(5)}`
        : '—';
      console.log(
        `  + ${candidate.name} | ${candidate.city} | ${candidate.address || 'адрес уточняется'} | ${coords} | ${candidate.type} | ${candidate.phone || 'телефон —'} | ${candidate.source}`
      );
    }
  }
  console.log('='.repeat(60));

  if (newList.length === 0) {
    console.log('\nНовых клубов не найдено.');
    return;
  }

  if (!APPLY) {
    console.log('\nDRY-RUN: ничего не записано. Запустите с --apply для добавления в каталог.');
    return;
  }

  // Запись в каталог
  const usedSlugs = new Set(original.map((row) => row.slug));
  let added = 0;
  let downloaded = 0;

  for (const candidate of newList) {
    const data = candidateToCourtData(candidate, {
      imagePath: '/images/court-placeholder.svg',
      usedSlugs,
    });

    if (candidate.image) {
      const imagePath = await downloadImage(candidate.image, data.slug);
      if (imagePath) {
        data.image = imagePath;
        downloaded++;
      }
      await sleep(SITE_DELAY_MS);
    }

    await prisma.court.create({ data: data as any });
    added++;
    console.log(`  ✅ ${data.slug} (${data.city})`);
  }

  const total = await prisma.court.count();
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ:');
  console.log(`  Добавлено: ${added} (фото скачано: ${downloaded})`);
  console.log(`  Всего кортов в каталоге: ${total}`);
  console.log('='.repeat(60));
}

main()
  .then(() => {
    console.log('\n✅ Поиск завершён!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка поиска:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());