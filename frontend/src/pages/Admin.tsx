import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, ArrowLeft, Loader2, Save, X } from "lucide-react";
import { api, Court, Article } from "@/lib/api";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

type TabType = 'courts' | 'articles';

interface CourtFormData {
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

interface ArticleFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: number;
  author: string;
  image: string;
  published: boolean;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('courts');
  const [courts, setCourts] = useState<Court[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Court | Article | null>(null);

  // Form states
  const [courtForm, setCourtForm] = useState<CourtFormData>({
    name: '',
    city: '',
    address: '',
    coordinates: { lat: 55.751244, lng: 37.618423 },
    type: 'indoor',
    phone: '',
    workingHours: '',
    description: '',
    image: '',
    amenities: [],
    prices: [{ time: '09:00 – 18:00', weekday: 1000, weekend: 1200 }]
  });

  const [articleForm, setArticleForm] = useState<ArticleFormData>({
    title: '',
    excerpt: '',
    content: '',
    category: 'Новости клубов',
    readTime: 5,
    author: 'Редакция PadelRussia',
    image: '',
    published: true
  });

  // Image upload handlers
  const handleCourtImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await api.uploadImage(file);
      setCourtForm(prev => ({ ...prev, image: result.imageUrl }));
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Ошибка загрузки изображения');
    }
  };

  const handleArticleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await api.uploadImage(file);
      setArticleForm(prev => ({ ...prev, image: result.imageUrl }));
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Ошибка загрузки изображения');
    }
  };

  // Amenities handlers
  const addAmenity = () => {
    setCourtForm(prev => ({
      ...prev,
      amenities: [...prev.amenities, '']
    }));
  };

  const updateAmenity = (index: number, value: string) => {
    setCourtForm(prev => ({
      ...prev,
      amenities: prev.amenities.map((amenity, i) => i === index ? value : amenity)
    }));
  };

  const removeAmenity = (index: number) => {
    setCourtForm(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  // Price handlers
  const addPrice = () => {
    setCourtForm(prev => ({
      ...prev,
      prices: [...prev.prices, { time: '09:00 – 18:00', weekday: 1000, weekend: 1200 }]
    }));
  };

  const updatePrice = (index: number, field: 'time' | 'weekday' | 'weekend', value: string | number) => {
    setCourtForm(prev => ({
      ...prev,
      prices: prev.prices.map((price, i) =>
        i === index ? { ...price, [field]: value } : price
      )
    }));
  };

  const removePrice = (index: number) => {
    setCourtForm(prev => ({
      ...prev,
      prices: prev.prices.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [courtsData, articlesData] = await Promise.all([
        api.getCourts(),
        api.getArticles()
      ]);
      setCourts(courtsData);
      setArticles(articlesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourt = async () => {
    try {
      await api.createCourt({
        ...courtForm,
        slug: courtForm.name.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, '').replace(/\s+/g, '-').trim(),
        rating: 0,
        reviewCount: 0,
        likes: 0,
        courtsCount: 1,
        tags: []
      });
      await loadData();
      setShowForm(false);
      resetCourtForm();
    } catch (error) {
      console.error('Failed to create court:', error);
    }
  };

  const handleUpdateCourt = async () => {
    if (!editingItem) return;

    try {
      await api.updateCourt(editingItem.id, courtForm);
      await loadData();
      setShowForm(false);
      resetCourtForm();
    } catch (error) {
      console.error('Failed to update court:', error);
    }
  };

  const handleUpdateArticle = async () => {
    if (!editingItem) return;

    try {
      await api.updateArticle(editingItem.id, articleForm);
      await loadData();
      setShowForm(false);
      resetArticleForm();
    } catch (error) {
      console.error('Failed to update article:', error);
    }
  };

  const handleCreateArticle = async () => {
    try {
      await api.createArticle({
        ...articleForm,
        slug: articleForm.title.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, '').replace(/\s+/g, '-').trim()
      });
      await loadData();
      setShowForm(false);
      resetArticleForm();
    } catch (error) {
      console.error('Failed to create article:', error);
    }
  };

  const handleDeleteCourt = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот корт?')) {
      try {
        await api.deleteCourt(id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete court:', error);
        alert('Ошибка при удалении корта');
      }
    }
  };

  const handleSubmit = async () => {
    if (activeTab === 'courts') {
      if (editingItem) {
        await handleUpdateCourt();
      } else {
        await handleCreateCourt();
      }
    } else {
      if (editingItem) {
        await handleUpdateArticle();
      } else {
        await handleCreateArticle();
      }
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту статью?')) {
      try {
        await api.deleteArticle(id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete article:', error);
      }
    }
  };

  const resetCourtForm = () => {
    setCourtForm({
      name: '',
      city: '',
      address: '',
      coordinates: { lat: 55.751244, lng: 37.618423 },
      type: 'indoor',
      phone: '',
      workingHours: '',
      description: '',
      image: '',
      amenities: [],
      prices: [{ time: '09:00 – 18:00', weekday: 1000, weekend: 1200 }]
    });
  };

  const resetArticleForm = () => {
    setArticleForm({
      title: '',
      excerpt: '',
      content: '',
      category: 'Новости клубов',
      readTime: 5,
      author: 'Редакция PadelRussia',
      image: '',
      published: true
    });
  };

  const openCourtForm = (court?: Court) => {
    if (court) {
      setCourtForm({
        name: court.name,
        city: court.city,
        address: court.address,
        coordinates: court.coordinates || { lat: 55.751244, lng: 37.618423 },
        type: court.type,
        phone: court.phone || '',
        workingHours: court.workingHours || '',
        description: court.description || '',
        image: court.image || '',
        amenities: court.amenities || [],
        prices: court.prices || [{ time: '09:00 – 18:00', weekday: 1000, weekend: 1200 }]
      });
      setEditingItem(court);
    } else {
      resetCourtForm();
      setEditingItem(null);
    }
    setShowForm(true);
  };

  const openArticleForm = (article?: Article) => {
    if (article) {
      setArticleForm({
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        readTime: article.readTime,
        author: article.author,
        image: article.image || '',
        published: article.published
      });
      setEditingItem(article);
    } else {
      resetArticleForm();
      setEditingItem(null);
    }
    setShowForm(true);
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
      <SEOHead title="Админ-панель" description="Управление контентом PadelRussia — корты и статьи." />
      <div className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-4"
              >
                <ArrowLeft size={16} /> На главную
              </Link>
              <h1 className="font-display font-bold text-3xl">Админ-панель</h1>
              <p className="text-muted-foreground">Управление контентом PadelRussia</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('courts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'courts'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Корты ({courts.length})
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'articles'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Статьи ({articles.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'courts' ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-xl">Управление кортами</h2>
                <button
                  onClick={() => openCourtForm()}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} />
                  Добавить корт
                </button>
              </div>

              <div className="grid gap-4">
                {courts.map((court) => (
                  <div key={court.id} className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={court.image}
                          alt={court.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                          <h3 className="font-semibold">{court.name}</h3>
                          <p className="text-sm text-muted-foreground">{court.city} · {court.address}</p>
                          <p className="text-xs text-muted-foreground">⭐ {court.rating} ({court.reviewCount} отзывов)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/courts/${court.slug}`}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Просмотр"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => openCourtForm(court)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Редактировать"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCourt(court.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-xl">Управление статьями</h2>
                <button
                  onClick={() => openArticleForm()}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} />
                  Добавить статью
                </button>
              </div>

              <div className="grid gap-4">
                {articles.map((article) => (
                  <div key={article.id} className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                          <h3 className="font-semibold">{article.title}</h3>
                          <p className="text-sm text-muted-foreground">{article.category} · {article.author}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(article.createdAt).toLocaleDateString("ru-RU")} · {article.readTime} мин
                            {!article.published && ' · Не опубликовано'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/news/${article.slug}`}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Просмотр"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => openArticleForm(article)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Редактировать"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-xl">
                      {editingItem ? 'Редактировать' : 'Добавить'} {activeTab === 'courts' ? 'корт' : 'статью'}
                    </h3>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {activeTab === 'courts' ? (
                    // Court Form
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Название</label>
                          <input
                            type="text"
                            value={courtForm.name}
                            onChange={(e) => setCourtForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            placeholder="Название корта"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Город</label>
                          <input
                            type="text"
                            value={courtForm.city}
                            onChange={(e) => setCourtForm(prev => ({ ...prev, city: e.target.value }))}
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
                          onChange={(e) => setCourtForm(prev => ({ ...prev, address: e.target.value }))}
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
                            onChange={(e) => setCourtForm(prev => ({
                              ...prev,
                              coordinates: { ...prev.coordinates, lat: parseFloat(e.target.value) || 0 }
                            }))}
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
                            onChange={(e) => setCourtForm(prev => ({
                              ...prev,
                              coordinates: { ...prev.coordinates, lng: parseFloat(e.target.value) || 0 }
                            }))}
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
                            onChange={(e) => setCourtForm(prev => ({ ...prev, type: e.target.value as any }))}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary rounded-lg [&>option]:bg-background [&>option]:text-foreground [&>option]:rounded-lg"
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
                            onChange={(e) => setCourtForm(prev => ({ ...prev, phone: e.target.value }))}
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
                          onChange={(e) => setCourtForm(prev => ({ ...prev, workingHours: e.target.value }))}
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
                                onChange={(e) => updatePrice(index, 'time', e.target.value)}
                                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                placeholder="Время"
                              />
                              <input
                                type="number"
                                value={price.weekday}
                                onChange={(e) => updatePrice(index, 'weekday', parseInt(e.target.value) || 0)}
                                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                placeholder="Будни"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  value={price.weekend}
                                  onChange={(e) => updatePrice(index, 'weekend', parseInt(e.target.value) || 0)}
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
                          onChange={(e) => setCourtForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          placeholder="Описание корта"
                        />
                      </div>
                    </div>
                  ) : (
                    // Article Form
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Заголовок</label>
                        <input
                          type="text"
                          value={articleForm.title}
                          onChange={(e) => setArticleForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          placeholder="Заголовок статьи"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Краткое описание</label>
                        <textarea
                          value={articleForm.excerpt}
                          onChange={(e) => setArticleForm(prev => ({ ...prev, excerpt: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          placeholder="Краткое описание статьи"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Полный текст</label>
                        <textarea
                          value={articleForm.content}
                          onChange={(e) => setArticleForm(prev => ({ ...prev, content: e.target.value }))}
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
                            onChange={(e) => setArticleForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary rounded-lg [&>option]:bg-background [&>option]:text-foreground [&>option]:rounded-lg"
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
                            onChange={(e) => setArticleForm(prev => ({ ...prev, readTime: parseInt(e.target.value) || 1 }))}
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
                          onChange={(e) => setArticleForm(prev => ({ ...prev, author: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          placeholder="Имя автора"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="published"
                          checked={articleForm.published}
                          onChange={(e) => setArticleForm(prev => ({ ...prev, published: e.target.checked }))}
                          className="rounded border-border"
                        />
                        <label htmlFor="published" className="text-sm font-medium">Опубликовано</label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Save size={16} />
                    {editingItem ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}