// js/theme-manager.test.js
import { ThemeManager } from './theme-manager';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        clear: jest.fn(() => { store = {}; }),
        removeItem: jest.fn(key => { delete store[key]; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock document.documentElement
const mockDocumentElement = {
    classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
    },
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
};
Object.defineProperty(document, 'documentElement', { value: mockDocumentElement });

// Mock window.matchMedia for system preference
const mockMatchMedia = (matches) => jest.fn(() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null, // old API
    addEventListener: jest.fn((event, callback) => {
        if (event === 'change') {
            mockMatchMedia.changeListeners.push(callback);
        }
    }),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));
mockMatchMedia.changeListeners = []; // To hold event listeners added by initTheme
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(false) }); // Default to light system

describe('ThemeManager', () => {
    const THEME_KEY = 'stellarvault-theme';
    const THEME_CHANGE_EVENT = 'themeChange';

    beforeEach(() => {
        localStorageMock.clear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        mockDocumentElement.classList.add.mockClear();
        mockDocumentElement.classList.remove.mockClear();
        mockDocumentElement.setAttribute.mockClear();
        mockDocumentElement.getAttribute.mockClear();
        jest.spyOn(document, 'dispatchEvent');

        // Reset matchMedia to default light and clear listeners
        Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(false) });
        mockMatchMedia.changeListeners = [];
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Helper to simulate system preference change
    const simulateSystemPreferenceChange = (prefersDark) => {
        // Update the matchMedia mock to reflect the new preference
        Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(prefersDark) });
        // Call the stored listeners
        mockMatchMedia.changeListeners.forEach(listener => {
            listener({ matches: prefersDark, media: '(prefers-color-scheme: dark)' });
        });
    };

    describe('resolveStoredPreference', () => {
        test('should return "system-preference" if no theme is stored', () => {
            expect(ThemeManager.resolveStoredPreference()).toBe('system-preference');
            expect(localStorageMock.getItem).toHaveBeenCalledWith(THEME_KEY);
        });

        test('should return "light" if "light" is stored', () => {
            localStorageMock.setItem(THEME_KEY, 'light');
            expect(ThemeManager.resolveStoredPreference()).toBe('light');
        });

        test('should return "dark" if "dark" is stored', () => {
            localStorageMock.setItem(THEME_KEY, 'dark');
            expect(ThemeManager.resolveStoredPreference()).toBe('dark');
        });

        test('should return "system-preference" if "system-preference" is stored', () => {
            localStorageMock.setItem(THEME_KEY, 'system-preference');
            expect(ThemeManager.resolveStoredPreference()).toBe('system-preference');
        });

        test('should return "system-preference" for invalid stored theme', () => {
            localStorageMock.setItem(THEME_KEY, 'invalid-theme');
            expect(ThemeManager.resolveStoredPreference()).toBe('system-preference');
        });
    });

    describe('loadAndApplyTheme', () => {
        test('should apply "dark" theme if localStorage has "dark"', () => {
            localStorageMock.setItem(THEME_KEY, 'dark');
            ThemeManager.loadAndApplyTheme();
            expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('theme-light', 'theme-dark', 'theme-system-preference');
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'dark');
        });

        test('should apply "light" theme if localStorage has "light"', () => {
            localStorageMock.setItem(THEME_KEY, 'light');
            ThemeManager.loadAndApplyTheme();
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-light');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'light');
        });

        test('should apply system preference theme if localStorage is "system-preference" and system prefers dark', () => {
            localStorageMock.setItem(THEME_KEY, 'system-preference');
            Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(true) }); // System prefers dark
            ThemeManager.loadAndApplyTheme();
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark'); // Actual theme applied
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'system-preference');
        });

        test('should apply system preference theme if localStorage is "system-preference" and system prefers light', () => {
            localStorageMock.setItem(THEME_KEY, 'system-preference');
            Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(false) }); // System prefers light
            ThemeManager.loadAndApplyTheme();
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-light'); // Actual theme applied
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'system-preference');
        });

        test('should apply light theme if no theme stored and system prefers light (default)', () => {
            // Default matchMedia is mockMatchMedia(false)
            ThemeManager.loadAndApplyTheme();
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-light');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'system-preference'); // Because it resolves to system-preference
        });

        test('should apply dark theme if no theme stored and system prefers dark', () => {
            Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(true) }); // System prefers dark
            ThemeManager.loadAndApplyTheme();
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'system-preference');
        });
    });

    describe('setTheme', () => {
        test('should set theme to "light" and dispatch event', () => {
            // Mock data-theme attribute on documentElement
            mockDocumentElement.getAttribute.mockReturnValue('light');

            ThemeManager.setTheme('light');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'light');
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-light');
            expect(mockDocumentElement.classList.remove).toHaveBeenCalled();
            expect(document.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({ type: THEME_CHANGE_EVENT, detail: { theme: 'light', preferred: 'light' } })
            );
        });

        test('should set theme to "dark" and dispatch event', () => {
            // Mock data-theme attribute on documentElement
            mockDocumentElement.getAttribute.mockReturnValue('dark');

            ThemeManager.setTheme('dark');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'dark');
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark');
            expect(document.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({ type: THEME_CHANGE_EVENT, detail: { theme: 'dark', preferred: 'dark' } })
            );
        });

        test('should set theme to "system-preference" and dispatch event, applying actual system theme', () => {
            Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(true) }); // System prefers dark
            mockDocumentElement.getAttribute.mockReturnValue('dark'); // Simulate data-theme being 'dark'

            ThemeManager.setTheme('system-preference');
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'system-preference');
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark'); // Actual applied theme based on system
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'system-preference');
            expect(document.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({ type: THEME_CHANGE_EVENT, detail: { theme: 'dark', preferred: 'system-preference' } })
            );
        });

        test('should not set theme for invalid input and warn', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            ThemeManager.setTheme('invalid');
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
            expect(mockDocumentElement.classList.add).not.toHaveBeenCalled();
            expect(document.dispatchEvent).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid theme 'invalid'"));
            consoleWarnSpy.mockRestore();
        });
    });

    describe('toggleTheme', () => {
        test('should toggle from light to dark', () => {
            localStorageMock.setItem(THEME_KEY, 'light');
            ThemeManager.toggleTheme();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'dark');
        });

        test('should toggle from dark to system-preference', () => {
            localStorageMock.setItem(THEME_KEY, 'dark');
            ThemeManager.toggleTheme();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'system-preference');
        });

        test('should toggle from system-preference to light', () => {
            localStorageMock.setItem(THEME_KEY, 'system-preference');
            ThemeManager.toggleTheme();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'light');
        });

        test('should cycle correctly if no theme is initially stored (starts as system-preference, then light, then dark, etc.)', () => {
            // Initial state: no theme stored, resolveStoredPreference defaults to 'system-preference'
            // toggleTheme() -> from 'system-preference' to 'light'
            ThemeManager.toggleTheme(); 
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'light');
            
            // Clear mocks and set for next toggle
            localStorageMock.setItem.mockClear();
            localStorageMock.getItem.mockClear();
            localStorageMock.setItem(THEME_KEY, 'light'); // Simulate new stored theme for next toggle

            // toggleTheme() -> from 'light' to 'dark'
            ThemeManager.toggleTheme(); 
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'dark');

            // Clear mocks and set for next toggle
            localStorageMock.setItem.mockClear();
            localStorageMock.getItem.mockClear();
            localStorageMock.setItem(THEME_KEY, 'dark'); // Simulate new stored theme for next toggle

            // toggleTheme() -> from 'dark' to 'system-preference'
            ThemeManager.toggleTheme(); 
            expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_KEY, 'system-preference');
        });
    });

    describe('initTheme', () => {
        test('should load and apply theme on initialization', () => {
            const loadAndApplyThemeSpy = jest.spyOn(ThemeManager, 'loadAndApplyTheme');
            ThemeManager.initTheme();
            expect(loadAndApplyThemeSpy).toHaveBeenCalled();
            loadAndApplyThemeSpy.mockRestore();
        });

        test('should set up event listener for system preference changes', () => {
            ThemeManager.initTheme();
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        test('should update theme if preferred is "system-preference" and system preference changes', () => {
            localStorageMock.setItem(THEME_KEY, 'system-preference');
            // Mock initial state: system is light, so data-theme will be light
            Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(false) });
            ThemeManager.initTheme(); 
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'system-preference');

            mockDocumentElement.classList.add.mockClear();
            mockDocumentElement.setAttribute.mockClear();
            document.dispatchEvent.mockClear();

            // Simulate system preference change to dark
            simulateSystemPreferenceChange(true); 

            expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('theme-light', 'theme-dark', 'theme-system-preference');
            expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('theme-dark');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-preferred-theme', 'system-preference'); // Preferred setting remains system-preference
            expect(document.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({ type: THEME_CHANGE_EVENT, detail: { theme: 'dark', preferred: 'system-preference', source: 'system' } })
            );
        });

        test('should NOT update theme if preferred is NOT "system-preference" and system preference changes', () => {
            localStorageMock.setItem(THEME_KEY, 'light'); // User prefers light
            // Mock initial state: system is dark (irrelevant for this test as preference is fixed)
            Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia(true) });
            ThemeManager.initTheme(); 
            expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
            mockDocumentElement.classList.add.mockClear();
            mockDocumentElement.setAttribute.mockClear();
            document.dispatchEvent.mockClear();

            simulateSystemPreferenceChange(false); // System preference changes to light (but user still prefers 'light')

            expect(mockDocumentElement.classList.add).not.toHaveBeenCalled(); // No change to theme class
            expect(document.dispatchEvent).not.toHaveBeenCalledWith(
                expect.objectContaining({ source: 'system' })
            ); // No system change event dispatched
        });
    });
});