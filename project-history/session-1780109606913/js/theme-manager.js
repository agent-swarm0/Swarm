// js/theme-manager.js
// Theme Management System
class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.applyTheme(this.currentTheme);
    this.initializeToggle();
    this.listenForSystemThemeChanges();
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  getStoredTheme() {
    return localStorage.getItem('theme');
  }

  applyTheme(theme) {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('theme');
      this.currentTheme = this.getSystemTheme(); // Set currentTheme to actual system preference for UI update
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      this.currentTheme = theme;
    }
    this.updateToggleUI();
  }

  initializeToggle() {
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        if (e.target.closest('.theme-toggle-option')) {
          const newTheme = e.target.closest('.theme-toggle-option').dataset.theme;
          this.applyTheme(newTheme);
        }
      });
    }
  }

  updateToggleUI() {
    const options = document.querySelectorAll('.theme-toggle-option');
    options.forEach(option => {
      const isSystemPreference = (option.dataset.theme === 'system' && !this.getStoredTheme());
      const isActiveTheme = (option.dataset.theme === this.currentTheme && !isSystemPreference) || isSystemPreference;
      
      option.classList.toggle('active', isActiveTheme);
      option.setAttribute('aria-checked', isActiveTheme);
    });
  }

  listenForSystemThemeChanges() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!this.getStoredTheme()) { // Only react to system changes if user hasn't set a preference
        this.applyTheme('system'); // Re-apply system theme to update colors
      }
    });
  }
}

// Initialize theme management
document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager();
});