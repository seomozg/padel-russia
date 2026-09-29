import {
  canonicalHoursFromListing,
  canonicalHoursFromSchema,
  candidateToCourtData,
  cityFromMeta,
  dedupeCandidate,
  inferType,
  mapAmenities,
  normalizePhone,
  parseFederationAddresses,
  parseMyachmyachCity,
  parseMyachmyachClub,
  parsePadelmeshClub,
  parsePadelmeshListing,
  slugify,
  uniqueSlug,
  CourtCandidate,
  ExistingCourt,
} from './court-discovery';

// Фикстуры — вырезаны из реальных страниц (29.09.2026)
const PADELMESH_LISTING_HTML = `
<ul>
  <li data-balloon-tags="[&quot;6 кортов&quot;,&quot;Крытый&quot;]" data-city="Ярославль"
      data-club-url="/ru/ru/yaroslavl/clubs/go-padel-live" data-filter-court_types="indoor"
      data-filter-working_hours="{&quot;Mon&quot;:&quot;08:00-00:00&quot;,&quot;Tue&quot;:&quot;08:00-00:00&quot;,&quot;Wed&quot;:&quot;08:00-00:00&quot;,&quot;Thu&quot;:&quot;08:00-00:00&quot;,&quot;Fri&quot;:&quot;08:00-00:00&quot;,&quot;Sat&quot;:&quot;08:00-00:00&quot;,&quot;Sun&quot;:&quot;08:00-00:00&quot;}"
      data-latitude="57.64815592" data-longitude="39.85141644" data-name="Go Padel"
      data-photo-url="https://images.padelmesh.com/uploads/club_photos/22106/file/small/google-maps-image__1_.jpg">
    <div class="club">Go Padel</div>
  </li>
  <li data-city="Самара" data-club-url="/ru/ru/samara/clubs/pulse-padel"
      data-filter-court_types="indoor,outdoor" data-latitude="53.19" data-longitude="50.10"
      data-name="Pulse Padel" data-balloon-tags="[&quot;3 корта&quot;]"></li>
</ul>`;

const PADELMESH_CLUB_HTML = `
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"SportsActivityLocation","name":"Go Padel",
   "description":"Go Padel — падел-клуб с 6 панорамными кортами.",
   "image":["https://images.padelmesh.com/uploads/club_photos/22106/file/large/x.jpg"],
   "address":{"@type":"PostalAddress","streetAddress":"пр. Октября, 78, г. Ярославль","addressLocality":"Ярославль","addressCountry":"RU"},
   "telephone":"+7 485 259 30 83",
   "amenityFeature":[
     {"@type":"LocationFeatureSpecification","name":"Душ","value":true},
     {"@type":"LocationFeatureSpecification","name":"Бесплатная парковка","value":true},
     {"@type":"LocationFeatureSpecification","name":"Прокат инвентаря","value":true}],
   "openingHoursSpecification":[
     {"@type":"OpeningHoursSpecification","dayOfWeek":"https://schema.org/Monday","opens":"08:00","closes":"00:00"},
     {"@type":"OpeningHoursSpecification","dayOfWeek":"https://schema.org/Saturday","opens":"09:00","closes":"18:00"}]},
  {"@type":"BreadcrumbList","name":"Главная"}
]}
</script>`;

const MYACHMYACH_CITY_HTML = `
<div class="clubs-grid" id="clubs-grid">
  <div class="club-card">
    <a href="/club-padelsquash" class="club-logo-link" aria-label="Padel&Squashclub">
      <img class="club-logo" src="assets/logos/padelsquash.jpg" alt="">
    </a>
    <div class="club-info">
      <a href="/club-padelsquash" class="club-name-link">
        <div class="club-name">Padel&Squashclub</div>
      </a>
      <div class="club-meta">Свердловская область, Екатеринбург</div>
    </div>
  </div>
</div>`;

const MYACHMYACH_CLUB_HTML = `
<script type="application/ld+json">
{"@context":"https://schema.org","@type":["SportsClub","SportsActivityLocation"],
 "name":"Padel&Squashclub",
 "address":{"@type":"PostalAddress","addressLocality":"Екатеринбург","addressCountry":"RU",
            "streetAddress":"Свердловская область, Екатеринбург, улица Тверитина, 45"},
 "telephone":"+79090000916",
 "url":"https://padel.myachmyach.ru/club-padelsquash"}
</script>
<img class="club-logo" src="assets/logos/padelsquash.jpg" alt="Логотип">`;

const FEDERATION_HTML = `
<div class="t849__wrapper">
  <div class="t849__header"><button type="button">
    <span class="t849__title">Санкт-Петербург - ШАНС АРЕНА</span></button></div>
  <div class="t849__content"><div class="t849__textwrapper">
    <img class="t849__img" src="https://static.tildacdn.com/-/empty/img.jpg" data-original="https://static.tildacdn.com/tild6237/img_5089.jpg">
    <div class="t849__text"><strong>Адрес:</strong><br />ул. Грибалёвой, д.9, к.2 <br /> Телефон: 8 (812) 777-11-77<br /><br /><strong>Контактное лицо:</strong><br />---<br /><br /><strong>Описание:</strong><br />ШАНС АРЕНА Корт для игры в Падел.</div>
  </div></div>
</div>
<div class="t849__wrapper">
  <div class="t849__header"><button type="button">
    <span class="t849__title">Мурманск</span></button></div>
  <div class="t849__content"><div class="t849__textwrapper">
    <div class="t849__text"><strong>Адрес:</strong><br />г. Мурманск ул. Ленина 111 <br /> Телефон: +7 911 307 79 44</div>
  </div></div>
</div>`;

describe('parsePadelmeshListing', () => {
  it('парсит data-атрибуты карточек (координаты, часы, тип, фото)', () => {
    const items = parsePadelmeshListing(PADELMESH_LISTING_HTML);
    expect(items).toHaveLength(2);

    const goPadel = items[0];
    expect(goPadel.name).toBe('Go Padel');
    expect(goPadel.city).toBe('Ярославль');
    expect(goPadel.sourceUrl).toBe('https://padelmesh.com/ru/ru/yaroslavl/clubs/go-padel-live');
    expect(goPadel.coordinates).toEqual({ lat: 57.64815592, lng: 39.85141644 });
    expect(goPadel.type).toBe('indoor');
    expect(goPadel.courtsCount).toBe(6);
    expect(goPadel.workingHours).toBe(
      'понедельник: 08:00–00:00, вторник: 08:00–00:00, среда: 08:00–00:00, четверг: 08:00–00:00, пятница: 08:00–00:00, суббота: 08:00–00:00, воскресенье: 08:00–00:00'
    );
    expect(goPadel.image).toContain('/large/');
  });

  it('«indoor,outdoor» → mixed', () => {
    const items = parsePadelmeshListing(PADELMESH_LISTING_HTML);
    expect(items[1].type).toBe('mixed');
    expect(items[1].workingHours).toBeNull();
  });
});

describe('parsePadelmeshClub (JSON-LD)', () => {
  it('извлекает адрес, телефон, описание, удобства и часы', () => {
    const details = parsePadelmeshClub(PADELMESH_CLUB_HTML);
    expect(details).toBeTruthy();
    expect(details!.address).toBe('пр. Октября, 78, г. Ярославль');
    expect(details!.phone).toBe('+7 (485) 259-30-83');
    expect(details!.description).toContain('6 панорамными кортами');
    expect(details!.image).toContain('/large/');
    expect(details!.amenities).toEqual(['Душевые', 'Парковка', 'Прокат ракеток']);
    expect(details!.workingHours).toBe('понедельник: 08:00–00:00, суббота: 09:00–18:00');
  });

  it('возвращает null без JSON-LD', () => {
    expect(parsePadelmeshClub('<html><body>нет данных</body></html>')).toBeNull();
  });
});

describe('parseMyachmyachCity / parseMyachmyachClub', () => {
  it('карточки городской страницы', () => {
    const cards = parseMyachmyachCity(MYACHMYACH_CITY_HTML);
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Padel&Squashclub');
    expect(cards[0].url).toBe('https://padel.myachmyach.ru/club-padelsquash');
    expect(cityFromMeta(cards[0].meta)).toBe('Екатеринбург');
  });

  it('JSON-LD клуба + логотип по абсолютному URL', () => {
    const details = parseMyachmyachClub(MYACHMYACH_CLUB_HTML);
    expect(details).toBeTruthy();
    expect(details!.name).toBe('Padel&Squashclub');
    expect(details!.city).toBe('Екатеринбург');
    expect(details!.address).toContain('Тверитина, 45');
    expect(details!.phone).toBe('+7 (909) 000-09-16');
    expect(details!.image).toBe('https://padel.myachmyach.ru/assets/logos/padelsquash.jpg');
  });
});

describe('parseFederationAddresses', () => {
  it('разбирает «Город - Название»: адрес, телефон, описание, фото', () => {
    const entries = parseFederationAddresses(FEDERATION_HTML);
    expect(entries).toHaveLength(2);

    const chance = entries[0];
    expect(chance.city).toBe('Санкт-Петербург');
    expect(chance.name).toBe('ШАНС АРЕНА');
    expect(chance.address).toBe('ул. Грибалёвой, д.9, к.2');
    expect(chance.phone).toBe('+7 (812) 777-11-77');
    expect(chance.description).toContain('ШАНС АРЕНА');
    expect(chance.image).toBe('https://static.tildacdn.com/tild6237/img_5089.jpg');
  });

  it('заголовок без названия клуба → name = null', () => {
    const entries = parseFederationAddresses(FEDERATION_HTML);
    expect(entries[1].city).toBe('Мурманск');
    expect(entries[1].name).toBeNull();
    expect(entries[1].address).toBe('г. Мурманск ул. Ленина 111');
  });
});

describe('конвертеры значений', () => {
  it('normalizePhone: 11 цифр через 8 → +7 (XXX) XXX-XX-XX', () => {
    expect(normalizePhone('8 (812) 777-11-77')).toBe('+7 (812) 777-11-77');
    expect(normalizePhone('+79090000916')).toBe('+7 (909) 000-09-16');
    expect(normalizePhone('  +7 911 307 79 44 ')).toBe('+7 (911) 307-79-44');
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('нет телефона')).toBe('нет телефона');
  });

  it('canonicalHoursFromListing: битый JSON → null, Closed пропускается', () => {
    expect(canonicalHoursFromListing('не json')).toBeNull();
    expect(canonicalHoursFromListing(null)).toBeNull();
    expect(canonicalHoursFromListing('{"Mon":"Closed","Tue":"10:00-22:00"}')).toBe(
      'вторник: 10:00–22:00'
    );
  });

  it('canonicalHoursFromSchema: URL дней недели и списки дней', () => {
    expect(
      canonicalHoursFromSchema([
        { dayOfWeek: 'https://schema.org/Monday', opens: '08:00', closes: '00:00' },
        {
          dayOfWeek: ['https://schema.org/Saturday', 'https://schema.org/Sunday'],
          opens: '09:00',
          closes: '18:00',
        },
      ])
    ).toBe('понедельник: 08:00–00:00, суббота: 09:00–18:00, воскресенье: 09:00–18:00');
  });

  it('mapAmenities маппит на значения из БД', () => {
    expect(
      mapAmenities([{ name: 'Душ' }, { name: 'Бесплатная парковка' }, { name: 'Бар' }])
    ).toEqual(['Душевые', 'Парковка', 'Кафе']);
  });

  it('inferType и slugify', () => {
    expect(inferType('indoor')).toBe('indoor');
    expect(inferType('outdoor')).toBe('outdoor');
    expect(inferType('indoor,outdoor')).toBe('mixed');
    expect(inferType(null)).toBe('mixed');
    expect(slugify('Падел Клуб «WIN WIN»')).toBe('падел-клуб-win-win');
  });
});

describe('dedupeCandidate', () => {
  const existing: ExistingCourt[] = [
    {
      slug: 'go-padel',
      name: 'Go Padel',
      city: 'Ярославль',
      sourceUrl: 'https://padelmesh.com/ru/ru/yaroslavl/clubs/go-padel-live',
      coordinates: { lat: 57.64815592, lng: 39.85141644 },
    },
    {
      slug: 'padel-friends',
      name: 'Padel Friends Лужники',
      city: 'Москва',
      sourceUrl: null,
      coordinates: { lat: 55.7155, lng: 37.5575 },
    },
  ];

  const base: CourtCandidate = {
    source: 'padelmesh',
    sourceUrl: 'https://padelmesh.com/ru/ru/x/clubs/y',
    name: 'Другой клуб',
    city: 'Ярославль',
    address: null,
    coordinates: { lat: 57.6, lng: 39.8 },
    type: 'mixed',
    phone: null,
    workingHours: null,
    description: null,
    image: null,
    amenities: [],
    courtsCount: null,
  };

  it('совпадение sourceUrl → duplicate', () => {
    const result = dedupeCandidate(existing, {
      ...base,
      sourceUrl: 'https://padelmesh.com/ru/ru/yaroslavl/clubs/go-padel-live',
      name: 'Совсем другое имя',
    });
    expect(result).toMatchObject({ status: 'duplicate', reason: 'sourceUrl' });
  });

  it('название+город (включая вхождение) → duplicate', () => {
    expect(dedupeCandidate(existing, { ...base, name: 'Go Padel', city: 'Ярославль' }).reason).toBe(
      'nameCity'
    );
    expect(
      dedupeCandidate(existing, { ...base, name: 'Padel Friends', city: 'Москва' }).reason
    ).toBe('nameCity');
  });

  it('координаты ближе 200 м → duplicate по nearCoords', () => {
    const result = dedupeCandidate(existing, {
      ...base,
      name: 'Совсем другое название',
      city: 'Ярославль',
      coordinates: { lat: 57.6487, lng: 39.8514 },
    });
    expect(result).toMatchObject({ status: 'duplicate', reason: 'nearCoords' });
  });

  it('разные данные → new', () => {
    const result = dedupeCandidate(existing, {
      ...base,
      name: 'Совсем другое название',
      city: 'Казань',
      coordinates: { lat: 55.79, lng: 49.18 },
    });
    expect(result.status).toBe('new');
  });
});

describe('candidateToCourtData', () => {
  it('запись в формате каталога: prices=[], slug уникален, описание-шаблон', () => {
    const used = new Set<string>(['go-padel']);
    const candidate: CourtCandidate = {
      source: 'padelmesh',
      sourceUrl: 'https://padelmesh.com/ru/ru/kl/clubs/go-padel-2',
      name: 'Go Padel',
      city: 'Калуга',
      address: 'ул. Ленина, 1',
      coordinates: { lat: 54.5, lng: 36.2 },
      type: 'indoor',
      phone: '+7 (484) 111-22-33',
      workingHours: 'понедельник: 09:00–22:00',
      description: null,
      image: null,
      amenities: ['Парковка'],
      courtsCount: 4,
    };

    const data = candidateToCourtData(candidate, {
      imagePath: '/images/court-placeholder.svg',
      usedSlugs: used,
    });

    expect(data.slug).toBe('go-padel-2');
    expect(data.prices).toEqual([]);
    expect(data.rating).toBe(0);
    expect(data.image).toBe('/images/court-placeholder.svg');
    expect(data.courtsCount).toBe(4);
    expect(data.source).toBe('padelmesh');
    expect(data.description).toBe('Падел-клуб «Go Padel» в городе Калуга.');

    const second = candidateToCourtData(candidate, {
      imagePath: '/images/court-placeholder.svg',
      usedSlugs: used,
    });
    // base занят → суффиксы идут по базе: go-padel-2 уже взят → go-padel-3
    expect(second.slug).toBe('go-padel-3');
    expect(uniqueSlug('go-padel', used)).toBe('go-padel-4');
  });
});