// Theme Management System
class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.applyTheme(this.currentTheme);
    this.initializeToggle();
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
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
    this.currentTheme = theme;
    this.updateToggleUI();
  }

  initializeToggle() {
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      // Set initial aria-checked state correctly
      const initialActiveOption = toggle.querySelector(`.theme-toggle-option[data-theme="${this.currentTheme}"]`);
      if (initialActiveOption) {
        initialActiveOption.setAttribute('aria-checked', 'true');
      } else if (this.currentTheme === 'system') {
        toggle.querySelector('.theme-toggle-option[data-theme="system"]').setAttribute('aria-checked', 'true');
      }


      toggle.addEventListener('click', (e) => {
        const targetOption = e.target.closest('.theme-toggle-option');
        if (targetOption) {
          const newTheme = targetOption.dataset.theme;
          this.applyTheme(newTheme);
        }
      });
    }
  }

  updateToggleUI() {
    const options = document.querySelectorAll('.theme-toggle-option');
    options.forEach(option => {
      const isActive = option.dataset.theme === this.currentTheme || 
                       (this.currentTheme === 'system' && option.dataset.theme === 'system' && !localStorage.getItem('theme'));
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }
}

// Initialize theme management
document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager();
});