# Development Guidelines

<cite>
**Referenced Files in This Document**
- [tsconfig.json](file://tsconfig.json)
- [eslint.config.mjs](file://eslint.config.mjs)
- [next.config.ts](file://next.config.ts)
- [package.json](file://package.json)
- [components.json](file://components.json)
- [src/types/index.ts](file://src/types/index.ts)
- [src/lib/firebase.ts](file://src/lib/firebase.ts)
- [src/lib/auth-middleware.ts](file://src/lib/auth-middleware.ts)
- [src/hooks/use-auth.tsx](file://src/hooks/use-auth.tsx)
- [src/components/theme-provider.tsx](file://src/components/theme-provider.tsx)
- [src/components/layout/navbar.tsx](file://src/components/layout/navbar.tsx)
- [src/components/ui/button.tsx](file://src/components/ui/button.tsx)
- [src/components/ui/card.tsx](file://src/components/ui/card.tsx)
- [src/components/ui/dialog.tsx](file://src/components/ui/dialog.tsx)
- [src/components/ui/skeleton.tsx](file://src/components/ui/skeleton.tsx)
- [src/lib/utils.ts](file://src/lib/utils.ts)
- [src/app/layout.tsx](file://src/app/layout.tsx)
- [src/app/page.tsx](file://src/app/page.tsx)
- [src/app/api/admin/analytics/route.ts](file://src/app/api/admin/analytics/route.ts)
- [src/app/api/datasets/route.ts](file://src/app/api/datasets/route.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Testing Approaches](#testing-approaches)
9. [Code Organization Principles](#code-organization-principles)
10. [Debugging Strategies](#debugging-strategies)
11. [Conclusion](#conclusion)

## Introduction
This document defines Datafrica’s development guidelines and best practices. It consolidates TypeScript configuration, ESLint enforcement, component development patterns, state management strategies, testing approaches, performance optimizations for Next.js and Firebase, code organization principles, and debugging recommendations. The goal is to ensure consistent, maintainable, and scalable development across the platform.

## Project Structure
The project follows a Next.js App Router structure with a clear separation of concerns:
- src/app: App Router pages, layouts, API routes, and static assets
- src/components: Reusable UI components and layout pieces
- src/hooks: Custom React hooks
- src/lib: Utility libraries, Firebase integrations, and middleware
- src/types: Shared TypeScript type definitions
- Root configs: TypeScript, ESLint, Next.js, Tailwind, and component aliases

```mermaid
graph TB
subgraph "App Layer"
L["layout.tsx"]
H["page.tsx"]
end
subgraph "Components"
NB["layout/navbar.tsx"]
BTN["ui/button.tsx"]
CARD["ui/card.tsx"]
DLG["ui/dialog.tsx"]
TP["theme-provider.tsx"]
end
subgraph "Hooks"
UA["hooks/use-auth.tsx"]
end
subgraph "Lib"
FB["lib/firebase.ts"]
AMW["lib/auth-middleware.ts"]
U["lib/utils.ts"]
end
subgraph "Types"
T["types/index.ts"]
end
subgraph "Configs"
TS["tsconfig.json"]
ESL["eslint.config.mjs"]
NX["next.config.ts"]
CMP["components.json"]
end
L --> NB
L --> TP
L --> UA
H --> BTN
H --> CARD
UA --> FB
UA --> AMW
NB --> UA
BTN --> U
CARD --> U
DLG --> U
FB --> T
AMW --> T
```

**Diagram sources**
- [src/app/layout.tsx:1-50](file://src/app/layout.tsx#L1-L50)
- [src/app/page.tsx:1-199](file://src/app/page.tsx#L1-L199)
- [src/components/layout/navbar.tsx:1-167](file://src/components/layout/navbar.tsx#L1-L167)
- [src/components/ui/button.tsx:1-58](file://src/components/ui/button.tsx#L1-L58)
- [src/components/ui/card.tsx:1-104](file://src/components/ui/card.tsx#L1-L104)
- [src/components/ui/dialog.tsx:1-120](file://src/components/ui/dialog.tsx#L1-L120)
- [src/components/theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)
- [src/hooks/use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [src/lib/firebase.ts:1-22](file://src/lib/firebase.ts#L1-L22)
- [src/lib/auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [src/lib/utils.ts:1-7](file://src/lib/utils.ts#L1-L7)
- [src/types/index.ts:1-90](file://src/types/index.ts#L1-L90)
- [tsconfig.json:1-35](file://tsconfig.json#L1-L35)
- [eslint.config.mjs:1-19](file://eslint.config.mjs#L1-L19)
- [next.config.ts:1-8](file://next.config.ts#L1-L8)
- [components.json:1-26](file://components.json#L1-L26)

**Section sources**
- [src/app/layout.tsx:1-50](file://src/app/layout.tsx#L1-L50)
- [src/app/page.tsx:1-199](file://src/app/page.tsx#L1-L199)
- [src/components/layout/navbar.tsx:1-167](file://src/components/layout/navbar.tsx#L1-L167)
- [src/hooks/use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [src/lib/firebase.ts:1-22](file://src/lib/firebase.ts#L1-L22)
- [src/lib/auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [src/lib/utils.ts:1-7](file://src/lib/utils.ts#L1-L7)
- [src/types/index.ts:1-90](file://src/types/index.ts#L1-L90)
- [tsconfig.json:1-35](file://tsconfig.json#L1-L35)
- [eslint.config.mjs:1-19](file://eslint.config.mjs#L1-L19)
- [next.config.ts:1-8](file://next.config.ts#L1-L8)
- [components.json:1-26](file://components.json#L1-L26)

## Core Components
- TypeScript configuration enforces strictness, modern module resolution, and JSX transform for Next.js.
- ESLint integrates Next.js core web vitals and TypeScript rules with explicit overrides.
- Firebase client SDK is initialized and exported for auth, Firestore, and storage.
- Authentication provider manages user state, persistence, and token retrieval.
- UI primitives (Button, Card, Dialog) demonstrate consistent prop interfaces, variants, and composition patterns.
- Layout composes providers and shared UI to establish theme, auth, navigation, and notifications.

Key configuration highlights:
- Strict TypeScript compiler options, bundler module resolution, and path aliases
- ESLint Next.js recommended rules plus custom ignores
- Next.js config placeholder for future optimization toggles
- Tailwind + shadcn/slots configuration with TSX and RSC enabled

**Section sources**
- [tsconfig.json:1-35](file://tsconfig.json#L1-L35)
- [eslint.config.mjs:1-19](file://eslint.config.mjs#L1-L19)
- [next.config.ts:1-8](file://next.config.ts#L1-L8)
- [components.json:1-26](file://components.json#L1-L26)
- [src/lib/firebase.ts:1-22](file://src/lib/firebase.ts#L1-L22)
- [src/hooks/use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [src/components/ui/button.tsx:1-58](file://src/components/ui/button.tsx#L1-L58)
- [src/components/ui/card.tsx:1-104](file://src/components/ui/card.tsx#L1-L104)
- [src/components/ui/dialog.tsx:1-120](file://src/components/ui/dialog.tsx#L1-L120)
- [src/app/layout.tsx:1-50](file://src/app/layout.tsx#L1-L50)

## Architecture Overview
The runtime architecture centers around:
- App shell with ThemeProvider and AuthProvider
- Client components consuming custom hooks and UI primitives
- API routes backed by Firebase Admin for secure server-side operations
- Shared types and utilities for consistency

```mermaid
graph TB
Browser["Browser"]
App["App Shell<br/>layout.tsx"]
Theme["ThemeProvider<br/>theme-provider.tsx"]
Auth["AuthProvider<br/>hooks/use-auth.tsx"]
Nav["Navbar<br/>layout/navbar.tsx"]
Home["Home Page<br/>app/page.tsx"]
Types["Shared Types<br/>types/index.ts"]
Utils["Utilities<br/>lib/utils.ts"]
UI_Button["UI Button<br/>ui/button.tsx"]
UI_Card["UI Card<br/>ui/card.tsx"]
UI_Dialog["UI Dialog<br/>ui/dialog.tsx"]
Browser --> App
App --> Theme
App --> Auth
App --> Nav
App --> Home
Home --> UI_Button
Home --> UI_Card
Nav --> Auth
UI_Button --> Utils
UI_Card --> Utils
UI_Dialog --> Utils
Auth --> Types
```

**Diagram sources**
- [src/app/layout.tsx:1-50](file://src/app/layout.tsx#L1-L50)
- [src/components/theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)
- [src/hooks/use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [src/components/layout/navbar.tsx:1-167](file://src/components/layout/navbar.tsx#L1-L167)
- [src/app/page.tsx:1-199](file://src/app/page.tsx#L1-L199)
- [src/components/ui/button.tsx:1-58](file://src/components/ui/button.tsx#L1-L58)
- [src/components/ui/card.tsx:1-104](file://src/components/ui/card.tsx#L1-L104)
- [src/components/ui/dialog.tsx:1-120](file://src/components/ui/dialog.tsx#L1-L120)
- [src/lib/utils.ts:1-7](file://src/lib/utils.ts#L1-L7)
- [src/types/index.ts:1-90](file://src/types/index.ts#L1-L90)

## Detailed Component Analysis

### TypeScript Configuration
- Strict mode enabled for robust type safety
- Modern module resolution via bundler for optimal Next.js DX
- Path aliases mapped to src for concise imports
- JSX transform configured for React Server Components compatibility
- Incremental builds and isolated modules for faster development

Recommendations:
- Keep strict mode enabled; introduce incremental types cautiously
- Prefer path aliases for all internal imports
- Align plugins with Next.js updates

**Section sources**
- [tsconfig.json:1-35](file://tsconfig.json#L1-L35)

### ESLint Configuration
- Integrates Next.js core-web-vitals and TypeScript rules
- Overrides default ignores to include generated Next types and dev types
- Ensures linting across generated artifacts while excluding build artifacts

Recommendations:
- Run lint in CI and pre-commit hooks
- Keep overrides minimal and documented
- Add plugin-specific rules only when necessary

**Section sources**
- [eslint.config.mjs:1-19](file://eslint.config.mjs#L1-L19)

### Authentication Provider and Hooks
The AuthProvider encapsulates:
- Real-time auth state subscription
- Firestore user profile hydration and creation
- Sign-up, sign-in, sign-out actions
- ID token retrieval for protected requests

```mermaid
sequenceDiagram
participant C as "Client Component"
participant P as "AuthProvider"
participant FBA as "Firebase Auth"
participant FBD as "Firestore"
C->>P : "useAuth()"
P->>FBA : "onAuthStateChanged"
FBA-->>P : "User or null"
alt "User exists"
P->>FBD : "getDoc(users/<uid>)"
FBD-->>P : "User profile or missing"
alt "Profile missing"
P->>FBD : "setDoc(users/<uid>, newProfile)"
end
else "No user"
P-->>C : "null user"
end
C->>P : "signUp/signIn/signOut"
P->>FBA : "Auth action"
P-->>C : "Updated state"
```

**Diagram sources**
- [src/hooks/use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [src/lib/firebase.ts:1-22](file://src/lib/firebase.ts#L1-L22)

**Section sources**
- [src/hooks/use-auth.tsx:1-117](file://src/hooks/use-auth.tsx#L1-L117)
- [src/lib/firebase.ts:1-22](file://src/lib/firebase.ts#L1-L22)

### UI Component Patterns
- Prop interfaces extend native HTML attributes and variant props for composability
- Forward refs and slot composition for semantic markup
- Utility-driven class merging for theme-aware styling

Examples:
- Button: variant and size variants with forwardRef
- Card: composite slots for header, title, content, footer
- Dialog: portal overlay with controlled open/close

```mermaid
classDiagram
class Button {
+ButtonProps
+variant
+size
+asChild
}
class Card {
+CardProps
+size
}
class Dialog {
+DialogRoot
+DialogContent
+DialogOverlay
}
class Utils {
+cn(...)
}
Button --> Utils : "uses"
Card --> Utils : "uses"
Dialog --> Utils : "uses"
```

**Diagram sources**
- [src/components/ui/button.tsx:1-58](file://src/components/ui/button.tsx#L1-L58)
- [src/components/ui/card.tsx:1-104](file://src/components/ui/card.tsx#L1-L104)
- [src/components/ui/dialog.tsx:1-120](file://src/components/ui/dialog.tsx#L1-L120)
- [src/lib/utils.ts:1-7](file://src/lib/utils.ts#L1-L7)

**Section sources**
- [src/components/ui/button.tsx:1-58](file://src/components/ui/button.tsx#L1-L58)
- [src/components/ui/card.tsx:1-104](file://src/components/ui/card.tsx#L1-L104)
- [src/components/ui/dialog.tsx:1-120](file://src/components/ui/dialog.tsx#L1-L120)
- [src/lib/utils.ts:1-7](file://src/lib/utils.ts#L1-L7)

### API Routes and Middleware
- Admin analytics endpoint aggregates counts and recent sales
- Datasets endpoint supports filtering and client-side refinement
- Auth middleware verifies tokens and checks admin roles

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "API Route"
participant MW as "Auth Middleware"
participant AdminDB as "Firebase Admin"
Client->>API : "GET /api/admin/analytics"
API->>MW : "requireAdmin"
MW->>AdminDB : "verifyIdToken + read users"
AdminDB-->>MW : "User + role"
MW-->>API : "{ user, error }"
alt "Authorized"
API->>AdminDB : "Query purchases/users/datasets"
AdminDB-->>API : "Aggregated data"
API-->>Client : "JSON response"
else "Unauthorized/Forbidden"
API-->>Client : "401/403 JSON"
end
```

**Diagram sources**
- [src/app/api/admin/analytics/route.ts:1-78](file://src/app/api/admin/analytics/route.ts#L1-L78)
- [src/lib/auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)

**Section sources**
- [src/app/api/admin/analytics/route.ts:1-78](file://src/app/api/admin/analytics/route.ts#L1-L78)
- [src/app/api/datasets/route.ts:1-62](file://src/app/api/datasets/route.ts#L1-L62)
- [src/lib/auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)

### Component Lifecycle and State Management
- Navbar demonstrates conditional rendering based on auth loading and user presence
- Home page uses concurrent data fetching with Promise.all and guarded updates
- ThemeProvider sets up system-aware theming with next-themes

```mermaid
flowchart TD
Start(["Mount"]) --> LoadAuth["Subscribe to auth state"]
LoadAuth --> HasUser{"User present?"}
HasUser --> |Yes| Hydrate["Fetch Firestore profile"]
HasUser --> |No| SetNull["Set user=null"]
Hydrate --> Done(["Ready"])
SetNull --> Done
```

**Diagram sources**
- [src/components/layout/navbar.tsx:1-167](file://src/components/layout/navbar.tsx#L1-L167)
- [src/app/page.tsx:1-199](file://src/app/page.tsx#L1-L199)
- [src/components/theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)

**Section sources**
- [src/components/layout/navbar.tsx:1-167](file://src/components/layout/navbar.tsx#L1-L167)
- [src/app/page.tsx:1-199](file://src/app/page.tsx#L1-L199)
- [src/components/theme-provider.tsx:1-13](file://src/components/theme-provider.tsx#L1-L13)

## Dependency Analysis
- Next.js 16.x with App Router and React 19
- Firebase client and admin SDKs for auth, Firestore, and storage
- Radix UI primitives and shadcn/ui for accessible UI
- Tailwind v4 with class merging utilities
- TypeScript 5.x and ESLint 9.x

```mermaid
graph LR
Pkg["package.json"]
Next["next"]
React["react / react-dom"]
Firebase["firebase / firebase-admin"]
UI["@radix-ui / lucide-react / sonner"]
Tailwind["tailwindcss / tailwind-merge / clsx"]
TS["typescript / @types/*"]
ESL["eslint / eslint-config-next"]
Pkg --> Next
Pkg --> React
Pkg --> Firebase
Pkg --> UI
Pkg --> Tailwind
Pkg --> TS
Pkg --> ESL
```

**Diagram sources**
- [package.json:1-51](file://package.json#L1-L51)

**Section sources**
- [package.json:1-51](file://package.json#L1-L51)

## Performance Considerations
- Use concurrent data fetching patterns (Promise.all) to reduce load time
- Lazy-load heavy components and avoid unnecessary re-renders
- Prefer server components for initial HTML generation and minimize client components
- Optimize images and leverage Next.js image optimization
- Cache API responses where safe; invalidate on mutations
- Monitor bundle size and split vendor chunks if needed
- Use Firebase indexing strategies for frequently queried fields
- Enable production profiling and measure Core Web Vitals

[No sources needed since this section provides general guidance]

## Testing Approaches
Recommended testing layers:
- Unit tests for pure functions and utilities
- Component tests for UI primitives focusing on variant rendering and accessibility
- Integration tests for hooks to verify state transitions and side effects
- API route tests validating auth middleware, request parsing, and response shape
- E2E tests for critical flows (authentication, dataset browsing, purchases)

Focus areas:
- Mock Firebase client and admin SDKs for isolated tests
- Snapshot test UI components to prevent regressions
- Test error paths and loading states
- Verify TypeScript types remain consistent with runtime behavior

[No sources needed since this section provides general guidance]

## Code Organization Principles
- Feature-based grouping under src/components, src/hooks, and src/lib
- Centralized types in src/types for shared contracts
- API routes organized by domain under src/app/api
- Consistent naming: PascalCase for components, kebab-case for files, camelCase for hooks
- Prefer composition over inheritance; use props and variants for customization
- Keep client components behind “use client” directive and isolate server logic

[No sources needed since this section provides general guidance]

## Debugging Strategies
- Use React DevTools Profiler to identify expensive renders
- Leverage browser network panel to inspect API latency and caching
- Log structured errors in API routes with contextual metadata
- Validate environment variables at startup and fail fast on missing keys
- Use selective console logging during development; remove or gate in prod
- Employ Sentry or equivalent for runtime error monitoring

[No sources needed since this section provides general guidance]

## Conclusion
These guidelines standardize TypeScript and ESLint configurations, component development patterns, state management, and API design. By adhering to these practices—strict typing, modular UI composition, secure auth flows, and performance-conscious engineering—you can build a reliable, scalable, and maintainable Next.js application integrated with Firebase.