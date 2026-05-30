// js/theme-manager.js
export const ThemeManager = (() => {
    const THEME_KEY = 'stellarvault-theme';
    const THEME_CHANGE_EVENT = 'themeChange';

    /**
     * Applies the given theme to the document's root element.
     * @param {string} theme - 'light', 'dark', or 'system-preference'. This is the *preferred* theme.
     */
    function applyTheme(preferredTheme) {
        const root = document.documentElement;
        // Remove existing theme classes
        root.classList.remove('theme-light', 'theme-dark', 'theme-system-preference');

        let actualTheme = preferredTheme;
        // Resolve 'system-preference' to actual light/dark based on current system setting for application
        if (preferredTheme === 'system-preference') {
            actualTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        root.classList.add(`theme-${actualTheme}`);
        root.setAttribute('data-theme', actualTheme); // For easier CSS targeting, always reflects actual
        root.setAttribute('data-preferred-theme', preferredTheme); // Store user's preferred setting (could be 'system-preference')
    }

    /**
     * Determines the theme to load based on localStorage and system preference.
     * @returns {string} The resolved theme ('light', 'dark', or 'system-preference'). This is the *stored preference*.
     */
    function resolveStoredPreference() {
        const storedTheme = localStorage.getItem(THEME_KEY);
        if (['light', 'dark', 'system-preference'].includes(storedTheme)) {
            return storedTheme;
        }
        return 'system-preference'; // Default to system preference if nothing valid stored
    }

    /**
     * Loads the theme from localStorage or system preference and applies it.
     */
    function loadAndApplyTheme() {
        const preferredTheme = resolveStoredPreference();
        applyTheme(preferredTheme);
        return preferredTheme; // Return the loaded preferred theme for verification
    }

    /**
     * Sets a new theme and persists it to localStorage.
     * Dispatches a custom event.
     * @param {string} newTheme - 'light', 'dark', or 'system-preference'.
     */
    function setTheme(newTheme) {
        if (!['light', 'dark', 'system-preference'].includes(newTheme)) {
            console.warn(`Invalid theme '${newTheme}' attempted to be set. Must be 'light', 'dark', or 'system-preference'.`);
            return;
        }
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
        document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { 
            detail: { 
                theme: document.documentElement.getAttribute('data-theme'), // actual applied theme
                preferred: newTheme 
            } 
        }));
    }

    /**
     * Toggles the theme between light, dark, and system preference.
     */
    function toggleTheme() {
        const currentPreferredTheme = resolveStoredPreference();
        let nextTheme;
        switch (currentPreferredTheme) {
            case 'light':
                nextTheme = 'dark';
                break;
            case 'dark':
                nextTheme = 'system-preference';
                break;
            case 'system-preference':
            default: // Catches invalid or system-preference
                nextTheme = 'light';
                break;
        }
        setTheme(nextTheme);
    }

    /**
     * Initializes the theme manager, loading the initial theme and setting up event listeners.
     */
    function initTheme() {
        loadAndApplyTheme();

        // Listen for system preference changes and update if theme is 'system-preference'
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (resolveStoredPreference() === 'system-preference') {
                    // If user prefers system, re-apply to reflect change
                    applyTheme('system-preference');
                    document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { 
                        detail: { 
                            theme: e.matches ? 'dark' : 'light', 
                            preferred: 'system-preference', 
                            source: 'system' 
                        } 
                    }));
                }
            });
        }
    }

    return {
        initTheme,
        loadAndApplyTheme, // Exposing for initial check by tests
        setTheme,
        toggleTheme,
        resolveStoredPreference, // Exposing for internal logic check by tests
        THEME_CHANGE_EVENT
    };
})();