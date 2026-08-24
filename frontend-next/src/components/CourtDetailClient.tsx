"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Heart, Phone, Clock, Navigation2, Check, ChevronDown, ChevronUp, Loader2, Send, MapPin } from "lucide-react";
import { api, Court } from "@/lib/api";
import YandexMap from "@/components/YandexMap";

interface CourtDetailClientProps {
  court: Court;
  typeLabels: Record<string, string>;
}

export default function CourtDetailClient({ court, typeLabels }: CourtDetailClientProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(court.likes);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    authorName: "",
    rating: 5,
    text: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [courtState, setCourtState] = useState<Court>(court);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const newReview = await api.createReview({
        courtId: courtState.id,
        authorName: reviewForm.authorName || undefined,
        rating: reviewForm.rating,
        text: reviewForm.text,
      });

      setCourtState({
        ...courtState,
        reviews: [newReview, ...courtState.reviews],
        reviewCount: courtState.reviewCount + 1,
      });

      setReviewForm({ authorName: "", rating: 5, text: "" });
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Ошибка при отправке отзыва");
    } finally {
      setSubmittingReview(false);
    }
  };

  const reviews = showAllReviews ? courtState.reviews : courtState.reviews.slice(0, 3);
  const minPrice =
    courtState.prices && courtState.prices.length > 0
      ? Math.min(...courtState.prices.map((p) => Math.min(p.weekday, p.weekend)))
      : 0;

  return (
    <div className="container mx-auto px-4 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
            <img
              src={courtState.image}
              alt={`${courtState.name} — падел-корт в ${courtState.city}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                  {typeLabels[courtState.type] || courtState.type}
                </span>
                {courtState.tags && courtState.tags.map((tag) => (
                  <span key={tag} className="badge-sport text-xs">{tag}</span>
                ))}
              </div>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-white">
                {courtState.name}
              </h1>
              <p className="text-white/90 text-sm mt-1 flex items-center gap-1">
                <MapPin size={14} /> {courtState.city}, {courtState.address}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-sport p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star size={18} className="fill-yellow-400 text-yellow-400" />
                <span className="font-display font-bold text-xl">{courtState.rating}</span>
              </div>
              <p className="text-xs text-muted-foreground">{courtState.reviewCount} отзывов</p>
            </div>
            <div className="card-sport p-4 text-center">
              <p className="font-display font-bold text-xl mb-1">{courtState.courtsCount}</p>
              <p className="text-xs text-muted-foreground">кортов</p>
            </div>
            <div className="card-sport p-4 text-center">
              <p className="font-display font-bold text-xl mb-1">{minPrice} ₽</p>
              <p className="text-xs text-muted-foreground">от / час</p>
            </div>
            <button onClick={handleLike} className="card-sport p-4 text-center hover:border-primary transition-colors">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Heart size={18} fill={liked ? "red" : "none"} className={liked ? "text-red-500" : ""} />
                <span className="font-display font-bold text-xl">{likes}</span>
              </div>
              <p className="text-xs text-muted-foreground">нравится</p>
            </button>
          </div>

          {/* Description */}
          {courtState.description && (
            <div>
              <h2 className="font-display font-bold text-2xl mb-3">О корте</h2>
              <p className="text-muted-foreground leading-relaxed">{courtState.description}</p>
            </div>
          )}

          {/* Amenities */}
          {courtState.amenities && courtState.amenities.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-2xl mb-3">Удобства</h2>
              <div className="flex flex-wrap gap-2">
                {courtState.amenities.map((a) => (
                  <span key={a} className="px-3 py-1.5 bg-muted text-sm rounded-full">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Prices */}
          {courtState.prices && courtState.prices.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-2xl mb-3">Цены</h2>
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
                    {courtState.prices.map((p, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="py-1 pl-2 pr-2 text-muted-foreground">{p.time}</td>
                        <td className="py-1 pr-2 text-right font-medium">{p.weekday} ₽</td>
                        <td className="py-1 pr-2 text-right font-medium">{p.weekend} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h2 className="font-display font-bold text-2xl mb-3">
              Отзывы ({courtState.reviewCount})
            </h2>

            {/* Review form */}
            <form onSubmit={handleSubmitReview} className="card-sport p-5 mb-6">
              <h3 className="font-semibold mb-4">Оставить отзыв</h3>
              {reviewSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-2">
                  <Check size={16} /> Отзыв успешно добавлен!
                </div>
              )}
              {reviewError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {reviewError}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Имя (необязательно)</label>
                  <input
                    type="text"
                    value={reviewForm.authorName}
                    onChange={(e) => setReviewForm({ ...reviewForm, authorName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Как вас зовут?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Оценка</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="p-1"
                      >
                        <Star
                          size={24}
                          className={star <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Отзыв</label>
                  <textarea
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px]"
                    placeholder="Поделитесь впечатлениями о корте..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Отправить отзыв
                </button>
              </div>
            </form>

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Пока нет отзывов. Будьте первым!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="card-sport p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                          {(review.authorName || "А")[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{review.authorName || "Аноним"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
                  </div>
                ))}

                {courtState.reviews.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="flex items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all mx-auto"
                  >
                    {showAllReviews ? (
                      <><ChevronUp size={16} /> Свернуть</>
                    ) : (
                      <>Показать все ({courtState.reviews.length}) <ChevronDown size={16} /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contacts */}
          <div className="p-5 bg-card rounded-xl border border-border">
            <h3 className="font-semibold text-sm mb-3">Контакты</h3>
            <div className="space-y-2 text-sm">
              <div className="text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={15} className="text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">Часы работы</span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {courtState.workingHours?.split(", ").map((item, index) => {
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
              {courtState.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={15} className="text-primary" />
                  <a href={`tel:${courtState.phone}`} className="hover:text-primary transition-colors">
                    {courtState.phone}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin size={15} className="text-primary mt-0.5 shrink-0" />
                <span>{courtState.address}, {courtState.city}</span>
              </div>
            </div>

            <a
              href={`https://yandex.ru/maps/?text=${encodeURIComponent(courtState.address + " " + courtState.city)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity mt-4"
            >
              <Navigation2 size={16} />
              Как добраться
            </a>

            {courtState.phone && (
              <a
                href={`tel:${courtState.phone}`}
                className="flex items-center justify-center gap-2 w-full bg-muted text-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-colors mt-2"
              >
                <Phone size={16} />
                Позвонить
              </a>
            )}
          </div>

          {/* Map */}
          <div className="p-5 bg-card rounded-xl border border-border">
            <h3 className="font-semibold text-sm mb-3">На карте</h3>
            <div className="rounded-lg overflow-hidden">
              <YandexMap
                courts={[courtState]}
                center={courtState.coordinates ? [courtState.coordinates.lat, courtState.coordinates.lng] : undefined}
                zoom={15}
              />
            </div>
            <Link
              href="/map"
              className="mt-3 text-xs text-primary hover:underline flex items-center justify-center gap-1"
            >
              <MapPin size={12} /> Открыть на карте
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
