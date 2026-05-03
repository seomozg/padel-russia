// Polyfill File для Node 18 (глобал File добавлен в Node 20)
if (typeof File === 'undefined') {
  (global as any).File = class File {
    constructor(public bits: any[], public name: string, public options?: any) {}
  };
}

async function main() {
  try {
    const { scrapeAllNews } = await import('../src/modules/scraper/news-scraper');
    await scrapeAllNews();
    console.log('\n✅ Парсинг новостей успешно завершен!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
