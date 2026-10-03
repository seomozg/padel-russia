import {
  describeTranslationError,
  hasCyrillic,
  isRetryableTranslationError,
  isSuccessfulTranslation,
  needsTranslation,
} from './translation-utils';

describe('hasCyrillic / needsTranslation', () => {
  it('распознаёт русский текст', () => {
    expect(hasCyrillic('Привет, мир')).toBe(true);
    expect(hasCyrillic('КОРТ')).toBe(true);
    expect(needsTranslation('Привет')).toBe(false);
  });

  it('французский/английский — нужен перевод', () => {
    expect(hasCyrillic('Rotterdam P2 : place aux quarts')).toBe(false);
    expect(needsTranslation('Rotterdam P2 : place aux quarts')).toBe(true);
    expect(hasCyrillic('')).toBe(false);
    expect(hasCyrillic(null)).toBe(false);
  });
});

describe('isSuccessfulTranslation', () => {
  it('провал: переводчик вернул оригинал (без кириллицы)', () => {
    expect(isSuccessfulTranslation('Championnats de France', 'Championnats de France')).toBe(false);
  });

  it('провал: результат пустой', () => {
    expect(isSuccessfulTranslation('текст', '')).toBe(false);
    expect(isSuccessfulTranslation('текст', null)).toBe(false);
  });

  it('успех: кириллица и текст изменился', () => {
    expect(
      isSuccessfulTranslation('Championnats de France', 'Чемпионат Франции: сетки определены')
    ).toBe(true);
  });
});

describe('isRetryableTranslationError / describeTranslationError', () => {
  it('402 не ретраится — это отсутствие баланса', () => {
    expect(isRetryableTranslationError(402)).toBe(false);
    expect(describeTranslationError(402)).toContain('баланс');
  });

  it('429/5xx и сетевые ошибки ретраятся', () => {
    expect(isRetryableTranslationError(429)).toBe(true);
    expect(isRetryableTranslationError(503)).toBe(true);
    expect(isRetryableTranslationError(undefined)).toBe(true);
    expect(isRetryableTranslationError(401)).toBe(false);
  });

  it('человекочитаемые сообщения', () => {
    expect(describeTranslationError(401)).toContain('DEEPSEEK_API_KEY');
    expect(describeTranslationError(500)).toContain('HTTP 500');
    expect(describeTranslationError(undefined)).toContain('сетевая');
  });
});