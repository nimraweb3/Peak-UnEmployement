import { useEffect } from "react";
import { useLocation } from "react-router";
import { pageMetadata, structuredData } from "../../shared/seo";
export function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const origin = import.meta.env.VITE_SITE_URL || location.origin;
    const m = pageMetadata(pathname, origin);
    document.title = m.title;
    function meta(attr: string, key: string, value: string) {
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`,
      );
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    }
    meta("name", "description", m.description);
    meta("name", "robots", m.indexable ? "index, follow" : "noindex, nofollow");
    for (const [key, value] of Object.entries({
      "og:title": m.title,
      "og:description": m.description,
      "og:url": m.canonical,
      "og:image": m.image,
      "og:site_name": "Peak Unemployment",
      "og:type": "website",
    }))
      meta("property", key, value);
    for (const [key, value] of Object.entries({
      "twitter:card": "summary_large_image",
      "twitter:title": m.title,
      "twitter:description": m.description,
      "twitter:image": m.image,
    }))
      meta("name", key, value);
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = m.canonical;
    document
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((el) => el.remove());
    if (m.indexable) {
      const json = document.createElement("script");
      json.type = "application/ld+json";
      json.textContent = JSON.stringify(structuredData(new URL(origin).origin));
      document.head.appendChild(json);
    }
  }, [pathname]);
  return null;
}
