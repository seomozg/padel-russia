"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, ArrowLeft, Loader2, Save, X } from "lucide-react";
import Link from "next/link";
import { api, Court, Article } from "@/lib/api";

type TabType = "courts" | "articles";

export default function AdminClient() {
  const [activeTab, setActiveTab] = useState<TabType>("courts");
  const [courts, setCourts] = useState<Court[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Court | Article | null>(null);

  // Form states
  const [courtForm, setCourtForm] = useState({
    name: "",
    city: "",
    address: "",
    coordinates: { lat: 55.751244, lng: 37.618423 },
    type: "indoor" as "indoor" | "outdoor" | "mixed",
    phone: "",
    workingHours: "",
    description: "",
    image: "",
    amenities: [] as string[],
    prices: [{ time: "09:00 – 18:00", weekday: 1000, weekend: 1200 }],
  });

  const [articleForm, setArticleForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "Новости клубов",
    readTime: 5,
    author: "Редакция PadelRussia",
    image: "",
    published: true,
  });

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

  const handleSubmit = async () => {
    try {
      if (activeTab === "courts") {
        const slug = courtForm.name.toLowerCase().replace(/[^a-z0-9а-я]+/g, "-").replace(/^-|-$/g, "");
        const courtData = { ...courtForm, slug, courtsCount: 1, rating: 0, reviewCount: 0, likes: 0, tags: [] };
        if (editingItem) {
          await api.updateCourt((editingItem as Court).id, courtData);
        } else {
          await api.createCourt(courtData as any);
        }
        const courtsData = await api.getCourts({});
        setCourts(courtsData);
      } else {
        const slug = articleForm.title.toLowerCase().replace(/[^a-z0-9а-я]+/g, "-").replace(/^-|-$/g, "");
        const articleData = { ...articleForm, slug };
        if (editingItem) {
          await api.updateArticle((editingItem as Article).id, articleData);
        } else {
          await api.createArticle(articleData as any);
        }
        const articlesData = await api.getArticles({});
        setArticles(articlesData);
      }
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Ошибка сохранения");
    }
  };

  const handleEdit = (item: Court | Article) => {
    setEditingItem(item);
    if (activeTab === "courts") {
      const court = item as Court;
      setCourtForm({
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
        prices: court.prices || [{ time: "09:00 – 18:00", weekday: 1000, weekend: 1200 }],
      });
    } else {
      const article = item as Article;
      setArticleForm({
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        readTime: article.readTime,
        author: article.author,
        image: article.image || "",
        published: article.published,
      });
    }
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

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setCourtForm({
      name: "", city: "", address: "", coordinates: { lat: 55.751244, lng: 37.618423 },
      type: "indoor", phone: "", workingHours: "", description: "", image: "",
      amenities: [], prices: [{ time: "09:00 – 18:00", weekday: 1000, weekend: 1200 }],
    });
    setArticleForm({
      title: "", excerpt: "", content: "", category: "Новости клубов",
      readTime: 5, author: "Редакция PadelRussia", image: "", published: true,
    });
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
                      <img src={court.image} alt={court.name} className="w-16 h-16 rounded-lg object-cover" />
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
                      <img src={article.image} alt={article.title} className="w-16 h-16 rounded-lg object-cover" />
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
        </div>
      </div>
    </div>
  );
}

