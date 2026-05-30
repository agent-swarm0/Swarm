# ADR-002: Adopting Next.js with React & Tailwind CSS for Frontend

## Status
Accepted

## Context
The SaaS application requires a "Modern & Streamlined" user interface that is highly interactive, performant, and maintainable. As a full-stack application, not a single page, there's a need for robust routing, server-side capabilities for SEO and initial load performance, and an efficient styling solution that supports a consistent design system.

## Decision
We will use Next.js as the React framework, leveraging its server-side rendering (SSR) and static site generation (SSG) capabilities, alongside Tailwind CSS for all styling. React Query will be used for data fetching, and Zustand for global state management.

## Consequences
**Positive:**
*   **Performance**: Next.js provides excellent out-of-the-box performance with features like SSR, SSG, image optimization, and code splitting, leading to faster perceived load times.
*   **Developer Experience**: React is a widely adopted library with a vast ecosystem. Next.js adds structured routing, API routes, and a pleasant development environment. Tailwind CSS allows for rapid UI development and consistent styling.
*   **Maintainability**: Utility-first CSS with Tailwind CSS leads to smaller, more focused CSS, easier refactoring, and better consistency. TypeScript support in React/Next.js improves code quality.
*   **Scalability**: Next.js applications are highly scalable, especially when deployed to serverless platforms like Vercel. React Query handles complex data fetching patterns, reducing boilerplate.
*   **Modern Aesthetic**: Tailwind CSS inherently supports building modern, streamlined interfaces with its extensive utility classes and customization options.

**Negative:**
*   **Learning Curve**: While widely adopted, Tailwind CSS requires developers to learn its utility classes. Next.js introduces new concepts beyond basic React.
*   **Bundle Size (Initial Concern)**: While Tailwind is efficient, a large number of utility classes *could* theoretically increase bundle size if not purged correctly (though Next.js and PurgeCSS handle this well).
*   **Opinionated Framework**: Next.js is more opinionated than plain React, which might be restrictive for certain edge cases, though generally beneficial.
*   **Styling Verbosity (Perceived)**: Some developers find adding many utility classes directly in JSX verbose compared to writing traditional CSS/SCSS (though this is subjective and often outweighed by benefits).

**Future Considerations:**
The choice of a robust, modern frontend stack positions us well for future UI enhancements, component libraries, and sophisticated data visualizations required for budgeting and forecasting.