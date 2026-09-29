// Геокодинг кортов с фиктивными координатами (центром Москвы).
// Источник: Nominatim/OpenStreetMap (Google Geocoding не доступен — биллинг,
// ключ Яндекс.Геокодера невалиден).
//
// Запуск в backend-контейнере:
//   npx ts-node scripts/geocode-courts.ts          # dry-run: только отчёт
//   npx ts-node scripts/geocode-courts.ts --apply  # записать координаты
import 'dotenv/config';
import axios from 'axios';
import { prisma } from '../src/config/database';
import {
  DEFAULT_COORDINATES,
  buildGeocodeQuery,
  cityMatches,
  isDefaultCoordinates,
} from '../src/modules/courts/geocode-utils';

const APPLY = process.argv.includes('--apply');
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// Политика Nominatim: осознанный User-Agent + пауза >= 1 сек между запросами
const USER_AGENT =
  'PadelRussiaGeocoder/1.0 (https://padel-russia.online; admin@padel-russia.online)';
const REQUEST_DELAY_MS = 1100;

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  address: Record<string, string>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocode(query: string): Promise<GeocodeResult | null> {
  const { data } = await axios.get(NOMINATIM_URL, {
    params: { q: query, format: 'json', limit: 1, addressdetails: 1 },
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru' },
    timeout: 20000,
  });

  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0];
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, displayName: String(first.display_name || ''), address: first.address || {} };
}

async function main() {
  console.log(`\n🌍 Геокодинг кортов (${APPLY ? 'APPLY' : 'DRY-RUN, без записи'})\n`);

  const courts = await prisma.court.findMany({
    select: { id: true, slug: true, city: true, address: true, coordinates: true },
  });

  const targets = courts.filter((court) => isDefaultCoordinates(court.coordinates));
  console.log(`Всего кортов: ${courts.length}`);
  console.log(`С фиктивными координатами (${DEFAULT_COORDINATES.lat},${DEFAULT_COORDINATES.lng}): ${targets.length}\n`);

  if (targets.length === 0) {
    console.log('✅ Геокодинг не требуется.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const court of targets) {
    const query = buildGeocodeQuery(court.address, court.city);

    try {
      const result = await geocode(query);

      if (!result) {
        console.log(`  ⚠️  Не найдено: ${court.slug} — «${query}»`);
        failed++;
      } else if (!cityMatches(result.displayName, court.city, result.address)) {
        console.log(
          `  ⏭️  Город не совпал: ${court.slug} → «${result.displayName}» (ожидали «${court.city}»)`
        );
        skipped++;
      } else {
        console.log(
          `  ✅ ${court.slug}: → ${result.lat}, ${result.lng} (${result.displayName})`
        );
        if (APPLY) {
          await prisma.court.update({
            where: { id: court.id },
            data: { coordinates: { lat: result.lat, lng: result.lng } },
          });
        }
        updated++;
      }
    } catch (error: any) {
      console.error(`  ❌ Ошибка: ${court.slug} — ${error.message}`);
      failed++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГИ ГЕОКОДИНГА:');
  console.log(`  Найдено и ${APPLY ? 'обновлено' : 'будет обновлено'}: ${updated}`);
  console.log(`  Пропущено (город не совпал): ${skipped}`);
  console.log(`  Ошибки/не найдено: ${failed}`);
  console.log('='.repeat(50));
}

main()
  .then(() => {
    console.log('\n✅ Геокодинг завершён!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка геокодинга:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());