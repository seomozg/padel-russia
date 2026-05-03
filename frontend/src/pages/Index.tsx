import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, ArrowRight, Star, Users, Loader2 } from "lucide-react";
import { api, Court, Article } from "@/lib/api";
import CourtCard from "@/components/CourtCard";
import NewsCard from "@/components/NewsCard";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import heroPadel from "@/assets/hero-padel.jpg";

const FEATURES = [
  {
    icon: "🗺️",
    title: "Удобный каталог",
    desc: "Ищите корты по городу, типу и цене. Фильтрация и сортировка в один клик.",
  },
  {
    icon: "⭐",
    title: "Реальные отзывы",
    desc: "Читайте отзывы других игроков и выбирайте лучшие корты рядом с вами.",
  },
  {
    icon: "📍",
    title: "Карта кортов",
    desc: "Интерактивная карта России с отметками всех падел-клубов по городам.",
  },
  {
    icon: "📱",
    title: "Работает везде",
    desc: "Оптимизировано для телефона. Открывайте с любого устройства без установки.",
  },
];

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [courts, setCourts] = useState<Court[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [courtsData, articlesData] = await Promise.all([
          api.getCourts({ sort: "rating" }),
          api.getArticles({ limit: 3 })
        ]);
        setCourts(courtsData);
        setArticles(articlesData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Динамические данные из БД
  const cities = [...new Set(courts.map(c => c.city))];
  const citiesWithCount = cities.map(city => ({
    name: city,
    count: courts.filter(c => c.city === city).length
  })).sort((a, b) => b.count - a.count);

  const totalCourts = courts.length;
  const totalCities = cities.length;

  const topCourts = courts.sort((a, b) => b.rating - a.rating).slice(0, 6);
  const latestNews = articles.slice(0, 3);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCity && selectedCity !== "Все города") params.set("city", selectedCity);
    window.location.href = `/courts?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Падел-корты России" description={`${totalCourts} кортов в ${totalCities} городах. Найди свой падел-корт.`} />
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroPadel}
            alt="Padel court"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-overlay" />
        </div>

        <div className="relative container mx-auto px-4 py-24">
          <div className="max-w-2xl animate-fade-up">
            <div className="badge-sport inline-flex mb-6 text-sm">
              🎾 Каталог падела в России
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
              Найди свой
              <span className="block text-gradient-primary" style={{ WebkitTextFillColor: "hsl(152, 60%, 55%)" }}>
                падел-корт
              </span>
            </h1>
            <p className="text-white/80 text-xl leading-relaxed mb-10 animate-fade-up-delay-1">
              {totalCourts} кортов в {totalCities} городах России. Ищи, сравнивай, играй.
            </p>

            {/* Search bar */}
            <div className="bg-card rounded-2xl p-3 shadow-2xl animate-fade-up-delay-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    placeholder="Название корта или адрес..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="pl-9 pr-8 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none min-w-[160px] rounded-lg [&>option]:bg-background [&>option]:text-foreground [&>option]:rounded-lg"
                  >
                    <option value="">Все города</option>
                    {citiesWithCount.map((c) => (
                      <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <Search size={16} />
                  Найти
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border animate-fade-up-delay-3">
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-3 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-muted rounded-lg flex items-center justify-center">
                  <MapPin size={18} className="text-primary" />
                </div>
                <div>
                  <div className="font-display font-bold text-lg leading-tight">{totalCities}</div>
                  <div className="text-xs text-muted-foreground">городов</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-muted rounded-lg flex items-center justify-center">
                  <Star size={18} className="text-primary" />
                </div>
                <div>
                  <div className="font-display font-bold text-lg leading-tight">{totalCourts}</div>
                  <div className="text-xs text-muted-foreground">кортов</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-muted rounded-lg flex items-center justify-center">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <div className="font-display font-bold text-lg leading-tight">{courts.reduce((sum, c) => sum + c.courtsCount, 0)}</div>
                  <div className="text-xs text-muted-foreground">площадок</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top courts */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-primary text-sm font-semibold mb-2 uppercase tracking-wider">Каталог</p>
              <h2 className="font-display font-bold text-3xl md:text-4xl">Лучшие корты</h2>
            </div>
            <Link
              to="/courts"
              className="hidden sm:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
            >
              Все корты <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topCourts.map((court, i) => (
                <div key={court.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <CourtCard court={court} />
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              to="/courts"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Смотреть все корты <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold mb-2 uppercase tracking-wider">Почему PadelRussia</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl">Всё для падела в одном месте</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="p-6 bg-card rounded-2xl border border-border hover:-translate-y-1 transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities quick access */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold mb-2 uppercase tracking-wider">География</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl">Корты по городам</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {citiesWithCount.map((city, i) => (
              <Link
                key={city.name}
                to={`/courts?city=${encodeURIComponent(city.name)}`}
                className="group p-4 bg-card rounded-xl border border-border hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-center animate-fade-up"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <MapPin size={20} className="mx-auto mb-2 text-primary group-hover:text-primary-foreground" />
                <div className="font-semibold text-sm">{city.name}</div>
                <div className="text-xs text-muted-foreground group-hover:text-primary-foreground/70 mt-0.5">
                  {city.count} {city.count === 1 ? "корт" : city.count < 5 ? "корта" : "кортов"}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* News */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-primary text-sm font-semibold mb-2 uppercase tracking-wider">Блог</p>
              <h2 className="font-display font-bold text-3xl md:text-4xl">Новости и статьи</h2>
            </div>
            <Link
              to="/news"
              className="hidden sm:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
            >
              Все статьи <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestNews.map((article, i) => (
              <div key={article.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <NewsCard article={article} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 translate-y-1/2" />
            </div>
            <div className="relative">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-primary-foreground mb-4">
                Готов сыграть в падел?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Найди корт рядом с домой и начни играть уже сегодня. Это проще, чем кажется!
              </p>
              <Link
                to="/courts"
                className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition-all text-base shadow-lg"
              >
                Найти корт <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
