// Поиск и парсинг новых падел-клубов из безключевых каталогов.
// Источники (проверены 29.09.2026):
//   1. PadelMesh  — листинг с data-атрибутами, страница клуба с JSON-LD.
//   2. МячМяч     — карточки клубов городской страницы + JSON-LD.
//   3. Федерация  — federationpadel.ru/addresses, аккордеоны Tilda.
//
// Реализация разбита по модулям в папке discovery/ (SRP: один файл — одна
// ответственность):
//   types.ts      — общие типы (CourtCandidate, ParseWarning);
//   normalize.ts  — телефоны, часы, типы, удобства, URL картинок, slug;
//   city.ts       — извлечение/очистка названий городов;
//   jsonld.ts     — разбор JSON-LD (Schema.org) со страниц клубов;
//   padelmesh.ts, myachmyach.ts, federation.ts — парсеры источников;
//   dedupe.ts     — дедупликация против каталога (имя/город/координаты);
//   candidate.ts  — сборка записи для prisma.court.create.
// Здесь — единая точка входа. Чистые функции покрыты court-discovery.test.ts.
export * from './discovery';
