# DESIGN.md: CypherPulse Design System

## Introduction
The CypherPulse Design System is crafted for a Modern & Streamlined aesthetic, focusing on clarity, efficiency, and a sophisticated user experience for E&P budgeting and forecasting. It aims to present complex financial data in an approachable and visually pleasing manner, reflecting professionalism and technological capability.

## Core Principles
1.  **Clarity First**: Information hierarchy is paramount. Data should be immediately understandable.
2.  **Efficient Interaction**: Streamlined workflows, intuitive controls, and minimal visual clutter.
3.  **Subtle Sophistication**: Professional, modern, and trustworthy, avoiding overly flashy or generic AI-generated styles.
4.  **Responsive & Accessible**: Works flawlessly on various devices and is usable by everyone.

## 1. Color Palette

Our palette is inspired by earth tones (for the industry grounding) blended with cool, professional blues and greens for digital interfaces and emphasis.

*   **Primary Accent**: A deep, professional blue and a refreshing green for interactive elements, charts, and highlights.
*   **Neutrals**: A range of off-whites, grays, and deep charcoals for backgrounds, text, and borders.
*   **Feedback Colors**: Standard reds for errors, oranges for warnings, and greens for success.

## 2. Typography

We will use a clean, highly readable sans-serif font for all textual content, ensuring legibility across various data densities.

*   **Primary Font**: `Inter` (or `Open Sans`, `Roboto`) for all body text, headings, and UI elements.
*   **Hierarchy**: A clear scale is defined for headings (H1-H6), body text (large, base, small), and captions.
    *   H1: Extra-large, bold (e.g., 3rem, 700 weight)
    *   H2: Large, semi-bold (e.g., 2.25rem, 600 weight)
    *   H3: Medium-large, medium weight (e.g., 1.875rem, 500 weight)
    *   Body: Base (e.g., 1rem, 400 weight), Small (e.g., 0.875rem)
    *   Caption: Extra-small (e.g., 0.75rem)

## 3. Spacing Rhythm

A consistent 8-pixel grid system will be used for all spacing (margins, paddings, gaps) to ensure visual harmony and order.

*   `space-xs`: 4px
*   `space-sm`: 8px
*   `space-md`: 16px
*   `space-lg`: 24px
*   `space-xl`: 32px
*   `space-2xl`: 48px
*   `space-3xl`: 64px

## 4. Border Radius

Subtle rounding for components to soften the interface without making it overly bubbly.

*   `rounded-sm`: 2px
*   `rounded-md`: 4px (default for most cards, buttons)
*   `rounded-lg`: 8px (for larger containers, modals)
*   `rounded-full`: For avatars, pills

## 5. Shadows

Minimal, soft shadows for depth and hierarchy, indicating interactivity or elevation without being heavy.

*   `shadow-sm`: Subtle lift for buttons, input fields.
*   `shadow-md`: Default for cards, panels.
*   `shadow-lg`: For dropdowns, modals, or focused elements.

## 6. Breakpoints

Standard responsive breakpoints to ensure optimal viewing on desktops, tablets, and mobile devices.

*   `sm`: 640px
*   `md`: 768px
*   `lg`: 1024px
*   `xl`: 1280px
*   `2xl`: 1536px

## 7. Components & Interaction

*   **Buttons**: Clean, clear calls to action with subtle hover states and focus rings. Primary, Secondary, Destructive variants.
*   **Cards**: Used for encapsulating budget items, scenarios, and data visualizations. Minimal borders, soft shadows.
*   **Tables**: Highly readable data tables with clear headers, alternating row colors (optional), and sticky headers for long lists.
*   **Forms**: Clean input fields, clear labels, helpful validation messages.
*   **Navigation**: Intuitive sidebars for main navigation, simple top bars for context-specific actions.
*   **Data Visualizations**: Focus on clarity, using the brand colors effectively, minimal chart junk.
*   **Empty States**: Engaging but not overwhelming, guiding users to next actions.

This design system will be implemented using Tailwind CSS, aligning directly with the proposed frontend stack.