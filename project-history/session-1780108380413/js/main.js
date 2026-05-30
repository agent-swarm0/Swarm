// js/main.js
import { ThemeManager } from './theme-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme Manager
    ThemeManager.initTheme();

    // Attach theme toggle functionality
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            ThemeManager.toggleTheme();
        });

        // Update button text/icon based on current theme for accessibility/UX
        document.addEventListener(ThemeManager.THEME_CHANGE_EVENT, (event) => {
            const preferredTheme = event.detail.preferred; // The user's preferred setting (light, dark, system-preference)
            let ariaLabel = '';

            // Update visible icons based on data-preferred-theme in CSS
            // The text content should be visually hidden for screen readers
            switch (preferredTheme) {
                case 'light':
                    ariaLabel = 'Current theme: Light. Click to switch to Dark.';
                    break;
                case 'dark':
                    ariaLabel = 'Current theme: Dark. Click to switch to System Preference.';
                    break;
                case 'system-preference':
                default:
                    const actualSystemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    ariaLabel = `Current theme: System Preference (${actualSystemTheme}). Click to switch to Light.`;
                    break;
            }
            // Assume the icons are handled by CSS classes on the spans inside the button
            themeToggleButton.setAttribute('aria-label', ariaLabel);
        });

        // Dispatch an initial event to correctly set the button's aria-label and icon visibility
        // in case initTheme completed before the event listener was attached.
        const initialPreferredTheme = ThemeManager.resolveStoredPreference();
        const initialEvent = new CustomEvent(ThemeManager.THEME_CHANGE_EVENT, {
            detail: {
                theme: document.documentElement.getAttribute('data-theme'), // Actual applied theme
                preferred: initialPreferredTheme
            }
        });
        document.dispatchEvent(initialEvent);
    }
});