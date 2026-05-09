import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapPin, Star, Heart, Phone, Clock, ArrowLeft, Navigation2, Check, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import { api, Court } from "@/lib/api";
import Footer from "@/components/Footer";
import YandexMap from "@/components/YandexMap";
import SEOHead from "@/components/SEOHead";

const TYPE_LABELS: Record<string, string> = {
  indoor: "Крытый",
  outdoor: "Открытый",
  mixed: "Смешанный",
};

export default function CourtDetail() {
  const { slug } = useParams();
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  // Review form state
  const [reviewForm, setReviewForm] = useState({
    authorName: "",
    rating: 5,
    text: ""
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    const loadCourt = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);
        const courtData = await api.getCourt(slug);
        setCourt(courtData);
        setLikes(courtData.likes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load court');
      } finally {
        setLoading(false);
      }
    };

    loadCourt();
  }, [slug]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!court) return;

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const newReview = await api.createReview({
        courtId: court.id,
        authorName: reviewForm.authorName || undefined,
        rating: reviewForm.rating,
        text: reviewForm.text
      });

      // Add new review to court
      setCourt({
        ...court,
        reviews: [newReview, ...court.reviews],
        reviewCount: court.reviewCount + 1
      });

      // Reset form
      setReviewForm({ authorName: "", rating: 5, text: "" });
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Ошибка при отправке отзыва");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !court) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🎾</p>
          <h2 className="font-display font-bold text-xl mb-2">
            {error ? 'Ошибка загрузки' : 'Корт не найден'}
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link to="/courts" className="text-primary hover:underline">← Вернуться к каталогу</Link>
        </div>
      </div>
    );
  }

  const reviews = showAllReviews ? court.reviews : court.reviews.slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={court.name} description={`${court.name} — ${court.city}. ${court.description?.substring(0, 150)}`} />
      <div className="pt-16">
        {/* Hero image */}
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img src={court.image} alt={court.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-8">
            <Link
              to="/courts"
              className="self-start flex items-center gap-2 text-white/90 hover:text-white bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <ArrowLeft size={16} /> К каталогу
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-sport">{TYPE_LABELS[court.type]}</span>
                {court.tags && court.tags.map((tag) => (
                  <span key={tag} className="badge-sport">{tag}</span>
                ))}
              </div>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-white mb-1">{court.name}</h1>
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <MapPin size={14} />
                <span>{court.city} · {court.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stats bar */}
              <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <Star size={18} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{court.rating}</span>
                  <span className="text-muted-foreground text-sm">({court.reviewCount} отзывов)</span>
                </div>
                <div className="w-px h-5 bg-border" />
                <div className="flex items-center gap-2">
                  <Heart size={18} className="text-red-500" />
                  <span className="font-semibold">{likes}</span>
                  <span className="text-muted-foreground text-sm">лайков</span>
                </div>
                <div className="w-px h-5 bg-border" />
                <div className="text-sm text-muted-foreground">
                  {court.courtsCount} {court.courtsCount === 1 ? "корт" : court.courtsCount < 5 ? "корта" : "кортов"}
                </div>
                <button
                  onClick={() => { setLiked(!liked); setLikes(liked ? likes - 1 : likes + 1); }}
                  className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    liked ? "bg-red-50 text-red-500 border border-red-200 dark:bg-red-950/30 dark:border-red-800" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Heart size={15} fill={liked ? "currentColor" : "none"} />
                  {liked ? "Нравится" : "Лайк"}
                </button>
              </div>

              {/* Description */}
              <div>
                <h2 className="font-display font-bold text-xl mb-3">О клубе</h2>
                <p className="text-muted-foreground leading-relaxed">{court.description}</p>
              </div>

              {/* Amenities */}
              {court.amenities && court.amenities.length > 0 && (
                <div>
                  <h2 className="font-display font-bold text-xl mb-4">Услуги и удобства</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {court.amenities.map((a) => (
                      <div key={a} className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
                        <Check size={16} className="text-primary shrink-0" />
                        <span className="text-sm">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prices */}
              <div>
                <h2 className="font-display font-bold text-xl mb-4">Цены</h2>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-4 py-3 text-sm font-semibold">Время</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold">Будни</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold">Выходные</th>
                      </tr>
                    </thead>
                    <tbody>
                      {court.prices.map((p, i) => (
                        <tr key={i} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                          <td className="px-4 py-3 text-sm">{p.time}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{p.weekday.toLocaleString("ru")} ₽</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-primary">{p.weekend.toLocaleString("ru")} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">* Цены указаны за 1 час аренды корта (4 игрока)</p>
              </div>

              {/* Write Review Form */}
              <div className="p-6 bg-card rounded-xl border border-border">
                <h2 className="font-display font-bold text-xl mb-4">Оставить отзыв</h2>
                
                {reviewSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-700 dark:text-green-400 text-sm">Спасибо за отзыв!</p>
                  </div>
                )}

                {reviewError && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive text-sm">{reviewError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ваше имя <span className="text-muted-foreground">(необязательно)</span>
                    </label>
                    <input
                      type="text"
                      value={reviewForm.authorName}
                      onChange={(e) => setReviewForm({ ...reviewForm, authorName: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="Как вас зовут?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Оценка</label>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: i + 1 })}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={24}
                            className={i < reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-muted hover:text-yellow-400"}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">{reviewForm.rating} из 5</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Отзыв</label>
                    <textarea
                      value={reviewForm.text}
                      onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all min-h-[120px] resize-none"
                      placeholder="Поделитесь впечатлениями о корте..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview || !reviewForm.text.trim()}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Отправить отзыв
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Reviews */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-xl">Отзывы</h2>
                  <div className="flex items-center gap-1">
                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{court.rating}</span>
                    <span className="text-muted-foreground text-sm">· {court.reviewCount} отзывов</span>
                  </div>
                </div>
                
                {court.reviews && court.reviews.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {reviews.map((r) => (
                        <div key={r.id} className="p-4 bg-card rounded-xl border border-border">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                              {r.authorName?.charAt(0) || r.user?.name?.charAt(0) || "Г"}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{r.authorName || r.user?.name || "Гость"}</div>
                              <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("ru-RU")}</div>
                            </div>
                            <div className="ml-auto flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={12}
                                  className={i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
                        </div>
                      ))}
                    </div>
                    {court.reviews.length > 2 && (
                      <button
                        onClick={() => setShowAllReviews(!showAllReviews)}
                        className="mt-4 flex items-center gap-2 text-primary text-sm font-medium hover:underline"
                      >
                        {showAllReviews ? (
                          <><ChevronUp size={16} /> Скрыть отзывы</>
                        ) : (
                          <><ChevronDown size={16} /> Показать все {court.reviews.length} отзыва</>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-6 bg-muted/50 rounded-xl text-center">
                    <p className="text-muted-foreground text-sm">Отзывов пока нет. Будьте первым!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column - sidebar */}
            <div className="space-y-4">
              {/* Contact card */}
              <div className="p-5 bg-card rounded-xl border border-border space-y-4 sticky top-20">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Стоимость</div>
                  <div className="font-display font-bold text-2xl text-primary">
                    от {court.prices && court.prices.length > 0
                      ? Math.min(...court.prices.map(p => Math.min(p.weekday, p.weekend))).toLocaleString("ru")
                      : "0"
                    } ₽
                    <span className="text-sm font-normal text-muted-foreground">/час</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="text-muted-foreground">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={15} className="text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground">Часы работы</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {court.workingHours.split(", ").map((item, index) => {
                          const [day, time] = item.split(": ");
                          return (
                            <tr key={index} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                              <td className="py-1 pl-2 pr-2 text-muted-foreground rounded-l">{day}</td>
                              <td className="py-1 pr-2 text-right font-medium rounded-r">{time}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={15} className="text-primary" />
                    <a href={`tel:${court.phone}`} className="hover:text-primary transition-colors">
                      {court.phone}
                    </a>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin size={15} className="text-primary mt-0.5 shrink-0" />
                    <span>{court.address}, {court.city}</span>
                  </div>
                </div>

                <a
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent(court.address + " " + court.city)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Navigation2 size={16} />
                  Как добраться
                </a>

                <a
                  href={`tel:${court.phone}`}
                  className="flex items-center justify-center gap-2 w-full bg-muted text-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Phone size={16} />
                  Позвонить
                </a>
              </div>

              {/* Map */}
              <div className="p-5 bg-card rounded-xl border border-border">
                <h3 className="font-semibold text-sm mb-3">На карте</h3>
                <div className="rounded-lg overflow-hidden">
                  <YandexMap
                    courts={[court]}
                    center={court.coordinates ? [court.coordinates.lat, court.coordinates.lng] : undefined}
                    zoom={15}
                  />
                </div>
                <Link
                  to="/map"
                  className="mt-3 text-xs text-primary hover:underline flex items-center justify-center gap-1"
                >
                  <MapPin size={12} /> Открыть на карте
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
