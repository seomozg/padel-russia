import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Хлебные крошки" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 flex-wrap">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : ""}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={14} className="text-muted-foreground/50" />}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Генерирует JSON-LD BreadcrumbList для structured data.
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://padel-russia.online';
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      ...(item.href ? { "item": `${baseUrl}${item.href}` } : {}),
    })),
  };
}
