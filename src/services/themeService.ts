/**
 * Theme Service for Rajawali Cycle Enterprise
 * Supports Dark Mode ('dark'), Light Mode ('light'), and System Mode ('system').
 * Ensures optimal contrast and legibility across Mobile (iOS/Android) and Desktop PC.
 */

export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'rajawali_theme_mode';

export const themeService = {
  /**
   * Get the saved preference from localStorage ('dark', 'light', or 'system')
   */
  getThemePreference(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'dark'; // default theme is dark
  },

  /**
   * Get the active effective theme ('dark' or 'light')
   */
  getResolvedTheme(): 'dark' | 'light' {
    const pref = this.getThemePreference();
    if (pref === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return pref;
  },

  /**
   * Set theme preference and apply classes to document root
   */
  setTheme(theme: ThemeMode): 'dark' | 'light' {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    const resolved = this.applyTheme(theme);
    window.dispatchEvent(new CustomEvent('theme_changed', { detail: { theme, resolved } }));
    return resolved;
  },

  /**
   * Toggle between dark and light mode
   */
  toggleTheme(): 'dark' | 'light' {
    const current = this.getResolvedTheme();
    const nextTheme: ThemeMode = current === 'dark' ? 'light' : 'dark';
    return this.setTheme(nextTheme);
  },

  /**
   * Internal apply logic to HTML root and meta theme-color
   */
  applyTheme(theme?: ThemeMode): 'dark' | 'light' {
    const pref = theme || this.getThemePreference();
    let resolved: 'dark' | 'light' = 'dark';

    if (pref === 'system') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      resolved = pref;
    }

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Set meta theme-color for browser tab and mobile status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolved === 'dark' ? '#020617' : '#f8fafc');
    }

    // Apple mobile status bar
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute('content', resolved === 'dark' ? 'black-translucent' : 'default');
    }

    return resolved;
  },

  /**
   * Initialize theme on app boot and register system OS theme listener
   */
  initTheme() {
    this.applyTheme();

    // Listen for OS system theme change if preference is 'system'
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        if (this.getThemePreference() === 'system') {
          this.applyTheme('system');
          window.dispatchEvent(
            new CustomEvent('theme_changed', {
              detail: { theme: 'system', resolved: this.getResolvedTheme() }
            })
          );
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(listener);
      }
    }
  }
};
