import { useEffect } from "react";
import { usePreferences } from "../contexts/preferences";
export function useAfterHoursMotion() {
  const { reduced } = usePreferences();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".after-hours");
    if (!root) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const depths = Array.from(
      root.querySelectorAll<HTMLElement>("[data-depth]"),
    );
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(".reveal-section"),
    );
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (reduced || media.matches) return;
        for (const node of depths) {
          const r = node.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) continue;
          const progress =
            (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
          node.style.setProperty(
            "--depth-y",
            Math.max(-1, Math.min(1, progress)) * Number(node.dataset.depth) +
              "px",
          );
        }
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    if (!reduced && !media.matches) {
      root.classList.add("motion-ready");
      sections.forEach((s) => observer.observe(s));
      window.addEventListener("scroll", refresh, { passive: true });
      refresh();
    }
    const tilt = (e: PointerEvent) => {
      if (reduced || media.matches || e.pointerType !== "mouse") return;
      const card = (e.target as Element).closest<HTMLElement>("[data-tilt]");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty(
        "--tilt-x",
        ((e.clientY - r.top) / r.height - 0.5) * -5 + "deg",
      );
      card.style.setProperty(
        "--tilt-y",
        ((e.clientX - r.left) / r.width - 0.5) * 5 + "deg",
      );
    };
    const reset = (e: PointerEvent) => {
      const card = (e.target as Element).closest<HTMLElement>("[data-tilt]");
      if (card && !card.contains(e.relatedTarget as Node)) {
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      }
    };
    root.addEventListener("pointermove", tilt);
    root.addEventListener("pointerout", reset);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", refresh);
      root.removeEventListener("pointermove", tilt);
      root.removeEventListener("pointerout", reset);
      root.classList.remove("motion-ready");
      depths.forEach((n) => n.style.removeProperty("--depth-y"));
    };
  }, [reduced]);
}
