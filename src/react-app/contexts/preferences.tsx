import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
const Context = createContext({
  theme: "light",
  resolvedTheme: "light",
  setTheme: (_v: string) => {},
  reduced: false,
  setReduced: (_v: boolean) => {},
  announcements: false,
  setAnnouncements: (_v: boolean) => {},
});
export function Preferences({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState("light");
  const [resolvedTheme, setResolvedTheme] = useState("light");
  const [reduced, setReduced] = useState(false);
  const [announcements, setAnnouncements] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };
    const saved = read("pu-theme");
    setTheme(saved === "dark" || saved === "system" ? saved : "light");
    setReduced(
      read("pu-reduced") === "true" ||
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setAnnouncements(read("pu-announcements") === "true");
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      setResolvedTheme(resolved);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.reduced = String(
        reduced || motion.matches,
      );
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "dark" ? "#11151B" : "#F8F7F2");
    };
    apply();
    media.addEventListener("change", apply);
    motion.addEventListener("change", apply);
    try {
      localStorage.setItem("pu-theme", theme);
      localStorage.setItem("pu-reduced", String(reduced));
      localStorage.setItem("pu-announcements", String(announcements));
    } catch {
      /* Preferences remain usable when storage is unavailable. */
    }
    return () => {
      media.removeEventListener("change", apply);
      motion.removeEventListener("change", apply);
    };
  }, [theme, reduced, announcements, ready]);
  return (
    <Context.Provider
      value={{
        theme,
        resolvedTheme,
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
