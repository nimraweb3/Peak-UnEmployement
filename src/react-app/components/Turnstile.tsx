import { useEffect, useRef } from "react";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  useEffect(() => {
    let id: string | undefined;
    let disposed = false;
    const render = () => {
      if (!disposed && ref.current && window.turnstile)
        id = window.turnstile.render(ref.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme: "auto",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        });
    };
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile]",
    );
    if (window.turnstile) render();
    else {
      if (!script) {
        script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.turnstile = "true";
        document.head.append(script);
      }
      script.addEventListener("load", render);
    }
    return () => {
      disposed = true;
      script?.removeEventListener("load", render);
      if (id) window.turnstile?.remove(id);
    };
  }, []);
  return <div ref={ref} className="turnstile" />;
}
