// API-клиент для PadelRussia
// В Next.js используется как на сервере (SSR — fetch к backend), так и на клиенте.
// process.env.NEXT_PUBLIC_API_URL доступен и на сервере, и на клиенте.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface Court {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  rating: number;
  reviewCount: number;
  likes: number;
  courtsCount: number;
  type: "indoor" | "outdoor" | "mixed";
  image?: string;
  amenities: string[] | null;
  phone?: string;
  workingHours?: string;
  description?: string;
  prices: { time: string; weekday: number; weekend: number }[] | null;
  reviews: Review[];
  coordinates: { lat: number; lng: number } | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  _count?: { reviews: number };
}

export interface Review {
  id: string;
  courtId: string;
  userId?: string;
  authorName?: string;
  rating: number;
  text: string;
  date: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  category: string;
  readTime: number;
  author: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available (только на клиенте)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await fetch(url, { ...config, cache: 'no-store' });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Handle empty responses (204 No Content)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return undefined as T;
    }

    return response.json();
  }

  // Courts API
  async getCourts(params?: {
    city?: string;
    type?: string;
    sort?: string;
    search?: string;
  }): Promise<Court[]> {
    const searchParams = new URLSearchParams();
    if (params?.city) searchParams.set('city', params.city);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return this.request<Court[]>(`/courts${query ? `?${query}` : ''}`);
  }

  async getCourt(slug: string): Promise<Court> {
    return this.request<Court>(`/courts/${slug}`);
  }

  async createCourt(data: Omit<Court, "id" | "createdAt" | "updatedAt" | "reviews">): Promise<Court> {
    return this.request<Court>("/courts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCourt(id: string, data: Partial<Court>): Promise<Court> {
    return this.request<Court>(`/courts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCourt(id: string): Promise<void> {
    return this.request<void>(`/courts/${id}`, {
      method: "DELETE",
    });
  }

  async getCourtReviews(courtId: string): Promise<Review[]> {
    return this.request<Review[]>(`/courts/${courtId}/reviews`);
  }

  // Reviews API
  async createReview(data: {
    courtId: string;
    userId?: string;
    authorName?: string;
    rating: number;
    text: string;
  }): Promise<Review> {
    return this.request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Articles API
  async getArticles(params?: {
    category?: string;
    limit?: number;
  }): Promise<Article[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<Article[]>(`/articles${query ? `?${query}` : ''}`);
  }

  async getArticle(slug: string): Promise<Article> {
    return this.request<Article>(`/articles/${slug}`);
  }

  async createArticle(data: Omit<Article, "id" | "createdAt" | "updatedAt">): Promise<Article> {
    return this.request<Article>("/articles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateArticle(id: string, data: Partial<Article>): Promise<Article> {
    return this.request<Article>(`/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteArticle(id: string): Promise<void> {
    return this.request<void>(`/articles/${id}`, {
      method: "DELETE",
    });
  }

  // Upload API
  async uploadImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${this.baseURL}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }
}

export const api = new ApiClient(API_BASE_URL);
