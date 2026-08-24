interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

/**
 * Компонент для вставки JSON-LD (structured data / Schema.org) в страницу.
 * Рендерит <script type="application/ld+json"> с переданными данными.
 * Используется для расширенных сниппетов в поисковой выдаче.
 */
export default function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
