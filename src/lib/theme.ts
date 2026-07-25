// Tiny theme manager: toggles the `dark` class on <html>, persists to localStorage.
export type Theme = "light" | "dark" | "system";
const KEY = "mytijaara_theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem(KEY) as Theme | null) ?? "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  applyTheme(getStoredTheme());
}
