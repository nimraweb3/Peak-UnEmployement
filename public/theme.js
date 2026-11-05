(() => {
  let preference = "light";
  const media = matchMedia("(prefers-color-scheme: dark)");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => {
    let reduced = false;
    try {
      preference = localStorage.getItem("pu-theme") || preference;
      reduced = localStorage.getItem("pu-reduced") === "true";
    } catch {
      /* Storage is optional. */
    }
    const dark =
      preference === "dark" || (preference === "system" && media.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.reduced = String(
      reduced || motion.matches,
    );
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#11151B" : "#F8F7F2");
  };
  apply();
  media.addEventListener("change", apply);
  motion.addEventListener("change", apply);
  // The server-rendered selector works even before React is downloaded.
  document.addEventListener("change", (event) => {
    if (
      !(event.target instanceof HTMLSelectElement) ||
      !event.target.matches(".theme-select")
    )
      return;
    preference = event.target.value;
    try {
      localStorage.setItem("pu-theme", preference);
    } catch {
      /* Storage is optional. */
    }
    apply();
  });
})();
