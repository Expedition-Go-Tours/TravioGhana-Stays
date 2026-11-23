/*
 * Applies the saved theme before first paint, so a dark-mode user never sees
 * a white flash. Loaded as a plain blocking <script src> in <head>: the meta
 * CSP allows 'self' scripts but not inline ones.
 *
 * Keep the key and rules in sync with src/stores/themeStore.ts.
 */
(function () {
  try {
    var mode = localStorage.getItem('stays-theme');
    if (mode !== 'light' && mode !== 'dark') mode = 'system';
    var dark =
      mode === 'dark' ||
      (mode === 'system' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    /* Storage blocked (private mode): fall back to the light theme. */
  }
})();
