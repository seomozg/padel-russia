import {
  DEFAULT_COORDINATES,
  buildGeocodeQuery,
  cityMatches,
  isDefaultCoordinates,
  normalizeCoordinates,
} from './geocode-utils';

describe('normalizeCoordinates', () => {
  it('parses plain object', () => {
    expect(normalizeCoordinates({ lat: 45.0448, lng: 38.976 })).toEqual({
      lat: 45.0448,
      lng: 38.976,
    });
  });

  it('parses single-encoded JSON string', () => {
    expect(normalizeCoordinates('{"lat":59.93,"lng":30.33}')).toEqual({
      lat: 59.93,
      lng: 30.33,
    });
  });

  it('parses double-encoded JSON string (исторический формат БД)', () => {
    const raw = JSON.stringify('{"lat":55.8304,"lng":49.0661}');
    expect(normalizeCoordinates(raw)).toEqual({ lat: 55.8304, lng: 49.0661 });
  });

  it('returns null for garbage', () => {
    expect(normalizeCoordinates('not json')).toBeNull();
    expect(normalizeCoordinates(null)).toBeNull();
    expect(normalizeCoordinates(42)).toBeNull();
    expect(normalizeCoordinates({ lat: 'abc', lng: 1 })).toBeNull();
  });

  it('returns null for out-of-range values', () => {
    expect(normalizeCoordinates({ lat: 120, lng: 30 })).toBeNull();
    expect(normalizeCoordinates({ lat: 45, lng: 200 })).toBeNull();
  });
});

describe('isDefaultCoordinates', () => {
  it('detects Moscow-center fallback', () => {
    expect(
      isDefaultCoordinates({ lat: DEFAULT_COORDINATES.lat, lng: DEFAULT_COORDINATES.lng })
    ).toBe(true);
  });

  it('accepts real coordinates', () => {
    expect(isDefaultCoordinates({ lat: 43.5854, lng: 39.723 })).toBe(false);
  });

  it('treats broken/missing coordinates as needing geocoding', () => {
    expect(isDefaultCoordinates(null)).toBe(true);
    expect(isDefaultCoordinates('oops')).toBe(true);
  });
});

describe('buildGeocodeQuery', () => {
  it('joins address, city and country', () => {
    expect(buildGeocodeQuery('ул. Ленина, 1', 'Сочи')).toBe(
      'ул. Ленина, 1, Сочи, Россия'
    );
  });

  it('skips empty parts', () => {
    expect(buildGeocodeQuery('', 'Казань')).toBe('Казань, Россия');
  });
});

describe('cityMatches', () => {
  it('matches when city is contained in display name', () => {
    expect(
      cityMatches('ул. Академика Парина, 16/3, Екатеринбург, Россия', 'Екатеринбург')
    ).toBe(true);
  });

  it('matches by address details from Nominatim', () => {
    expect(
      cityMatches('Курортный район, Сочи, Россия', 'Сочи', { city: 'Сочи' })
    ).toBe(true);
  });

  it('rejects different city', () => {
    expect(cityMatches('ул. Ленина, Омск, Россия', 'Казань')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(cityMatches('Пермь, Россия', 'ПЕРМЬ')).toBe(true);
  });

  it('treats ё as е', () => {
    expect(cityMatches('город Орёл, Россия', 'орел')).toBe(true);
    expect(cityMatches('Салехард, Россия', 'салехард')).toBe(true);
  });
});