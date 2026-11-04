import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
const Context = createContext({
  theme: "light",
  setTheme: (_v: string) => {},
  reduced: false,
  setReduced: (_v: boolean) => {},
  announcements: false,
  setAnnouncements: (_v: boolean) => {},
});
export function Preferences({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState("light");
  const [reduced, setReduced] = useState(false);
  const [announcements, setAnnouncements] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("pu-theme");
    setTheme(saved === "dark" ? "dark" : "light");
    setReduced(
      localStorage.getItem("pu-reduced") === "true" ||
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setAnnouncements(localStorage.getItem("pu-announcements") === "true");
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.reduced = String(reduced);
    localStorage.setItem("pu-theme", theme);
    localStorage.setItem("pu-reduced", String(reduced));
    localStorage.setItem("pu-announcements", String(announcements));
  }, [theme, reduced, announcements, ready]);
  return (
    <Context.Provider
      value={{
        theme,
        setTheme,
        reduced,
        setReduced,
        announcements,
        setAnnouncements,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePreferences = () => useContext(Context);
