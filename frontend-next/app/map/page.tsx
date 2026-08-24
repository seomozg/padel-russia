import type { Metadata } from "next";
import { api, Court } from "@/lib/api";
import MapClient from "@/components/MapClient";

export const metadata: Metadata = {
  title: "Карта кортов",
  description:
    "Интерактивная карта всех падел-клубов России. Найди корт в своём городе на карте.",
  alternates: { canonical: "/map" },
};

export default async function MapPage() {
  let courts: Court[] = [];

  try {
    courts = await api.getCourts();
  } catch (error) {
    console.error("Failed to load courts:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <h1 className="font-display font-bold text-3xl mb-2">Карта кортов</h1>
          <p className="text-muted-foreground mb-8">
            Интерактивная карта всех падел-клубов России
          </p>
          <MapClient courts={courts} />
        </div>
      </div>
    </div>
  );
}
