"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, X, Loader2 } from "lucide-react";
import { Court } from "@/lib/api";
import CourtCard from "@/components/CourtCard";

const TYPES = [
  { value: "", label: "Все типы" },
  { value: "indoor", label: "Крытые" },
  { value: "outdoor", label: "Открытые" },
  { value: "mixed", label: "Смешанные" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "По рейтингу" },
  { value: "price_asc", label: "Сначала дешевле" },
  { value: "price_desc", label: "Сначала дороже" },
  { value: "reviews", label: "По отзывам" },
];

interface CourtsClientProps {
  initialCourts: Court[];
  citiesWithCount: { name: string; count: number }[];
  initialCity: string;
  initialType: string;
  initialSort: string;
  initialSearch: string;
}

export default function CourtsClient({
  initialCourts,
  citiesWithCount,
  initialCity,
  initialType,
  initialSort,
  initialSearch,
}: CourtsClientProps) {
  const router = useRouter();

  const [courts, setCourts] = useState<Court[]>(initialCourts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [city, setCity] = useState(initialCity);
  const [type, setType] = useState(initialType);
  const [sort, setSort] = useState(initialSort);
  const [showFilters, setShowFilters] = useState(false);

  // Sync courts when SSR delivers new data (after filter change)
  useEffect(() => {
    setCourts(initialCourts);
    setLoading(false);
  }, [initialCourts]);

  // Update URL on filter change → triggers SSR navigation
  const updateUrl = (newCity: string, newType: string, newSort: string, newSearch: string) => {
    const params = new URLSearchParams();
    if (newCity) params.set("city", newCity);
    if (newType) params.set("type", newType);
    if (newSort && newSort !== "rating") params.set("sort", newSort);
    if (newSearch) params.set("search", newSearch);
    const query = params.toString();
    setLoading(true);
    router.push(`/courts${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    updateUrl(newCity, type, sort, search);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    updateUrl(city, newType, sort, search);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    updateUrl(city, type, newSort, search);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateUrl(city, type, sort, value);
  };

  const resetFilters = () => {
    setCity("");
    setType("");
    setSearch("");
    setSort("rating");
    router.push("/courts", { scroll: false });
  };

  const hasFilters = city !== "" || type !== "" || search !== "";

  return (
    <>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <h1 className="font-display font-bold text-3xl mb-2">Каталог кортов</h1>
          <p className="text-muted-foreground">
            {loading ? "Загрузка..." : `Найдено ${courts.length} кортов по всей России`}
          </p>

          {/* Search bar */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Поиск по названию, городу или адресу..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-background border border-border rounded-xl text-sm font-medium hover:bg-accent transition-colors"
            >
              <SlidersHorizontal size={16} /> Фильтры
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Тип корта</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {hasFilters && (
                  <div className="flex items-end">
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-2"
                    >
                      <X size={14} /> Сбросить
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* City chips */}
        <div className="container mx-auto px-4 pb-4">
          <div className="flex flex-wrap gap-2 pb-2">
            <button
              onClick={() => handleCityChange("")}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                city === ""
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Все города
            </button>
            {citiesWithCount.map((c) => (
              <button
                key={c.name}
                onClick={() => handleCityChange(c.name)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  city === c.name
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <MapPin size={12} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">❌</p>
            <h3 className="font-display font-bold text-xl mb-2">Ошибка загрузки</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : courts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎾</p>
            <h3 className="font-display font-bold text-xl mb-2">Ничего не найдено</h3>
            <p className="text-muted-foreground">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court, i) => (
              <div key={court.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <CourtCard court={court} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
