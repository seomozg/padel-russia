import type { Metadata } from "next";
import AdminClient from "@/components/AdminClient";

export const metadata: Metadata = {
  title: "Админ-панель",
  description: "Управление контентом PadelRussia — корты и статьи.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
