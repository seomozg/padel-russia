import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import {
  describeTranslationError,
  hasCyrillic,
  isRetryableTranslationError,
  isSuccessfulTranslation,
} from '../src/modules/scraper/translation-utils';

const prisma = new PrismaClient();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Повторы только при сетевых ошибках / 429 / 5xx. 402 (нет баланса) не повторяем.
const RETRY_DELAYS_MS = [0, 3000, 8000];

async function translateWithDeepSeek(text: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    console.log('  ⚠️ DeepSeek API ключ не найден (DEEPSEEK_API_KEY в .env)');
    return text;
  }

  let lastStatus: number | undefined;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                'Ты профессиональный переводчик. Переведи текст на русский язык. Верни только чистый перевод без пояснений.',
            },
            { role: 'user', content: text },
          ],
          max_tokens: 3000,
          temperature: 0.3,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          timeout: 60000,
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (content) return content;
      lastStatus = undefined;
      if (attempt < RETRY_DELAYS_MS.length - 1) {
        console.log('   ↻ Пустой ответ от API, повтор...');
      }
    } catch (error: any) {
      lastStatus = error.response?.status;
      if (!isRetryableTranslationError(lastStatus)) {
        break; // 402/401 — повторять бессмысленно
      }
      if (attempt < RETRY_DELAYS_MS.length - 1) {
        console.log(
          `   ↻ ${describeTranslationError(lastStatus)}, повтор через ${RETRY_DELAYS_MS[attempt + 1]} мс...`
        );
      }
    }
  }

  console.error(`  ❌ ${describeTranslationError(lastStatus)}`);
  return text; // оригинал — вызывающий код отличит провал по isSuccessfulTranslation
}

async function translateArticles() {
  console.log('🔄 Начинаю перевод статей на русский...\n');

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY не задан — перевод невозможен.');
    process.exit(1);
  }

  const articles = await prisma.article.findMany({
    where: { content: { not: '' } },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      published: true,
    },
  });

  console.log(`📊 Найдено статей в базе: ${articles.length}\n`);

  let translated = 0;
  let hidden = 0;
  let failed = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    if (hasCyrillic(article.content)) {
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${articles.length}] Перевожу: ${article.title.substring(0, 60)}...`);

    const titleRu = await translateWithDeepSeek(article.title);
    const contentRu = await translateWithDeepSeek(article.content);
    const excerptRu = hasCyrillic(article.excerpt)
      ? article.excerpt
      : await translateWithDeepSeek(article.excerpt);

    if (isSuccessfulTranslation(article.content, contentRu)) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          title: titleRu,
          content: contentRu,
          excerpt: excerptRu.substring(0, 300),
          published: true, // после успешного перевода — публикуем
        },
      });
      translated++;
      console.log('  ✅ Переведено и опубликовано');
    } else {
      // Перевод не удался (например, 402 — исчерпан баланс):
      // прячем статью с русскоязычного сайта до перевода.
      await prisma.article.update({
        where: { id: article.id },
        data: { published: false },
      });
      hidden++;
      failed++;
      failures.push(article.title.substring(0, 80));
      console.log('  ⛔ Перевод не удался — статья скрыта до перевода');
    }

    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГИ ПЕРЕВОДА:');
  console.log(`  Переведено статей: ${translated}`);
  console.log(`  Уже на русском (пропущено): ${skipped}`);
  console.log(`  Скрыто с сайта до перевода: ${hidden}`);
  console.log(`  Не удалось: ${failed}`);
  if (failed > 0) {
    console.log('  ⚠️ Не удалось перевести — проверьте БАЛАНС DEEPSEEK_API_KEY (ошибка 402)');
    console.log('  ⚠️ После пополнения баланса запустите scripts/translate-articles.ts — статьи будут переведены и опубликованы.');
    failures.slice(0, 5).forEach(t => console.log(`   • ${t}`));
    if (failures.length > 5) console.log(`   ... и ещё ${failures.length - 5}`);
  }
  console.log('='.repeat(50));

  const remaining = await prisma.article.findMany({
    where: { content: { not: '' } },
    select: { content: true, published: true },
  });
  const withoutRu = remaining.filter(a => !hasCyrillic(a.content));
  const visibleWithoutRu = withoutRu.filter(a => a.published);

  console.log(`\n🔍 КОНТРОЛЬ: без перевода: ${withoutRu.length} (видно на сайте: ${visibleWithoutRu.length})`);
  if (visibleWithoutRu.length > 0) {
    console.log('  ⚠️ На сайте есть непереведённые статьи — они должны быть скрыты!');
  }

  await prisma.$disconnect();
}

translateArticles()
  .then(() => {
    console.log('\n✅ Перевод завершен!');
    process.exit(0);
  })
  .catch(async error => {
    console.error('❌ Ошибка:', error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });