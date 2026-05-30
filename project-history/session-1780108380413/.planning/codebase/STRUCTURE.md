# Codebase Structure

**Analysis Date:** 2024-07-30

## Directory Layout

```
[project-root]/
├── public/           # Static assets, images, fonts
├── css/              # All Cascading Style Sheets (CSS) files
│   ├── design-system.css # CSS variables for colors, typography, spacing, shadows
│   ├── layout.css        # Responsive layout patterns, containers, grids, flex utilities
│   ├── components.css    # Styles for reusable UI components
│   └── main.css          # Main stylesheet, imports others, global styles
├── js/               # All JavaScript files
│   ├── theme-manager.js  # Script for managing light/dark/system theme preferences
│   └── main.js           # Primary application JavaScript for interactivity and setup
├── pages/            # Individual HTML pages for application views
│   ├── dashboard.html    # Main dashboard view
│   ├── wallet.html       # User wallet management
│   ├── transactions.html # Transaction history and details
│   ├── fiat-on-off-ramps.html # Fiat gateway interfaces
│   ├── staking.html      # Staking functionality
│   ├── trading.html      # Trading interface
│   └── settings.html     # User settings and profile management
└── index.html        # Main entry point and landing page
```

## Directory Purposes

**`public/`:**
- Purpose: Contains static assets that are served directly by the web server. This includes images, favicon, and potentially fonts.
- Contains: `images/`, `fonts/` (if custom fonts are used)
- Key files: `favicon.ico`, `logo.svg` (example)

**`css/`:**
- Purpose: Houses all CSS files, organized according to the defined CSS architecture. This directory defines the visual style and layout of the application.
- Contains: Global design tokens, layout utilities, component-specific styles, and the main stylesheet.
- Key files: `design-system.css`, `layout.css`, `components.css`, `main.css`

**`js/`:**
- Purpose: Stores all JavaScript files responsible for client-side interactivity, theme management, and any other frontend logic.
- Contains: Utility scripts, theme toggles, and main application logic.
- Key files: `theme-manager.js`, `main.js`

**`pages/`:**
- Purpose: Contains the individual HTML files that represent different views or sections of the StellarVault application. Each file corresponds to a primary navigation item.
- Contains: Semantic HTML structure for specific application features.
- Key files: `dashboard.html`, `wallet.html`, `transactions.html`, `fiat-on-off-ramps.html`, `staking.html`, `trading.html`, `settings.html`

## Key File Locations

**Entry Points:**
- `index.html`: The main landing page and entry point for the application.
- `js/main.js`: Primary JavaScript file for application initialization and global interactivity.
- `css/main.css`: The primary stylesheet that imports and orchestrates all other CSS files.

**Configuration:**
- `css/design-system.css`: Contains CSS variables acting as design tokens for global styling configuration.

**Core Logic:**
- `js/theme-manager.js`: Manages the application's light/dark theme toggle logic.

**Testing:**
- Not detected in the current structure. Testing files would typically reside in a `tests/` directory or co-located with source files (e.g., `src/__tests__` or `component.test.js`).

## Naming Conventions

**Files:**
- HTML files: `lowercase-kebab-case.html` (e.g., `dashboard.html`, `fiat-on-off-ramps.html`)
- CSS files: `lowercase-kebab-case.css` (e.g., `design-system.css`, `components.css`)
- JavaScript files: `lowercase-kebab-case.js` (e.g., `theme-manager.js`, `main.js`)

**Directories:**
- `lowercase-kebab-case/` (e.g., `public/`, `css/`, `js/`, `pages/`)

## Where to Add New Code

**New Feature (e.g., 'Reports' page):**
- Primary HTML: A new file `pages/reports.html` should be created.
- Corresponding styles: Add relevant styles to `css/components.css` or `css/layout.css` if global, or create a new specific CSS file if complex and import it into `main.css`.
- Interactivity: Add relevant JavaScript to `js/main.js` or create a new module `js/reports.js` and ensure it's loaded.

**New UI Component (e.g., a custom `Modal`):**
- Implementation: Add HTML structure directly into relevant `pages/*.html` files.
- Styles: Define CSS rules for the component within `css/components.css`.
- Interactivity: Add JavaScript logic for the component to `js/main.js` or a dedicated component-specific JS file if complex.

**Utilities:**
- Shared helper functions: `js/utils.js` (if created) or directly within `js/main.js` if simple.

## Special Directories

**`public/`:**
- Purpose: Holds static assets.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2024-07-30*