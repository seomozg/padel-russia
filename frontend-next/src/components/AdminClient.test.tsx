import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

// Vitest без globals не делает авто-cleanup у @testing-library — чистим сами
afterEach(() => {
  cleanup();
});

// next/link вне Next.js-рантайма требует App Router context — заменяем на <a>
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href?: unknown }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getCourts: vi.fn(),
    getArticles: vi.fn(),
    uploadImage: vi.fn(),
    createCourt: vi.fn(),
    updateCourt: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    deleteCourt: vi.fn(),
    deleteArticle: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import AdminClient from "./AdminClient";

const testCourt = {
  id: "court-1",
  slug: "test-court",
  name: "Тестовый корт",
  city: "Москва",
  address: "ул. Тестовая, 1",
  rating: 5,
  reviewCount: 0,
  likes: 0,
  courtsCount: 1,
  type: "indoor" as const,
  image: "",
  amenities: ["Парковка"],
  phone: "+7 900 000-00-00",
  workingHours: "Пн-Вс: 09:00-22:00",
  description: "Описание",
  prices: [{ time: "09:00 – 18:00", weekday: 1000, weekend: 1200 }],
  reviews: [],
  coordinates: { lat: 55.75, lng: 37.61 },
  tags: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("AdminClient — формы добавления/редактирования", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getCourts as ReturnType<typeof vi.fn>).mockResolvedValue([testCourt]);
    (api.getArticles as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("открывает форму добавления корта со всеми полями", async () => {
    render(<AdminClient />);

    const addButton = await screen.findByText("Добавить корт");
    fireEvent.click(addButton);

    // Заголовок модалки и кнопка создания
    expect(screen.getByText("Добавить корт")).toBeTruthy();
    expect(screen.getByText("Создать")).toBeTruthy();

    // Основные поля формы
    expect(screen.getByPlaceholderText("Название корта")).toBeTruthy();
    expect(screen.getByPlaceholderText("Город")).toBeTruthy();
    expect(screen.getByPlaceholderText("Адрес корта")).toBeTruthy();
    expect(screen.getByPlaceholderText("55.751244")).toBeTruthy();
    expect(screen.getByPlaceholderText("37.618423")).toBeTruthy();
    expect(screen.getByPlaceholderText("+7 (XXX) XXX-XX-XX")).toBeTruthy();

    // Динамические секции
    expect(screen.getByText("Добавить удобство")).toBeTruthy();
    expect(screen.getByText("Добавить цену")).toBeTruthy();
    expect(screen.getByText("Описание")).toBeTruthy();

    // Форма показана поверх, а список скрыт
    expect(screen.queryByText("Тестовый корт")).toBeNull();
  });

  it("открывает форму редактирования с данными корта", async () => {
    render(<AdminClient />);

    await screen.findByText("Тестовый корт");
    const row = screen.getByText("Тестовый корт").closest(".card-sport");
    expect(row).toBeTruthy();

    // Кнопки в строке: [0] = Edit (Link — роль link, в getAllByRole не попадает)
    const buttons = within(row as HTMLElement).getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(screen.getByText("Редактировать корт")).toBeTruthy();
    expect(screen.getByText("Сохранить")).toBeTruthy();

    const nameInput = screen.getByPlaceholderText("Название корта") as HTMLInputElement;
    expect(nameInput.value).toBe("Тестовый корт");
    expect((screen.getByPlaceholderText("Адрес корта") as HTMLInputElement).value).toBe(
      "ул. Тестовая, 1"
    );
    expect((screen.getByPlaceholderText("55.751244") as HTMLInputElement).value).toBe("55.75");
  });

  it("переключает вкладку и открывает форму статьи", async () => {
    render(<AdminClient />);

    await screen.findByText("Добавить корт");
    fireEvent.click(screen.getByRole("button", { name: /Статьи \(/ }));

    fireEvent.click(screen.getByText("Добавить статью"));

    expect(screen.getByText("Добавить статью")).toBeTruthy();
    expect(screen.getByPlaceholderText("Заголовок статьи")).toBeTruthy();
    expect(screen.getByPlaceholderText("Краткое описание статьи")).toBeTruthy();
    expect(screen.getByPlaceholderText("Полный текст статьи")).toBeTruthy();
    expect(screen.getByText("Опубликовано")).toBeTruthy();
  });

  it("закрывает форму по кнопке «Отмена»", async () => {
    render(<AdminClient />);

    fireEvent.click(await screen.findByText("Добавить корт"));
    expect(screen.getByPlaceholderText("Название корта")).toBeTruthy();

    fireEvent.click(screen.getByText("Отмена"));

    expect(screen.queryByPlaceholderText("Название корта")).toBeNull();
    expect(screen.getByText("Добавить корт")).toBeTruthy();
  });
});