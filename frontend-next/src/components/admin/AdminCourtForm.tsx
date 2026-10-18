"use client";

// Форма создания/редактирования корта в админке: поля клуба, удобства, цены
// и загрузка изображения. Состояние формы живёт здесь; результат уходит в
// onSubmit, а API-вызовы остаются в контейнере (AdminClient).
import { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import { api, Court } from "@/lib/api";

export interface CourtFormValues {
  name: string;
  city: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: "indoor" | "outdoor" | "mixed";
  phone: string;
  workingHours: string;
  description: string;
  image: string;
  amenities: string[];
  prices: { time: string; weekday: number; weekend: number }[];
}

const EMPTY_COURT: CourtFormValues = {
  name: "",
  city: "",
  address: "",
  coordinates: { lat: 55.751244, lng: 37.618423 },
  type: "indoor",
  phone: "",
  workingHours: "",
  description: "",
  image: "",
  amenities: [],
  prices: [{ time: "09:00 – 18:00", weekday: 1000, weekend: 1200 }],
};

/** Корт из каталога → значения формы (для редактирования). */
function courtToForm(court: Court): CourtFormValues {
  return {
    name: court.name,
    city: court.city,
    address: court.address,
    coordinates: court.coordinates || { lat: 55.751244, lng: 37.618423 },
    type: court.type,
    phone: court.phone || "",
    workingHours: court.workingHours || "",
    description: court.description || "",
    image: court.image || "",
    amenities: court.amenities || [],
    prices: court.prices || EMPTY_COURT.prices,
  };
}

interface AdminCourtFormProps {
  initial: Court | null;
  onCancel: () => void;
  onSubmit: (values: CourtFormValues) => void;
}

export default function AdminCourtForm({ initial, onCancel, onSubmit }: AdminCourtFormProps) {
  const [courtForm, setCourtForm] = useState<CourtFormValues>(() =>
    initial ? courtToForm(initial) : EMPTY_COURT
  );

  const handleCourtImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.uploadImage(file);
      setCourtForm((prev) => ({ ...prev, image: result.imageUrl }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Ошибка загрузки изображения");
    }
  };

  // Amenities handlers
  const addAmenity = () => {
    setCourtForm((prev) => ({ ...prev, amenities: [...prev.amenities, ""] }));
  };

  const updateAmenity = (index: number, value: string) => {
    setCourtForm((prev) => ({
      ...prev,
      amenities: prev.amenities.map((amenity, i) => (i === index ? value : amenity)),
    }));
  };

  const removeAmenity = (index: number) => {
    setCourtForm((prev) => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== index) }));
  };

  // Price handlers
  const addPrice = () => {
    setCourtForm((prev) => ({
      ...prev,
      prices: [...prev.prices, { time: "09:00 – 18:00", weekday: 1000, weekend: 1200 }],
    }));
  };

  const updatePrice = (
    index: number,
    field: "time" | "weekday" | "weekend",
    value: string | number
  ) => {
    setCourtForm((prev) => ({
      ...prev,
      prices: prev.prices.map((price, i) =>
        i === index ? { ...price, [field]: value } : price
      ),
    }));
  };

  const removePrice = (index: number) => {
    setCourtForm((prev) => ({ ...prev, prices: prev.prices.filter((_, i) => i !== index) }));
  };

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Название</label>
              <input
                type="text"
                value={courtForm.name}
                onChange={(e) => setCourtForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Название корта"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Город</label>
              <input
                type="text"
                value={courtForm.city}
                onChange={(e) => setCourtForm((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Город"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Адрес</label>
            <input
              type="text"
              value={courtForm.address}
              onChange={(e) => setCourtForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Адрес корта"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Широта (lat)</label>
              <input
                type="number"
                step="0.000001"
                value={courtForm.coordinates.lat}
                onChange={(e) =>
                  setCourtForm((prev) => ({
                    ...prev,
                    coordinates: { ...prev.coordinates, lat: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="55.751244"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Долгота (lng)</label>
              <input
                type="number"
                step="0.000001"
                value={courtForm.coordinates.lng}
                onChange={(e) =>
                  setCourtForm((prev) => ({
                    ...prev,
                    coordinates: { ...prev.coordinates, lng: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="37.618423"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Тип</label>
              <select
                value={courtForm.type}
                onChange={(e) => setCourtForm((prev) => ({ ...prev, type: e.target.value as "indoor" | "outdoor" | "mixed" }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary [&>option]:bg-background [&>option]:text-foreground"
              >
                <option value="indoor">Крытый</option>
                <option value="outdoor">Открытый</option>
                <option value="mixed">Смешанный</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Телефон</label>
              <input
                type="text"
                value={courtForm.phone}
                onChange={(e) => setCourtForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="+7 (XXX) XXX-XX-XX"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Время работы</label>
            <input
              type="text"
              value={courtForm.workingHours}
              onChange={(e) => setCourtForm((prev) => ({ ...prev, workingHours: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Пн-Вс: 09:00-22:00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Изображение</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleCourtImageUpload}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {courtForm.image && (
                <img
                  src={courtForm.image}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Удобства</label>
            <div className="space-y-2">
              {courtForm.amenities.map((amenity, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={amenity}
                    onChange={(e) => updateAmenity(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Удобство"
                  />
                  <button
                    type="button"
                    onClick={() => removeAmenity(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAmenity}
                className="flex items-center gap-2 px-3 py-2 text-primary hover:bg-primary/10 rounded-lg text-sm"
              >
                <Plus size={16} />
                Добавить удобство
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Цены</label>
            <div className="space-y-2">
              {courtForm.prices.map((price, index) => (
                <div key={index} className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={price.time}
                    onChange={(e) => updatePrice(index, "time", e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Время"
                  />
                  <input
                    type="number"
                    value={price.weekday}
                    onChange={(e) => updatePrice(index, "weekday", parseInt(e.target.value) || 0)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Будни"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={price.weekend}
                      onChange={(e) => updatePrice(index, "weekend", parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Выходные"
                    />
                    <button
                      type="button"
                      onClick={() => removePrice(index)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addPrice}
                className="flex items-center gap-2 px-3 py-2 text-primary hover:bg-primary/10 rounded-lg text-sm"
              >
                <Plus size={16} />
                Добавить цену
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Описание</label>
            <textarea
              value={courtForm.description}
              onChange={(e) => setCourtForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Описание корта"
            />
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-border flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={() => onSubmit(courtForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Save size={16} />
          {initial ? "Сохранить" : "Создать"}
        </button>
      </div>
    </>
  );
}
