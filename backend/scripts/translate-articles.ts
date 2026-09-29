// Polyfill File для Node 18 (глобал File добавлен в Node 20)
if (typeof File === 'undefined') {
  (global as any).File = class File {
    constructor(public bits: any[], public name: string, public options?: any) {}
  };
}

import 'dotenv/config';
import axios from 'axios';
import { prisma } from '../src/config/database';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function translateWithDeepSeek(text: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    console.log('  ⚠️ DeepSeek API ключ не найден');
    return text;
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Ты профессиональный переводчик. Переведи текст на русский язык. Сохрани стиль и смысл оригинала. Верни только перевод.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    return response.data.choices[0]?.message?.content || text;
  } catch (error: any) {
    console.error(`  ❌ Ошибка перевода: ${error.message}`);
    return text;
  }
}

async function main() {
  console.log('🌐 Перевод существующих статей на русский язык...\n');

  // Получаем статьи, у которых content короче 500 символов (скорее всего без перевода)
  const articles = await prisma.article.findMany({
    where: {
      content: { not: '' },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Найдено статей: ${articles.length}\n`);

  let translated = 0;
  for (const article of articles) {
    // Пропускаем, если уже переведено (содержит кириллицу)
    if (/[а-яё]/.test(article.content)) {
      console.log(`  ⏭️ Уже на русском: ${article.title?.substring(0, 60)}`);
      continue;
    }

    console.log(`  🔄 Перевод: ${article.title?.substring(0, 60)}...`);

    const titleRu = await translateWithDeepSeek(article.title || '');
    const contentRu = await translateWithDeepSeek(article.content || '');
    const excerptRu = article.excerpt
      ? await translateWithDeepSeek(article.excerpt)
      : '';

    await prisma.article.update({
      where: { id: article.id },
      data: {
        title: titleRu,
        content: contentRu,
        excerpt: excerptRu || contentRu.substring(0, 200),
      },
    });

    translated++;
    console.log(`  ✅ Переведено: ${titleRu?.substring(0, 60)}`);
  }

  console.log(`\n==================================================`);
  console.log(`📊 ИТОГИ ПЕРЕВОДА:`);
  console.log(`  Переведено статей: ${translated}`);
  console.log(`==================================================\n`);

  // Контроль: если статьи остались без кириллицы — перевод не прошёл
  // (типичная причина: 401 от DeepSeek → невалидный DEEPSEEK_API_KEY в .env)
  const all = await prisma.article.findMany({
    where: { content: { not: '' } },
    select: { title: true, content: true },
  });
  const untranslated = all.filter((article) => !/[а-яё]/.test(article.content));
  if (untranslated.length > 0) {
    console.log(`⚠️ Не переведено статей: ${untranslated.length}`);
    console.log('   Проверьте DEEPSEEK_API_KEY (в логе выше будут «Ошибка перевода: 401»)');
    console.log(`   Пример: «${(untranslated[0].title || '').substring(0, 60)}»\n`);
  }

  console.log('✅ Перевод завершен!');
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Ошибка:', error);
  prisma.$disconnect();
  process.exit(1);
});