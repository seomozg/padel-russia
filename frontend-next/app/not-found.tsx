import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена",
  description: "404 — запрашиваемая страница не существует.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Упс! Страница не найдена</p>
        <Link href="/" className="text-primary underline hover:text-primary/90">
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
