import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, Phone, Clock, ArrowLeft, Navigation2 } from "lucide-react";
import { api, Court } from "@/lib/api";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import CourtDetailClient from "@/components/CourtDetailClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://padel-russia.online";

interface CourtDetailPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: CourtDetailPageProps): Promise<Metadata> {
  const slug = params.slug;
  let court: Court | null = null;

  try {
    court = await api.getCourt(slug);
  } catch {
    notFound();
  }

  if (!court) return {};

  const title = `${court.name} — падел-корт в ${court.city}`;
  const description =
    court.description?.substring(0, 155) ||
    `${court.name} — падел-корт в городе ${court.city}. Адрес: ${court.address}. Рейтинг: ${court.rating} (${court.reviewCount} отзывов).`;

  return {
    title,
    description,
    alternates: { canonical: `/courts/${court.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/courts/${court.slug}`,
      images: court.image ? [{ url: court.image, alt: court.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: court.image ? [court.image] : [],
    },
  };
}

export default async function CourtDetailPage({ params }: CourtDetailPageProps) {
  let court: Court | null = null;

  try {
    court = await api.getCourt(params.slug);
  } catch {
    notFound();
  }

  if (!court) notFound();

  const TYPE_LABELS: Record<string, string> = {
    indoor: "Крытый",
    outdoor: "Открытый",
    mixed: "Смешанный",
  };

  // JSON-LD: SportsActivityLocation
  const sportsActivityJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: court.name,
    description: court.description || `${court.name} — падел-корт в ${court.city}`,
    image: court.image,
    address: {
      "@type": "PostalAddress",
      streetAddress: court.address,
      addressLocality: court.city,
      addressCountry: "RU",
    },
    geo:
      court.coordinates && court.coordinates.lat && court.coordinates.lng
        ? {
            "@type": "GeoCoordinates",
            latitude: court.coordinates.lat,
            longitude: court.coordinates.lng,
          }
        : undefined,
    telephone: court.phone,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: court.rating,
      reviewCount: court.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    url: `${siteUrl}/courts/${court.slug}`,
  };

  // JSON-LD: BreadcrumbList
  const breadcrumbs = [
    { label: "Главная", href: "/" },
    { label: "Корты", href: "/courts" },
    { label: court.city, href: `/courts?city=${encodeURIComponent(court.city)}` },
    { label: court.name },
  ];

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={sportsActivityJsonLd} />
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="pt-16">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumbs items={breadcrumbs} />
          <Link
            href="/courts"
            className="inline-flex items-center gap-2 text-primary hover:gap-3 transition-all text-sm font-medium mb-4"
          >
            <ArrowLeft size={16} /> К каталогу
          </Link>
        </div>

        <CourtDetailClient court={court} typeLabels={TYPE_LABELS} />
      </div>
    </div>
  );
}
