"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

interface CityWithCount {
  name: string;
  count: number;
}

interface IndexClientProps {
  cities: CityWithCount[];
}

/**
 * Клиентская часть главной страницы — форма поиска.
 * Серверный компонент не может использовать useState/обработчики событий.
 */
export default function IndexClient({ cities }: IndexClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCity && selectedCity !== "Все города") params.set("city", selectedCity);
    window.location.href = `/courts?${params.toString()}`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Поиск по названию, городу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full pl-10 pr-4 py-3 bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <select
        value={selectedCity}
        onChange={(e) => setSelectedCity(e.target.value)}
        className="px-4 py-3 bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
      >
        <option value="">Все города</option>
        {cities.map((city) => (
          <option key={city.name} value={city.name}>
            {city.name} ({city.count})
          </option>
        ))}
      </select>
      <button
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        Найти <ArrowRight size={16} />
      </button>
    </div>
  );
}
