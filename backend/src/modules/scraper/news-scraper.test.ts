import { parseRssItems } from './news-scraper';

describe('parseRssItems', () => {
  const rssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Padel Test Feed</title>
    <item>
      <title>Тапиа и Коэльо выиграли турнир &amp; стали первыми</title>
      <link>https://example.com/tapia-coello-win</link>
      <description><![CDATA[<p>Краткий <b>обзор</b> матча.</p>]]></description>
      <pubDate>Mon, 28 Sep 2026 15:42:02 +0000</pubDate>
      <content:encoded><![CDATA[<p>Полный текст. <img src="https://example.com/img-content.jpg"/></p>]]></content:encoded>
      <media:content url="https://example.com/img-media.jpg" type="image/jpeg"/>
    </item>
    <item>
      <title>Новость без картинки</title>
      <link>https://example.com/no-image</link>
      <description>Обычный текст без HTML &lt;b&gt;тегов&lt;/b&gt;</description>
      <enclosure url="https://example.com/img-enclosure.jpg" type="image/jpeg"/>
    </item>
    <item>
      <title>Элемент без ссылки</title>
      <description>Не должен попасть в результат</description>
    </item>
    <item>
      <title></title>
      <link>https://example.com/no-title</link>
    </item>
  </channel>
</rss>`;

  it('parses titles, links and descriptions from RSS items', () => {
    const items = parseRssItems(rssFixture);

    expect(items).toHaveLength(2);

    expect(items[0].title).toBe('Тапиа и Коэльо выиграли турнир & стали первыми');
    expect(items[0].link).toBe('https://example.com/tapia-coello-win');
    expect(items[0].description).toBe('Краткий обзор матча.');
    expect(items[0].pubDate).toBeInstanceOf(Date);
    expect(items[0].pubDate?.toISOString()).toBe('2026-09-28T15:42:02.000Z');
  });

  it('detects image with media:content taking precedence', () => {
    const items = parseRssItems(rssFixture);
    expect(items[0].image).toBe('https://example.com/img-media.jpg');
  });

  it('falls back to enclosure image when no media:content', () => {
    const items = parseRssItems(rssFixture);
    expect(items[1].image).toBe('https://example.com/img-enclosure.jpg');
  });

  it('skips items without link or without title', () => {
    const items = parseRssItems(rssFixture);
    const links = items.map((i) => i.link);
    expect(links).not.toContain('');
    expect(links).not.toContain('https://example.com/no-title');
  });

  it('extracts first img from content:encoded when no media/enclosure', () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <item>
      <title>Только content:encoded</title>
      <link>https://example.com/content-encoded</link>
      <description>Описание</description>
      <content:encoded><![CDATA[<p>Текст <img src="https://example.com/from-content.jpg" alt=""/></p>]]></content:encoded>
    </item>
  </channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].image).toBe('https://example.com/from-content.jpg');
  });

  it('returns empty array for invalid XML', () => {
    expect(parseRssItems('this is not xml at all')).toEqual([]);
  });
});