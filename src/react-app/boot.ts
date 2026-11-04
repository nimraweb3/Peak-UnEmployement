// Public HTML and its stylesheet can paint before the interactive app downloads.
// Public links remain usable during this brief progressive-enhancement window.
const informationalPage = [
  "/privacy",
  "/terms",
  "/community-guidelines",
].includes(location.pathname);
// These pages are complete server-rendered documents with ordinary links.
if (!import.meta.env.PROD || !informationalPage) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void import("./main");
    });
  });
}
