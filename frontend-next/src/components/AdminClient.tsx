"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, ArrowLeft, Loader2, X } from "lucide-react";
import Link from "next/link";
import { api, Court, Article } from "@/lib/api";
import AdminCourtForm, { CourtFormValues } from "./admin/AdminCourtForm";
import AdminArticleForm, { ArticleFormValues } from "./admin/AdminArticleForm";

type TabType = "courts" | "articles";

export default function AdminClient() {
  const [activeTab, setActiveTab] = useState<TabType>("courts");
  const [courts, setCourts] = useState<Court[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Court | Article | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [courtsData, articlesData] = await Promise.all([
          api.getCourts({}),
          api.getArticles({}),
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

  // Сохранение: форма рендерит дочерний компонент, сюда приходят готовые значения
  const slugFrom = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9а-я]+/g, "-").replace(/^-|-$/g, "");

  const handleSaveCourt = async (form: CourtFormValues) => {
    try {
      const courtData = { ...form, slug: slugFrom(form.name), courtsCount: 1, rating: 0, reviewCount: 0, likes: 0, tags: [] };
      if (editingItem) {
        await api.updateCourt((editingItem as Court).id, courtData);
      } else {
        await api.createCourt(courtData as any);
      }
      setCourts(await api.getCourts({}));
      resetForm();
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Ошибка сохранения");
    }
  };

  const handleSaveArticle = async (form: ArticleFormValues) => {
    try {
      const articleData = { ...form, slug: slugFrom(form.title) };
      if (editingItem) {
        await api.updateArticle((editingItem as Article).id, articleData);
      } else {
        await api.createArticle(articleData as any);
      }
      setArticles(await api.getArticles({}));
      resetForm();
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Ошибка сохранения");
    }
  };

  // Редактирование: значения формы инициализируются из initial при монтировании
  const handleEdit = (item: Court | Article) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить элемент?")) return;
    try {
      if (activeTab === "courts") {
        await api.deleteCourt(id);
        setCourts(courts.filter((c) => c.id !== id));
      } else {
        await api.deleteArticle(id);
        setArticles(articles.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Ошибка удаления");
    }
  };

  // Сброс состояния модалки; поля форм сбрасываются при размонтировании формы
  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display font-bold text-3xl mb-2">Админ-панель</h1>
              <p className="text-muted-foreground">Управление кортами и статьями</p>
            </div>
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft size={16} /> На сайт
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              onClick={() => { setActiveTab("courts"); resetForm(); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "courts"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Корты ({courts.length})
            </button>
            <button
              onClick={() => { setActiveTab("articles"); resetForm(); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "articles"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Статьи ({articles.length})
            </button>
          </div>

          {/* Add button */}
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity mb-6"
            >
              <Plus size={16} /> Добавить {activeTab === "courts" ? "корт" : "статью"}
            </button>
          )}

          {/* List */}
          {!showForm && (
            <div className="space-y-3">
              {activeTab === "courts"
                ? courts.map((court) => (
                    <div key={court.id} className="card-sport p-4 flex items-center gap-4">
                      <img src={court.image || "/images/court-placeholder.svg"} alt={court.name} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{court.name}</h3>
                        <p className="text-sm text-muted-foreground">{court.city}, {court.address}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/courts/${court.slug}`} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                          <Eye size={16} />
                        </Link>
                        <button onClick={() => handleEdit(court)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(court.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                : articles.map((article) => (
                    <div key={article.id} className="card-sport p-4 flex items-center gap-4">
                      <img src={article.image || "/images/news/placeholder.svg"} alt={article.title} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{article.title}</h3>
                        <p className="text-sm text-muted-foreground">{article.category} · {article.author}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/news/${article.slug}`} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                          <Eye size={16} />
                        </Link>
                        <button onClick={() => handleEdit(article)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(article.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          )}

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-xl">
                      {editingItem ? "Редактировать" : "Добавить"}{" "}
                      {activeTab === "courts" ? "корт" : "статью"}
                    </h3>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {activeTab === "courts" ? (
                  <AdminCourtForm
                    initial={editingItem as Court | null}
                    onCancel={resetForm}
                    onSubmit={handleSaveCourt}
                  />
                ) : (
                  <AdminArticleForm
                    initial={editingItem as Article | null}
                    onCancel={resetForm}
                    onSubmit={handleSaveArticle}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

