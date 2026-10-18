// HTTP-утилити discover-прогона: агент, паузы вежливости к каталогам,
// загрузка картинок клубов в public/images/courts (в контейнере это volume).
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
export const SITE_DELAY_MS = 500; // вежливость к каталогам
export const GEOCODE_DELAY_MS = 1100; // лимит Nominatim 1 req/sec

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function httpGet(url: string, timeout = 20000): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout,
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru,ru-RU;q=0.9,en;q=0.6' },
      responseType: 'text',
      maxRedirects: 5,
    });
    return typeof response.data === 'string' ? response.data : String(response.data);
  } catch (error: any) {
    console.error(`  ❌ GET ${url}: ${error.message}`);
    return null;
  }
}
/** Скачивание картинки клуба в public/images/courts (в контейнере это volume → доступно сразу). */
export async function downloadImage(url: string, slug: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const contentType = String(response.headers['content-type'] || '');
    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('jpeg') || contentType.includes('jpg')
          ? 'jpg'
          : (path.extname(new URL(url).pathname).replace('.', '').toLowerCase() || 'jpg');
    const imagesDir = path.join(process.cwd(), 'public', 'images', 'courts');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const filename = `${slug}_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(imagesDir, filename), Buffer.from(response.data as ArrayBuffer));
    return `/images/courts/${filename}`;
  } catch (error: any) {
    console.error(`  ⚠️ Не скачалось фото (${error.message})`);
    return null;
  }
}
