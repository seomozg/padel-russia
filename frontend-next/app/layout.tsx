import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import QueryClientProvider from "@/components/QueryClientProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import NavbarWrapper from "@/components/NavbarWrapper";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-unbounded",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://padel-russia.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PadelRussia — падел-корты России",
    template: "%s — PadelRussia",
  },
  description:
    "Поиск падел-кортов и клубов по всей России. Рейтинги, отзывы, карта кортов, новости падел-тенниса.",
  keywords: [
    "падел",
    "падел-теннис",
    "падел-корты",
    "падел-клубы",
    "падел Россия",
    "padel",
    "падел-корт",
    "где играть в падел",
  ],
  authors: [{ name: "PadelRussia" }],
  creator: "PadelRussia",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName: "PadelRussia",
    title: "PadelRussia — падел-корты России",
    description:
      "Поиск падел-кортов и клубов по всей России. Рейтинги, отзывы, карта кортов, новости падел-тенниса.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PadelRussia — падел-корты России",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PadelRussia — падел-корты России",
    description:
      "Поиск падел-кортов и клубов по всей России. Рейтинги, отзывы, карта кортов, новости падел-тенниса.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} ${unbounded.variable}`}>
        <ThemeProvider>
          <QueryClientProvider>
            <TooltipProvider>
              <NavbarWrapper />
              <main>{children}</main>
              <Footer />
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
