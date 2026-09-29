import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../config/database';

// RSS ленты для парсинга (проверено 29.09.2026)
// Мёртвые источники удалены:
//   - World Padel Tour: feed отдаёт 404 «Servicio no encontrado» + сломанный TLS-сертификат
//   - Padel Intelligent: 403 (Cloudflare блокирует запросы)
//   - Padel Alto: живой, но обновлялся до 06.12.2025 — оставлен на будущее
const RSS_FEEDS = [
  {
    url: 'https://padelmagazine.fr/feed/',
    name: 'Padel Magazine',
    category: 'Новости',
  },
  {
    url: 'https://www.thepadelpaper.com/feed/',
    name: 'The Padel Paper',
    category: 'Турниры',
  },
  {
    url: 'https://padelalto.com/feed/',
    name: 'Padel Alto',
    category: 'Новости',
  },
];

// Полный User-Agent: без него часть сайтов (WordPress/Cloudflare) отдаёт 403
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Изображение-заглушка для статей без картинки (файл лежит в public/images/news/)
const NEWS_PLACEHOLDER_IMAGE = '/images/news/placeholder.svg';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Генерация slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

// Перевод через DeepSeek
async function translateWithDeepSeek(text: string, targetLang: string = 'ru'): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    console.log('  ⚠️ DeepSeek API ключ не найден, возвращаю оригинал');
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
            content: `Ты профессиональный переводчик и редактор. Твоя задача:
1. Перевести текст на русский язык (если он не на русском)
2. Удалить весь мусор: навигацию, подписки, соцсети, GTM коды, iframe, "next article", "Latest news", "FOLLOW", "Share", и т.п.
3. Оставить только основной содержательный контент статьи
4. Сохранить стиль и смысл оригинала

Верни только чистый перевод статьи без лишних элементов.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0]?.message?.content || text;
  } catch (error: any) {
    console.error(`  ❌ Ошибка перевода: ${error.message}`);
    return text;
  }
}

// Скачивание изображения
async function downloadImage(url: string, filename: string): Promise<string | null> {
  try {
    const imagesDir = path.join(process.cwd(), 'public', 'images', 'news');
    
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filePath = path.join(imagesDir, filename);
    
    if (fs.existsSync(filePath)) {
      return `/images/news/${filename}`;
    }

    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': BROWSER_UA,
      },
    });

    fs.writeFileSync(filePath, response.data);
    console.log(`  📷 Скачано изображение: ${filename}`);
    
    return `/images/news/${filename}`;
  } catch (error) {
    return null;
  }
}

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date | null;
  image: string;
}

/**
 * Чистая функция разбора RSS/Atom XML в массив элементов.
 * Не ходит в сеть — покрыта unit-тестом (news-scraper.test.ts).
 */
export function parseRssItems(xml: string): RssItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RssItem[] = [];

  $('item, entry').each((_, item) => {
    const title = $(item).find('title').first().text().trim();

    // RSS: <link>текст</link>, Atom: <link href="..."/>
    const linkNode = $(item).find('link').first();
    const link = linkNode.text().trim() || linkNode.attr('href') || '';

    const description =
      $(item).find('description').first().text() ||
      $(item).find('summary').first().text() ||
      '';
    const pubDateRaw =
      $(item).find('pubDate').first().text() ||
      $(item).find('published').first().text() ||
      $(item).find('updated').first().text();

    // Поиск изображения в различных форматах
    let image = '';

    // Media namespace
    const mediaContent = $(item).find('media\\:content, media\\:thumbnail').first();
    if (mediaContent.attr('url')) {
      image = mediaContent.attr('url') || '';
    }

    // Enclosure
    if (!image) {
      const enclosure = $(item).find('enclosure').first();
      if (enclosure.attr('url') && (enclosure.attr('type') || '').startsWith('image/')) {
        image = enclosure.attr('url') || '';
      }
    }

    // Content:encoded → первый <img>
    const contentEncoded = $(item).find('content\\:encoded').first().text();
    if (!image && contentEncoded) {
      const imgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        image = imgMatch[1];
      }
    }

    // Description → первый <img>
    if (!image && description) {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        image = imgMatch[1];
      }
    }

    items.push({
      title,
      link,
      description: description.replace(/<[^>]*>/g, '').trim().substring(0, 300),
      pubDate: pubDateRaw ? new Date(pubDateRaw) : null,
      image,
    });
  });

  // Элементы без заголовка или ссылки бесполезны: на них падала бы дедупликация
  return items.filter((item) => item.title && item.link);
}

// Парсинг RSS ленты (сеть + parseRssItems)
async function parseRSSFeed(feedUrl: string): Promise<RssItem[]> {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    return parseRssItems(response.data);
  } catch (error: any) {
    console.error(`  ❌ Ошибка парсинга RSS ${feedUrl}: ${error.message}`);
    return [];
  }
}

// Очистка текста от мусора
function cleanContent(text: string): string {
  return text
    // Удаляем iframe, script, style и их содержимое
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Удаляем HTML теги
    .replace(/<[^>]+>/g, ' ')
    // Удаляем GTM и аналитику
    .replace(/googletagmanager\.com[\s\S]*?\/iframe>/gi, '')
    .replace(/GTM-[A-Z0-9]+/gi, '')
    // Удаляем типичный мусор
    .replace(/FOLLOW PADELALTO:/gi, '')
    .replace(/next article/gi, '')
    .replace(/Latest news/gi, '')
    .replace(/Previous article/gi, '')
    .replace(/Related articles/gi, '')
    .replace(/Share this:/gi, '')
    .replace(/Click to share/gi, '')
    .replace(/Twitter|Facebook|Instagram|YouTube/gi, '')
    // Удаляем лишние пробелы и переносы
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Получение полного контента статьи
async function getArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en,ru;q=0.9',
      },
    });

    const $ = cheerio.load(response.data);
    
    // Удаляем ненужные элементы ДО извлечения текста
    $('script, style, nav, header, footer, aside, iframe, .ads, .comments, .sidebar, .widget, .related, .share, .social, .navigation, .menu, .breadcrumb, .author-box, .newsletter, .popup, .modal').remove();
    $('[class*="sidebar"]').remove();
    $('[class*="widget"]').remove();
    $('[class*="related"]').remove();
    $('[class*="share"]').remove();
    $('[class*="social"]').remove();
    $('[class*="footer"]').remove();
    $('[class*="header"]').remove();
    $('[class*="nav"]').remove();
    $('[class*="menu"]').remove();
    
    // Ищем основной контент
    const contentSelectors = [
      'article .entry-content',
      'article .post-content',
      'article .article-content',
      '.post-content',
      '.article-content',
      '.entry-content',
      'article',
      '.content article',
      'main article',
      'main',
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length) {
        // Дополнительно чистим внутри найденного элемента
        element.find('script, style, iframe, .ads, .comments, .sidebar, .widget, .related, .share, .social, nav, footer, header').remove();
        const content = element.text();
        if (content && content.length > 200) {
          return cleanContent(content).substring(0, 5000);
        }
      }
    }
    
    // Fallback - берем body и чистим
    $('body script, body style, body iframe, body nav, body footer, body header').remove();
    return cleanContent($('body').text()).substring(0, 5000);
  } catch (error) {
    return '';
  }
}

// Подсчет времени чтения
function calculateReadTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// Основная функция парсинга новостей
export async function scrapeAllNews() {
  console.log('📰 Начинаем парсинг новостей...\n');
  
  if (!DEEPSEEK_API_KEY) {
    console.log('⚠️ DEEPSEEK_API_KEY не найден. Перевод будет пропущен.\n');
  }

  let totalFound = 0;
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const feed of RSS_FEEDS) {
    console.log(`\n📡 Парсинг: ${feed.name}`);
    console.log(`   URL: ${feed.url}`);
    
    const items = await parseRSSFeed(feed.url);
    console.log(`   Найдено статей: ${items.length}`);
    totalFound += items.length;

    for (const item of items) {
      // Проверяем, существует ли уже
      const existing = await prisma.article.findFirst({
        where: { sourceUrl: item.link },
      });

      if (existing) {
        totalSkipped++;
        continue;
      }

      try {
        // Переводим заголовок
        const translatedTitle = await translateWithDeepSeek(item.title);
        
        // Переводим описание
        const translatedExcerpt = await translateWithDeepSeek(item.description);
        
        // Получаем полный контент
        const fullContent = await getArticleContent(item.link);
        const translatedContent = fullContent 
          ? await translateWithDeepSeek(fullContent)
          : translatedExcerpt;

        // Скачиваем изображение
        let image = NEWS_PLACEHOLDER_IMAGE;
        if (item.image) {
          const filename = `${generateSlug(translatedTitle)}_${Date.now()}.jpg`;
          const downloaded = await downloadImage(item.image, filename);
          if (downloaded) {
            image = downloaded;
          }
        }

        // Время чтения
        const readTime = calculateReadTime(translatedContent);

        const articleData = {
          slug: generateSlug(translatedTitle),
          title: translatedTitle,
          excerpt: translatedExcerpt.substring(0, 300),
          content: translatedContent,
          image,
          category: feed.category,
          readTime,
          author: feed.name,
          sourceUrl: item.link,
        };

        await prisma.article.create({
          data: articleData,
        });
        
        totalAdded++;
        console.log(`  ✅ Добавлена: ${translatedTitle.substring(0, 50)}...`);

        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`  ❌ Ошибка обработки статьи: ${error.message}`);
      }
    }

    // Задержка между лентами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Итоги
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГИ ПАРСИНГА НОВОСТЕЙ:');
  console.log(`  Найдено статей: ${totalFound}`);
  console.log(`  Добавлено: ${totalAdded}`);
  console.log(`  Пропущено (дубликаты): ${totalSkipped}`);
  
  const total = await prisma.article.count();
  console.log(`  Всего статей в БД: ${total}`);
  console.log('='.repeat(50));
}

// Запуск если вызван напрямую
if (require.main === module) {
  scrapeAllNews()
    .then(() => {
      console.log('\n✅ Парсинг новостей завершен!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ошибка парсинга:', error);
      process.exit(1);
    });
}