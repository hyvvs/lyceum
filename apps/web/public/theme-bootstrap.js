// Original app-private, synchronous UI appearance bootstrap: never reads learner
// content/identity/keys, contacts a network host or injects executable strings.
(() => {
  let saved = {};
  try {
    const raw = localStorage.getItem("lyceum.web.preferences.v1");
    const decoded = raw ? JSON.parse(raw) : null;
    if (decoded && typeof decoded === "object") saved = decoded;
  } catch {
    // Denied/corrupt localStorage is treated as a safe system default.
  }
  const theme = ["system", "light", "dark", "high-contrast"].includes(saved.theme)
    ? saved.theme
    : "dark";
  const transparency = ["reduced", "off"].includes(saved.transparency)
    ? saved.transparency
    : "full";
  const root = document.documentElement;
  const light = matchMedia("(prefers-color-scheme: light)").matches;
  root.dataset.theme =
    theme === "system" ? "auto" : theme === "high-contrast" ? (light ? "light" : "dark") : theme;
  if (theme === "high-contrast") root.dataset.contrast = "high";
  root.dataset.transparency = theme === "high-contrast" ? "off" : transparency;
  root.lang = saved.locale === "es" ? "es" : "en";
})();
