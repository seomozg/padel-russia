import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description?: string;
}

export default function SEOHead({ title, description }: SEOHeadProps) {
  const fullTitle = `${title} — PadelRussia`;
  const metaDescription = description || "Поиск падел-кортов и клубов по всей России.";

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", metaDescription);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", metaDescription, true);
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", metaDescription);
  }, [fullTitle, metaDescription]);

  return null;
}
