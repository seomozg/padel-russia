"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Court } from "@/lib/api";
import YandexMap from "@/components/YandexMap";

const CITY_COORDINATES: Record<string, [number, number]> = {
  Москва: [55.751244, 37.618423],
  "Санкт-Петербург": [59.93428, 30.335099],
  Казань: [55.796391, 49.108891],
  Екатеринбург: [56.838011, 60.597474],
  Новосибирск: [55.008353, 82.935733],
  Краснодар: [45.03547, 38.975313],
  Сочи: [43.585472, 39.723098],
  "Ростов-на-Дону": [47.235714, 39.701505],
};

interface MapClientProps {
  courts: Court[];
}

export default function MapClient({ courts }: MapClientProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([55.751244, 37.618423]);
  const [mapZoom, setMapZoom] = useState(6);

  const handleCitySelect = (city: string) => {
    const newSelectedCity = selectedCity === city ? null : city;
    setSelectedCity(newSelectedCity);

    if (newSelectedCity && CITY_COORDINATES[newSelectedCity]) {
      setMapCenter(CITY_COORDINATES[newSelectedCity]);
      setMapZoom(12);
    } else {
      setMapCenter([55.751244, 37.618423]);
      setMapZoom(6);
    }
  };

  const cityCourts = selectedCity ? courts.filter((c) => c.city === selectedCity) : [];
  const cities = [...new Set(courts.map((c) => c.city))];

  const courtsPerCity = cities.reduce(
    (acc, city) => {
      acc[city] = courts.filter((c) => c.city === city).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map */}
      <div className="lg:col-span-2">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <YandexMap courts={courts} center={mapCenter} zoom={mapZoom} />
        </div>

        {/* City list buttons below map */}
        <div className="flex flex-wrap gap-2 mt-4">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => handleCitySelect(city)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedCity === city
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <MapPin size={12} />
              {city}
              <span className="bg-background/30 text-xs px-1 rounded">{courtsPerCity[city]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar: courts list */}
      <div className="space-y-4">
        <div className="p-4 bg-card rounded-xl border border-border">
          <h3 className="font-semibold mb-1">
            {selectedCity ? `Корты в ${selectedCity}` : "Все корты"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {selectedCity
              ? `${cityCourts.length} ${cityCourts.length === 1 ? "корт" : "корта"}`
              : `${courts.length} кортов по всей России`}
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(selectedCity ? cityCourts : courts).map((court) => (
            <Link
              key={court.id}
              href={`/courts/${court.slug}`}
              className="block p-4 bg-card rounded-xl border border-border hover:border-primary transition-all group"
            >
              <div className="flex gap-3">
                <img
                  src={court.image}
                  alt={`${court.name} — падел-корт в ${court.city}`}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {court.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {court.city}, {court.address}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-primary">
                      {court.type === "indoor"
                        ? "Крытый"
                        : court.type === "outdoor"
                        ? "Открытый"
                        : "Смешанный"}
                    </span>
                    <span className="text-xs text-muted-foreground">★ {court.rating}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {selectedCity && (
          <Link
            href={`/courts?city=${encodeURIComponent(selectedCity)}`}
            className="block text-center bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Все корты в {selectedCity}
          </Link>
        )}
      </div>
    </div>
  );
}
