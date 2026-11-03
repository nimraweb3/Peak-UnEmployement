import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { MotionConfig } from "motion/react";
import App from "./App";
import { SessionProvider } from "./contexts/session";
import { Preferences, usePreferences } from "./contexts/preferences";
import "./styles.css";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: true },
  },
});
function Root() {
  const { reduced, theme } = usePreferences();
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <SessionProvider>
        <App />
        <Toaster
          theme={theme === "daylight" ? "light" : "dark"}
          position="bottom-right"
          richColors
          closeButton
        />
      </SessionProvider>
    </MotionConfig>
  );
}
if (import.meta.env.VITE_ANALYTICS_TOKEN) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute(
    "data-cf-beacon",
    JSON.stringify({ token: import.meta.env.VITE_ANALYTICS_TOKEN }),
  );
  document.head.append(script);
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Preferences>
          <Root />
        </Preferences>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
