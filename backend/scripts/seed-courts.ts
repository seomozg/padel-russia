import 'dotenv/config';
import { prisma } from '../src/config/database';

const sampleCourts = [
  {
    name: 'Padel Arena Москва',
    city: 'Москва',
    address: 'ул. Лесная, д. 20',
    coordinates: { lat: 55.7558, lng: 37.6173 },
    type: 'indoor',
    amenities: ['Парковка', 'Душевые', 'Кафе', 'Прокат инвентаря'],
    phone: '+7 (495) 123-45-67',
    workingHours: 'Пн-Вс: 08:00-23:00',
    description: 'Современные корты для падела в центре Москвы. Профессиональное покрытие и освещение.',
    prices: [
      { time: '09:00 – 18:00', weekday: 2000, weekend: 2500 },
      { time: '18:00 – 23:00', weekday: 3000, weekend: 3500 },
    ],
    image: '/images/courts/placeholder.jpg',
    source: 'manual',
    slug: 'padel-arena-moskva',
  },
  {
    name: 'Padel Club Санкт-Петербург',
    city: 'Санкт-Петербург',
    address: 'Невский проспект, д. 100',
    coordinates: { lat: 59.9343, lng: 30.3351 },
    type: 'outdoor',
    amenities: ['Парковка', 'Душевые', 'Тренер'],
    phone: '+7 (812) 987-65-43',
    workingHours: 'Пн-Вс: 09:00-22:00',
    description: 'Открытые корты для падела с видом на город.',
    prices: [
      { time: '09:00 – 18:00', weekday: 1500, weekend: 2000 },
      { time: '18:00 – 22:00', weekday: 2500, weekend: 3000 },
    ],
    image: '/images/courts/placeholder.jpg',
    source: 'manual',
    slug: 'padel-club-spb',
  },
  {
    name: 'Padel Point Казань',
    city: 'Казань',
    address: 'ул. Баумана, д. 50',
    coordinates: { lat: 55.8304, lng: 49.0661 },
    type: 'mixed',
    amenities: ['Парковка', 'Душевые', 'Сауна'],
    phone: '+7 (843) 555-12-34',
    workingHours: 'Пн-Вс: 07:00-23:00',
    description: 'Крытые и открытые корты для падела в центре Казани.',
    prices: [
      { time: '09:00 – 18:00', weekday: 1200, weekend: 1500 },
      { time: '18:00 – 23:00', weekday: 2000, weekend: 2500 },
    ],
    image: '/images/courts/placeholder.jpg',
    source: 'manual',
    slug: 'padel-point-kazan',
  },
  {
    name: 'Padel Pro Сочи',
    city: 'Сочи',
    address: 'Курортный проспект, д. 10',
    coordinates: { lat: 43.5855, lng: 39.7231 },
    type: 'outdoor',
    amenities: ['Парковка', 'Душевые', 'Бассейн', 'Кафе'],
    phone: '+7 (862) 111-22-33',
    workingHours: 'Пн-Вс: 08:00-22:00',
    description: 'Падел-корты на побережье Черного моря с прекрасным видом.',
    prices: [
      { time: '09:00 – 18:00', weekday: 2000, weekend: 2500 },
      { time: '18:00 – 22:00', weekday: 3000, weekend: 3500 },
    ],
    image: '/images/courts/placeholder.jpg',
    source: 'manual',
    slug: 'padel-pro-sochi',
  },
  {
    name: 'Padel Center Екатеринбург',
    city: 'Екатеринбург',
    address: 'ул. Ленина, д. 25',
    coordinates: { lat: 56.8389, lng: 60.6057 },
    type: 'indoor',
    amenities: ['Парковка', 'Душевые', 'Раздевалка'],
    phone: '+7 (343) 444-55-66',
    workingHours: 'Пн-Вс: 06:00-23:00',
    description: 'Крытые корты для падела с профессиональным освещением.',
    prices: [
      { time: '09:00 – 18:00', weekday: 1500, weekend: 2000 },
      { time: '18:00 – 23:00', weekday: 2500, weekend: 3000 },
    ],
    image: '/images/courts/placeholder.jpg',
    source: 'manual',
    slug: 'padel-center-ekb',
  },
];

async function seedCourts() {
  console.log('🌱 Запуск сидинга падел-кортов...\n');

  let added = 0;
  for (const court of sampleCourts) {
    try {
      await prisma.court.upsert({
        where: { slug: court.slug },
        update: court,
        create: court,
      });
      console.log(`  ✅ ${court.name} (${court.city})`);
      added++;
    } catch (error: any) {
      console.error(`  ❌ Ошибка при добавлении ${court.name}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 ИТОГИ:`);
  console.log(`  Добавлено/обновлено: ${added}`);
  console.log(`  Всего в БД: ${await prisma.court.count()}`);
  console.log('='.repeat(50));
}

seedCourts()
  .then(() => {
    console.log('\n✅ Сидинг завершен!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  });