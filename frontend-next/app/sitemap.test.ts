import { describe, it, expect, vi } from 'vitest';
import sitemap from './sitemap';

const COURTS = [
  { slug: 'пари-падел', updatedAt: '2026-07-16T06:44:15.151Z' },
  { slug: 'padel-park', updatedAt: '2026-05-03T10:00:00.000Z' },
];
const ARTICLES = Array.from({ length: 12 }, (_, i) => ({
  slug: `статья-${i}`,
  updatedAt: '2026-09-29T10:00:00.000Z',
}));

// sitemap ходит в backend напрямую (BACKEND_URL) — мокаем глобальный fetch
vi.stubGlobal(
  'fetch',
  vi.fn(async (url: unknown) => {
    const target = String(url);
    if (target.includes('/articles')) return { ok: true, json: async () => ARTICLES };
    if (target.includes('/courts')) return { ok: true, json: async () => COURTS };
    return { ok: false, json: async () => [] };
  })
);

describe("sitemap", () => {
  it("включает все статьи (запрос с limit=1000), а не только 10", async () => {
    const entries = await sitemap();
    const newsUrls = entries.map((e) => e.url).filter((u) => u.includes("/news/"));

    expect(newsUrls).toHaveLength(12);
    // сам запрос должен содержать явный лимит
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const articleCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/articles"));
    expect(String(articleCall?.[0])).toContain("limit=1000");
  });

  it("кодирует кириллические слаги по спецификации sitemap", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(
      "https://padel-russia.online/courts/%D0%BF%D0%B0%D1%80%D0%B8-%D0%BF%D0%B0%D0%B4%D0%B5%D0%BB"
    );
    expect(urls).toContain("https://padel-russia.online/courts/padel-park");
    // сырых кириллических URL в <loc> быть не должно
    expect(urls.every((u) => !/[а-яё]/i.test(u))).toBe(true);
    // 4 статичных + 2 корта + 12 статей
    expect(entries).toHaveLength(18);
  });
});