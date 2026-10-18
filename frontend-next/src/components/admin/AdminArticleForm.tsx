"use client";

// Форма создания/редактирования статьи в админке: текст, рубрика, обложка,
// автор и флаг публикации. Состояние локальное; сохранение — через onSubmit.
import { useState } from "react";
import { Save } from "lucide-react";
import { api, Article } from "@/lib/api";

export interface ArticleFormValues {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: number;
  author: string;
  image: string;
  published: boolean;
}

const EMPTY_ARTICLE: ArticleFormValues = {
  title: "",
  excerpt: "",
  content: "",
  category: "Новости клубов",
  readTime: 5,
  author: "Редакция PadelRussia",
  image: "",
  published: true,
};

/** Статья → значения формы (для редактирования). */
function articleToForm(article: Article): ArticleFormValues {
  return {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category,
    readTime: article.readTime,
    author: article.author,
    image: article.image || "",
    published: article.published,
  };
}

interface AdminArticleFormProps {
  initial: Article | null;
  onCancel: () => void;
  onSubmit: (values: ArticleFormValues) => void;
}

export default function AdminArticleForm({ initial, onCancel, onSubmit }: AdminArticleFormProps) {
  const [articleForm, setArticleForm] = useState<ArticleFormValues>(() =>
    initial ? articleToForm(initial) : EMPTY_ARTICLE
  );

  const handleArticleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.uploadImage(file);
      setArticleForm((prev) => ({ ...prev, image: result.imageUrl }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Ошибка загрузки изображения");
    }
  };

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Заголовок</label>
            <input
              type="text"
              value={articleForm.title}
              onChange={(e) => setArticleForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Заголовок статьи"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Краткое описание</label>
            <textarea
              value={articleForm.excerpt}
              onChange={(e) => setArticleForm((prev) => ({ ...prev, excerpt: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Краткое описание статьи"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Полный текст</label>
            <textarea
              value={articleForm.content}
              onChange={(e) => setArticleForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Полный текст статьи"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Категория</label>
              <select
                value={articleForm.category}
                onChange={(e) => setArticleForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary [&>option]:bg-background [&>option]:text-foreground"
              >
                <option value="Тренды">Тренды</option>
                <option value="Турниры">Турниры</option>
                <option value="Советы">Советы</option>
                <option value="Начинающим">Начинающим</option>
                <option value="Новости клубов">Новости клубов</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Время чтения (мин)</label>
              <input
                type="number"
                value={articleForm.readTime}
                onChange={(e) => setArticleForm((prev) => ({ ...prev, readTime: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Изображение</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleArticleImageUpload}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {articleForm.image && (
                <img
                  src={articleForm.image}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Автор</label>
            <input
              type="text"
              value={articleForm.author}
              onChange={(e) => setArticleForm((prev) => ({ ...prev, author: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Имя автора"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={articleForm.published}
              onChange={(e) => setArticleForm((prev) => ({ ...prev, published: e.target.checked }))}
              className="rounded border-border"
            />
            <label htmlFor="published" className="text-sm font-medium">
              Опубликовано
            </label>
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
          onClick={() => onSubmit(articleForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Save size={16} />
          {initial ? "Сохранить" : "Создать"}
        </button>
      </div>
    </>
  );
}
