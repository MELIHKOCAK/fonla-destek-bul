export const THEME_STORAGE_KEY = "benifonla-theme";

/**
 * Senkron çalışan inline script. <head> içinde Scripts ile basılır,
 * böylece sayfanın ilk paint'inden önce .dark sınıfı doğru ayarlanır
 * ve theme flash (FOUC) yaşanmaz.
 */
export const themeInitScript = `(() => {
  try {
    var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    var stored = null;
    try { stored = window.localStorage.getItem(storageKey); } catch (e) {}
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var isDark = theme === 'dark' || (theme === 'system' && systemDark);
    var root = document.documentElement;
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();`;
