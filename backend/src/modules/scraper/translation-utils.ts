// Чистые функции для работы с переводом новостей — используются
// scripts/translate-articles.ts и src/modules/scraper/news-scraper.ts,
// покрыты юнит-тестами (translation-utils.test.ts).

/** Есть ли кириллица (сигнал «текст на русском»). */
export function hasCyrillic(text: string | null | undefined): boolean {
  return /[а-яё]/i.test(text || '');
}

/** Нужен ли перевод (текст не на русском). */
export function needsTranslation(text: string | null | undefined): boolean {
  return !hasCyrillic(text);
}

/**
 * Успешен ли перевод: результат содержит кириллицу И отличается от оригинала.
 * При ошибке API переводчик возвращает оригинал — такой «перевод» провален.
 */
export function isSuccessfulTranslation(
  original: string | null | undefined,
  result: string | null | undefined
): boolean {
  const originalText = (original || '').trim();
  const resultText = (result || '').trim();
  if (!resultText) return false;
  if (resultText === originalText) return false;
  return hasCyrillic(resultText);
}

/** Ошибку которой есть смысл повторять (сеть / rate-limit / сервер), но не 402 «нет баланса». */
export function isRetryableTranslationError(status: number | undefined): boolean {
  if (status === undefined) return true; // сетевая ошибка, таймаут
  if (status === 402) return false; // нет баланса — повтор бессмысленен
  if (status === 401) return false; // невалидный ключ
  return status === 429 || status >= 500;
}

/** Человекочитаемое сообщение об ошибке перевода. */
export function describeTranslationError(status: number | undefined): string {
  if (status === 402) {
    return 'баланс DeepSeek исчерпан (402) — пополните аккаунт, статьи будут переведены при следующем запуске';
  }
  if (status === 401) return 'невалидный DEEPSEEK_API_KEY (401)';
  if (status === 429) return 'слишком много запросов (429), повтор позже';
  if (status !== undefined) return `ошибка перевода (HTTP ${status})`;
  return 'сетевая ошибка при обращении к переводчику';
}