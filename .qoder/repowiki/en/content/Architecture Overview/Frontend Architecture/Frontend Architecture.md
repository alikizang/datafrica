# Frontend Architecture

<cite>
**Referenced Files in This Document**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [globals.css](file://src/app/globals.css)
- [theme-provider.tsx](file://src/components/theme-provider.tsx)
- [theme-toggle.tsx](file://src/components/theme-toggle.tsx)
- [navbar.tsx](file://src/components/layout/navbar.tsx)
- [footer.tsx](file://src/components/layout/footer.tsx)
- [use-auth.tsx](file://src/hooks/use-auth.tsx)
- [button.tsx](file://src/components/ui/button.tsx)
- [dropdown-menu.tsx](file://src/components/ui/dropdown-menu.tsx)
- [dataset-card.tsx](file://src/components/dataset/dataset-card.tsx)
- [index.ts](file://src/types/index.ts)
- [package.json](file://package.json)
- [next.config.ts](file://next.config.ts)
- [components.json](file://components.json)
</cite>

## Update Summary
**Changes Made**
- Updated Design System section to reflect comprehensive transition from hardcoded hex colors to semantic Tailwind CSS variables
- Enhanced Global CSS Architecture section with detailed explanation of semantic color system
- Added new section on Semantic Color Variables and Design Tokens
- Updated component analysis to highlight semantic class usage patterns
- Revised troubleshooting guide to address semantic variable considerations

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Design System and Semantic Variables](#design-system-and-semantic-variables)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
This document describes the frontend architecture of Datafrica's Next.js application. It focuses on the App Router file-based routing model under src/app, the provider pattern for theme and authentication, the component hierarchy from the root layout to reusable UI components, the responsive design system using Tailwind CSS and shadcn/ui with semantic variables, navigation structure with Navbar and Footer, the font system using Geist and Geist Mono, client-side rendering and hydration considerations, and the global CSS architecture and styling conventions.

## Project Structure
The application follows Next.js App Router conventions with a strict file-based routing structure under src/app. The root layout composes providers and shared UI, while pages and API routes are organized by feature and route segment. Reusable UI components live under src/components, grouped by domain (e.g., dataset, layout, ui) and shared utilities under src/lib.

```mermaid
graph TB
subgraph "App Router (src/app)"
L["layout.tsx"]
P["page.tsx"]
Auth["(auth)/**/*"]
Admin["admin/**/*"]
Api["api/**/*"]
Dash["dashboard/**/*"]
Datasets["datasets/**/*"]
end
subgraph "Components (src/components)"
Layout["layout/*"]
UI["ui/*"]
Dataset["dataset/*"]
Theme["theme-provider.tsx"]
ThemeToggle["theme-toggle.tsx"]
AuthHook["hooks/use-auth.tsx"]
end
subgraph "Styling"
CSS["app/globals.css"]
Types["types/index.ts"]
end
L --> Theme
L --> AuthHook
L --> Layout
L --> CSS
P --> Dataset
P --> UI
P --> Types
```

**Diagram sources**
- [layout.tsx:1-55](file://src/app/layout.tsx#L1-L55)
- [page.tsx:1-199](file://src/app/page.tsx#L1-L199)
- [theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)
- [theme-toggle.tsx:1-27](file://src/components/theme-toggle.tsx#L1-L27)
- [navbar.tsx:1-216](file://src/components/layout/navbar.tsx#L1-L216)
- [footer.tsx:1-57](file://src/components/layout/footer.tsx#L1-L57)
- [use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [globals.css:1-208](file://src/app/globals.css#L1-L208)
- [dataset-card.tsx:1-81](file://src/components/dataset/dataset-card.tsx#L1-L81)
- [index.ts:1-90](file://src/types/index.ts#L1-L90)

**Section sources**
- [layout.tsx:1-55](file://src/app/layout.tsx#L1-L55)
- [page.tsx:1-199](file://src/app/page.tsx#L1-L199)

## Core Components
- Root layout: Defines metadata, fonts, providers, and the page shell with Navbar, main content area, Footer, and toast notifications.
- Providers: ThemeProvider wraps the app with next-themes, and AuthProvider manages authentication state and exposes user context.
- Navigation: Navbar handles desktop/mobile layouts, user menu, and theme toggle; Footer organizes links and branding.
- UI primitives: Shadcn/ui components (button, dropdown-menu) provide consistent, accessible building blocks using semantic color variables.
- Domain components: DatasetCard renders dataset previews with category badges, pricing, and CTAs.
- Types: Strongly typed User, Dataset, Purchase, and DownloadToken models support type-safe development.

**Section sources**
- [layout.tsx:1-55](file://src/app/layout.tsx#L1-L55)
- [theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)
- [use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [navbar.tsx:1-216](file://src/components/layout/navbar.tsx#L1-L216)
- [footer.tsx:1-57](file://src/components/layout/footer.tsx#L1-L57)
- [button.tsx:1-58](file://src/components/ui/button.tsx#L1-L58)
- [dropdown-menu.tsx:1-196](file://src/components/ui/dropdown-menu.tsx#L1-L196)
- [dataset-card.tsx:1-81](file://src/components/dataset/dataset-card.tsx#L1-L81)
- [index.ts:1-90](file://src/types/index.ts#L1-L90)

## Architecture Overview
The application uses a layered architecture:
- Routing layer: App Router segments map to pages and nested layouts.
- Provider layer: ThemeProvider and AuthProvider wrap the entire application to share state and theme preferences.
- UI layer: Shared components (buttons, dropdowns, cards) built with shadcn/ui and styled via Tailwind semantic variables.
- Domain layer: Feature-specific components (e.g., DatasetCard) encapsulate presentation logic.
- Data layer: Authentication state and user context are managed via Firebase and exposed through a React context.

```mermaid
graph TB
R["Root Layout<br/>layout.tsx"]
TP["ThemeProvider<br/>theme-provider.tsx"]
AP["AuthProvider<br/>hooks/use-auth.tsx"]
NB["Navbar<br/>layout/navbar.tsx"]
FT["Footer<br/>layout/footer.tsx"]
PG["Page Shell<br/>page.tsx"]
UI["Shadcn/ui Components<br/>ui/*"]
DC["Domain Components<br/>dataset/*"]
TY["Types<br/>types/index.ts"]
R --> TP --> AP --> NB --> PG
R --> FT
PG --> UI
PG --> DC
PG --> TY
```

**Diagram sources**
- [layout.tsx:28-54](file://src/app/layout.tsx#L28-L54)
- [theme-provider.tsx:6-12](file://src/components/theme-provider.tsx#L6-L12)
- [use-auth.tsx:34-108](file://src/hooks/use-auth.tsx#L34-L108)
- [navbar.tsx:19-216](file://src/components/layout/navbar.tsx#L19-L216)
- [footer.tsx:6-57](file://src/components/layout/footer.tsx#L6-L57)
- [page.tsx:18-199](file://src/app/page.tsx#L18-L199)
- [button.tsx:1-58](file://src/components/ui/button.tsx#L1-L58)
- [dropdown-menu.tsx:1-196](file://src/components/ui/dropdown-menu.tsx#L1-L196)
- [dataset-card.tsx:14-81](file://src/components/dataset/dataset-card.tsx#L14-L81)
- [index.ts:3-28](file://src/types/index.ts#L3-L28)

## Detailed Component Analysis

### Root Layout and Providers
The root layout composes:
- Fonts: Geist (sans-serif) and Geist Mono (mono) injected via next/font/google and applied as CSS variables.
- Providers: ThemeProvider sets up light/dark/system themes; AuthProvider initializes Firebase auth state and user profile sync.
- Shell: Navbar, main content area, Footer, and Toaster for notifications.
- Hydration: suppressHydrationWarning is used to avoid mismatches during initial render.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Layout as "RootLayout (layout.tsx)"
participant Theme as "ThemeProvider"
participant Auth as "AuthProvider"
participant Nav as "Navbar"
participant Page as "Page Content"
Browser->>Layout : Request HTML
Layout->>Theme : Wrap children
Theme->>Auth : Wrap children
Auth->>Nav : Render Navbar
Nav->>Page : Render main content
Layout-->>Browser : Hydrated HTML/CSS/JS
```

**Diagram sources**
- [layout.tsx:28-54](file://src/app/layout.tsx#L28-L54)
- [theme-provider.tsx:6-12](file://src/components/theme-provider.tsx#L6-L12)
- [use-auth.tsx:34-108](file://src/hooks/use-auth.tsx#L34-L108)
- [navbar.tsx:19-216](file://src/components/layout/navbar.tsx#L19-L216)

**Section sources**
- [layout.tsx:1-55](file://src/app/layout.tsx#L1-L55)
- [theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)
- [use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)

### Authentication Provider Pattern
The AuthProvider:
- Subscribes to Firebase onAuthStateChanged to track login state.
- Loads or creates user profiles in Firestore, exposing a normalized User type.
- Provides sign-up, sign-in, sign-out, and ID token retrieval utilities.
- Ensures safe consumption via a custom hook useAuth with runtime validation.

```mermaid
flowchart TD
Start(["Mount AuthProvider"]) --> Subscribe["Subscribe to onAuthStateChanged"]
Subscribe --> UserFound{"User exists?"}
UserFound --> |Yes| LoadDoc["Load Firestore user doc"]
LoadDoc --> DocExists{"Doc exists?"}
DocExists --> |Yes| SetUser["Set user state"]
DocExists --> |No| CreateUser["Create user doc"]
CreateUser --> SetUser
UserFound --> |No| ClearUser["Clear user state"]
SetUser --> Done(["Provider ready"])
ClearUser --> Done
```

**Diagram sources**
- [use-auth.tsx:39-67](file://src/hooks/use-auth.tsx#L39-L67)
- [use-auth.tsx:44-58](file://src/hooks/use-auth.tsx#L44-L58)

**Section sources**
- [use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)

### Navigation Bar and Footer
- Navbar:
  - Displays logo and links to datasets and admin (conditional on role).
  - Desktop nav and mobile drawer with theme toggle and user actions.
  - Uses DropdownMenu, Avatar, and Button primitives with semantic color classes.
- Footer:
  - Multi-column layout with links to marketplace, company, and developer resources.
  - Responsive grid and copyright information using semantic color variables.

```mermaid
graph LR
NB["Navbar"] --> DT["DropdownMenu"]
NB --> AV["Avatar"]
NB --> TH["ThemeToggle"]
NB --> LN["Links (datasets/admin)"]
FT["Footer"] --> LG["Logo"]
FT --> COL1["Marketplace Links"]
FT --> COL2["Company Links"]
FT --> COL3["Developer Links"]
```

**Diagram sources**
- [navbar.tsx:19-216](file://src/components/layout/navbar.tsx#L19-L216)
- [dropdown-menu.tsx:1-196](file://src/components/ui/dropdown-menu.tsx#L1-L196)
- [theme-toggle.tsx:8-26](file://src/components/theme-toggle.tsx#L8-L26)
- [footer.tsx:6-57](file://src/components/layout/footer.tsx#L6-L57)

**Section sources**
- [navbar.tsx:1-216](file://src/components/layout/navbar.tsx#L1-L216)
- [footer.tsx:1-57](file://src/components/layout/footer.tsx#L1-L57)

### Home Page and Dataset Presentation
The home page:
- Fetches featured and recent datasets concurrently via /api/datasets.
- Renders hero, features, and dataset grids using DatasetCard.
- Handles loading and empty states gracefully.

```mermaid
sequenceDiagram
participant Page as "Home Page (page.tsx)"
participant API as "/api/datasets"
participant UI as "UI Components"
Page->>API : GET /api/datasets?featured=true&limit=3
Page->>API : GET /api/datasets?limit=6
API-->>Page : JSON datasets
Page->>UI : Render DatasetCard for each dataset
UI-->>Page : Compose sections (hero, features, grids)
```

**Diagram sources**
- [page.tsx:23-47](file://src/app/page.tsx#L23-L47)
- [dataset-card.tsx:14-81](file://src/components/dataset/dataset-card.tsx#L14-L81)

**Section sources**
- [page.tsx:1-199](file://src/app/page.tsx#L1-L199)
- [dataset-card.tsx:1-81](file://src/components/dataset/dataset-card.tsx#L1-L81)

## Design System and Semantic Variables

**Updated** The application now uses a comprehensive semantic color system built on Tailwind CSS variables, replacing hardcoded hex colors throughout the design system.

### Semantic Color Architecture
The design system is built around a semantic color hierarchy that automatically adapts to light and dark themes:

- **Core Palette**: Primary blue (#3d7eff) serves as the main brand color
- **Surface Colors**: Background and foreground colors that adapt to theme
- **Component Colors**: Card, popover, and input colors derived from semantic variables
- **Chart Colors**: Distinct colors for data visualization (blue, green, yellow, purple, red)
- **Custom Semantics**: Surface, surface-foreground, and dim colors for specialized use cases

### CSS Variable Implementation
The semantic system is implemented through a two-tier approach:

1. **Theme Variables** (`--background`, `--foreground`, `--primary`, etc.): Defined in light and dark modes
2. **Semantic Variables** (`--color-*`): Mapped to theme variables for consistent usage across components

```mermaid
graph TB
TV["Theme Variables<br/>Light/Dark Mode"]
SV["Semantic Variables<br/>Mapped to Theme"]
CV["Component Classes<br/>bg-primary, text-foreground"]
TV --> SV
SV --> CV
```

**Diagram sources**
- [globals.css:5-49](file://src/app/globals.css#L5-L49)
- [globals.css:52-126](file://src/app/globals.css#L52-L126)

### Component Color Usage Patterns
Components consistently use semantic classes:
- **Primary Actions**: `bg-primary text-primary-foreground`
- **Secondary Actions**: `bg-secondary text-secondary-foreground`
- **Borders**: `border-border` (automatically adapts to theme)
- **Text**: `text-foreground`, `text-muted-foreground`
- **Backgrounds**: `bg-background`, `bg-card`, `bg-popover`

### Custom Semantic Colors
Additional semantic colors provide specialized functionality:
- **Surface**: `--color-surface` for glassmorphism effects
- **Surface Foreground**: `--color-surface-foreground` for surface text
- **Dim**: `--color-dim` for subtle text and borders

**Section sources**
- [globals.css:1-208](file://src/app/globals.css#L1-L208)
- [components.json:1-26](file://components.json#L1-L26)
- [layout.tsx:1-55](file://src/app/layout.tsx#L1-L55)

## Dependency Analysis
External dependencies relevant to frontend architecture:
- Next.js App Router and server/client directives.
- next-themes for theme switching and persistence.
- Firebase and Firebase Admin for authentication and user storage.
- Radix UI primitives (Avatar, Dropdown Menu, Select, etc.) for accessible UI.
- lucide-react for icons.
- Tailwind CSS v4 with semantic CSS variables for styling and component primitives.

```mermaid
graph TB
APP["Next.js App"]
THEME["next-themes"]
FIRE["firebase"]
RADIX["@radix-ui/*"]
ICONS["lucide-react"]
TWCSS["tailwindcss v4<br/>with CSS Variables"]
SHAD["shadcn/ui"]
APP --> THEME
APP --> FIRE
APP --> RADIX
APP --> ICONS
APP --> TWCSS
APP --> SHAD
```

**Diagram sources**
- [package.json:11-39](file://package.json#L11-L39)
- [components.json:1-26](file://components.json#L1-L26)

**Section sources**
- [package.json:1-52](file://package.json#L1-L52)
- [components.json:1-26](file://components.json#L1-L26)

## Performance Considerations
- Client-side rendering: Pages and components use "use client" where state or effects are needed (e.g., Navbar, Home Page, ThemeToggle).
- Hydration: Root layout uses suppressHydrationWarning to prevent mismatches during initial render; ensure no conflicting server-rendered content in providers.
- Concurrent data fetching: Home page fetches featured and recent datasets concurrently to reduce load time.
- CSS variables: Tailwind CSS variables minimize repaints and improve theme transitions.
- Component reuse: Shadcn/ui primitives and domain components reduce bundle size and improve maintainability.

## Troubleshooting Guide
- Hydration warnings: Verify that only client components render dynamic content and that providers are wrapped around the entire app.
- Authentication state: Ensure onAuthStateChanged subscription is initialized and user documents are created in Firestore.
- Theme switching: Confirm next-themes is configured and ThemeToggle updates the theme correctly.
- Routing: Validate that route segments match the intended pages and nested layouts.
- Semantic variables: Ensure components use semantic classes (bg-primary, text-foreground) instead of hardcoded colors for proper theme adaptation.

**Section sources**
- [layout.tsx:37-37](file://src/app/layout.tsx#L37-L37)
- [use-auth.tsx:39-67](file://src/hooks/use-auth.tsx#L39-L67)
- [theme-toggle.tsx:8-26](file://src/components/theme-toggle.tsx#L8-L26)

## Conclusion
Datafrica's frontend leverages Next.js App Router for structured routing, a robust provider pattern for theme and authentication, and a cohesive design system using Tailwind CSS and shadcn/ui with semantic variables. The root layout composes providers and shared UI, while pages and domain components encapsulate presentation logic. The semantic color system ensures consistent theming across light and dark modes, delivering a professional, accessible experience across devices.

## Appendices

### Routing Model and File-Based Structure
- App Router segments define pages and nested layouts.
- Feature-based grouping under src/app enables scalable organization.
- API routes under src/app/api handle backend interactions.

**Section sources**
- [layout.tsx:1-55](file://src/app/layout.tsx#L1-L55)
- [page.tsx:1-199](file://src/app/page.tsx#L1-L199)

### Client-Side Rendering and SSR Considerations
- "use client" directive marks components that require client state or effects.
- Root layout suppresses hydration warnings for seamless transitions.
- Providers initialize on the client to manage theme and auth state.

**Section sources**
- [layout.tsx:1-55](file://src/app/layout.tsx#L1-L55)
- [theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)
- [use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)

### Font System and Typography
- Geist and Geist Mono fonts are imported and applied as CSS variables.
- Typography tokens are consistently referenced across components.

**Section sources**
- [layout.tsx:12-20](file://src/app/layout.tsx#L12-L20)
- [globals.css:5-44](file://src/app/globals.css#L5-L44)

### Global CSS Architecture
- Tailwind v4 with CSS variables for theme tokens.
- Design tokens mapped to oklch color spaces and radius variables.
- Aliases configured for components, utils, and hooks.

**Section sources**
- [globals.css:1-208](file://src/app/globals.css#L1-L208)
- [components.json:6-21](file://components.json#L6-L21)

### Semantic Color Variables Reference
- **Core**: `--color-background`, `--color-foreground`, `--color-primary`, `--color-secondary`
- **Surface**: `--color-card`, `--color-popover`, `--color-surface`
- **Text**: `--color-foreground`, `--color-muted-foreground`, `--color-dim`
- **Borders**: `--color-border`, `--color-input`, `--color-ring`
- **Actions**: `--color-destructive`, `--color-accent`
- **Charts**: `--color-chart-1` through `--color-chart-5`

**Section sources**
- [globals.css:5-49](file://src/app/globals.css#L5-L49)
- [globals.css:52-126](file://src/app/globals.css#L52-L126)