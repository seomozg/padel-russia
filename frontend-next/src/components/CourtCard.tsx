"use client";

import Link from "next/link";
import { MapPin, Star, Heart, Users } from "lucide-react";
import { Court } from "@/lib/api";
import { useState } from "react";

const AMENITY_ICONS: Record<string, string> = {
  "Парковка": "🅿️",
  "Душевые": "🚿",
  "Прокат ракеток": "🎾",
  "Кафе": "☕",
  "Ресторан": "🍽️",
  "Инструктор": "👨‍🏫",
  "Wi-Fi": "📶",
  "Магазин": "🛍️",
  "Бассейн": "🏊",
  "Детская секция": "👶",
};

const TYPE_LABELS: Record<string, string> = {
  indoor: "Крытый",
  outdoor: "Открытый",
  mixed: "Смешанный",
};

interface CourtCardProps {
  court: Court;
}

export default function CourtCard({ court }: CourtCardProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(court.likes);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <Link href={`/courts/${court.slug}`} className="block group">
      <div className="card-sport overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={court.image}
            alt={`${court.name} — падел-корт в ${court.city}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Like button */}
          <button
            onClick={handleLike}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
              liked
                ? "bg-red-500 text-white"
                : "bg-white/80 text-muted-foreground hover:bg-white hover:text-red-500"
            }`}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
          </button>

          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm ${
              court.type === "indoor"
                ? "bg-blue-500/90 text-white"
                : court.type === "outdoor"
                ? "bg-green-500/90 text-white"
                : "bg-orange-500/90 text-white"
            }`}>
              {TYPE_LABELS[court.type]}
            </span>
          </div>

          {/* Tags */}
          {court.tags && court.tags.length > 0 && (
            <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
              {court.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="badge-sport text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-semibold text-base leading-tight group-hover:text-primary transition-colors">
              {court.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold">{court.rating}</span>
              <span className="text-xs text-muted-foreground">({court.reviewCount})</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin size={13} />
            <span>{court.city} · {court.address}</span>
          </div>

          {/* Amenities */}
          {court.amenities && court.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {court.amenities.slice(0, 4).map((a) => (
                <span key={a} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {AMENITY_ICONS[a] || "🏢"} {a}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">от </span>
              <span className="font-display font-bold text-lg text-primary">
                {court.prices && court.prices.length > 0
                  ? Math.min(...court.prices.map(p => Math.min(p.weekday, p.weekend))).toLocaleString("ru")
                  : "0"
                } ₽
              </span>
              <span className="text-xs text-muted-foreground">/час</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1 text-xs">
                <Users size={12} />
                {court.courtsCount} {court.courtsCount === 1 ? "корт" : court.courtsCount < 5 ? "корта" : "кортов"}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Heart size={12} fill={liked ? "red" : "none"} className={liked ? "text-red-500" : ""} />
                {likes}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
