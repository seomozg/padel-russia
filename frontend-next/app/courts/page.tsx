import type { Metadata } from "next";
import { api, Court } from "@/lib/api";
import CourtsClient from "@/components/CourtsClient";
import JsonLd from "@/components/JsonLd";

interface CourtsPageProps {
  searchParams: { city?: string; type?: string; sort?: string; search?: string };
}

export function generateMetadata({ searchParams }: CourtsPageProps): Metadata {
  const city = searchParams.city;
  const title = city
    ? `Падел-корты в городе ${city}`
    : "Каталог падел-кортов России";
  const description = city
    ? `Список падел-кортов и клубов в городе ${city}. Рейтинги, отзывы, цены, адреса. Выбери лучший корт в ${city}.`
    : "Полный каталог падел-кортов России. Фильтрация по городу, типу, цене. Рейтинги, отзывы, адреса.";

  return {
    title,
    description,
    alternates: { canonical: city ? `/courts?city=${encodeURIComponent(city)}` : "/courts" },
  };
}

export default async function CourtsPage({ searchParams }: CourtsPageProps) {
  let courts: Court[] = [];
  let allCourts: Court[] = [];

  try {
    [courts, allCourts] = await Promise.all([
      api.getCourts({
        city: searchParams.city,
        type: searchParams.type,
        sort: searchParams.sort,
        search: searchParams.search,
      }),
      api.getCourts({}),
    ]);
  } catch (error) {
    console.error("Failed to load courts:", error);
  }

  // Города для фильтра
  const cities = [...new Set(allCourts.map((c) => c.city))].sort();
  const citiesWithCount = cities.map((cityName) => ({
    name: cityName,
    count: allCourts.filter((c) => c.city === cityName).length,
  }));

  // JSON-LD: ItemList кортов
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://padel-russia.online";
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Падел-корты России",
    itemListElement: courts.slice(0, 20).map((court, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: court.name,
      url: `${siteUrl}/courts/${court.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={itemListJsonLd} />
      <div className="pt-20">
        <CourtsClient
          initialCourts={courts}
          citiesWithCount={citiesWithCount}
          initialCity={searchParams.city || ""}
          initialType={searchParams.type || ""}
          initialSort={searchParams.sort || "rating"}
          initialSearch={searchParams.search || ""}
        />
      </div>
    </div>
  );
}
