# Admin Panel

<cite>
**Referenced Files in This Document**
- [src/app/admin/page.tsx](file://src/app/admin/page.tsx)
- [src/app/admin/analytics/page.tsx](file://src/app/admin/analytics/page.tsx)
- [src/app/admin/upload/page.tsx](file://src/app/admin/upload/page.tsx)
- [src/app/admin/users/page.tsx](file://src/app/admin/users/page.tsx)
- [src/app/api/admin/analytics/route.ts](file://src/app/api/admin/analytics/route.ts)
- [src/app/api/admin/upload/route.ts](file://src/app/api/admin/upload/route.ts)
- [src/app/api/admin/users/route.ts](file://src/app/api/admin/users/route.ts)
- [src/lib/auth-middleware.ts](file://src/lib/auth-middleware.ts)
- [src/lib/firebase-admin.ts](file://src/lib/firebase-admin.ts)
- [src/lib/firebase.ts](file://src/lib/firebase.ts)
- [src/hooks/use-auth.tsx](file://src/hooks/use-auth.tsx)
- [src/types/index.ts](file://src/types/index.ts)
- [src/app/layout.tsx](file://src/app/layout.tsx)
- [src/components/layout/navbar.tsx](file://src/components/layout/navbar.tsx)
- [package.json](file://package.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction
This document describes the Datafrica admin panel, covering the dashboard overview, analytics reporting, dataset management, user administration, dataset upload pipeline, analytics API endpoints, and operational best practices. It is intended for administrators and developers who maintain or operate the platform.

## Project Structure
The admin functionality is organized under the Next.js app directory with dedicated pages and API routes:
- Admin pages: dashboard overview, analytics, upload, and users
- Admin API routes: analytics, upload, and users
- Authentication and authorization middleware
- Firebase client and admin SDK integrations
- Shared types and UI components

```mermaid
graph TB
subgraph "Client Pages"
AdminHome["Admin Home<br/>(src/app/admin/page.tsx)"]
AnalyticsPage["Analytics Page<br/>(src/app/admin/analytics/page.tsx)"]
UploadPage["Upload Page<br/>(src/app/admin/upload/page.tsx)"]
UsersPage["Users Page<br/>(src/app/admin/users/page.tsx)"]
end
subgraph "API Routes"
APIAnalytics["GET /api/admin/analytics<br/>(src/app/api/admin/analytics/route.ts)"]
APIUpload["POST /api/admin/upload<br/>(src/app/api/admin/upload/route.ts)"]
APIUsers["GET/PATCH /api/admin/users<br/>(src/app/api/admin/users/route.ts)"]
end
subgraph "Auth & DB"
AuthMW["requireAdmin()<br/>(src/lib/auth-middleware.ts)"]
FBAdmin["Firebase Admin SDK<br/>(src/lib/firebase-admin.ts)"]
FBClient["Firebase Client SDK<br/>(src/lib/firebase.ts)"]
end
AdminHome --> APIAnalytics
AnalyticsPage --> APIAnalytics
UploadPage --> APIUpload
UsersPage --> APIUsers
APIAnalytics --> AuthMW
APIUpload --> AuthMW
APIUsers --> AuthMW
AuthMW --> FBAdmin
AdminHome --> FBClient
AnalyticsPage --> FBClient
UploadPage --> FBClient
UsersPage --> FBClient
```

**Diagram sources**
- [src/app/admin/page.tsx:1-242](file://src/app/admin/page.tsx#L1-L242)
- [src/app/admin/analytics/page.tsx:1-228](file://src/app/admin/analytics/page.tsx#L1-L228)
- [src/app/admin/upload/page.tsx:1-295](file://src/app/admin/upload/page.tsx#L1-L295)
- [src/app/admin/users/page.tsx:1-178](file://src/app/admin/users/page.tsx#L1-L178)
- [src/app/api/admin/analytics/route.ts:1-78](file://src/app/api/admin/analytics/route.ts#L1-L78)
- [src/app/api/admin/upload/route.ts:1-93](file://src/app/api/admin/upload/route.ts#L1-L93)
- [src/app/api/admin/users/route.ts:1-54](file://src/app/api/admin/users/route.ts#L1-L54)
- [src/lib/auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [src/lib/firebase-admin.ts:1-50](file://src/lib/firebase-admin.ts#L1-L50)
- [src/lib/firebase.ts:1-22](file://src/lib/firebase.ts#L1-L22)

**Section sources**
- [src/app/admin/page.tsx:1-242](file://src/app/admin/page.tsx#L1-L242)
- [src/app/admin/analytics/page.tsx:1-228](file://src/app/admin/analytics/page.tsx#L1-L228)
- [src/app/admin/upload/page.tsx:1-295](file://src/app/admin/upload/page.tsx#L1-L295)
- [src/app/admin/users/page.tsx:1-178](file://src/app/admin/users/page.tsx#L1-L178)
- [src/app/api/admin/analytics/route.ts:1-78](file://src/app/api/admin/analytics/route.ts#L1-L78)
- [src/app/api/admin/upload/route.ts:1-93](file://src/app/api/admin/upload/route.ts#L1-L93)
- [src/app/api/admin/users/route.ts:1-54](file://src/app/api/admin/users/route.ts#L1-L54)
- [src/lib/auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [src/lib/firebase-admin.ts:1-50](file://src/lib/firebase-admin.ts#L1-L50)
- [src/lib/firebase.ts:1-22](file://src/lib/firebase.ts#L1-L22)

## Core Components
- Admin dashboard overview: renders quick links, stats cards, and recent sales.
- Analytics reporting: revenue, sales counts, user and dataset totals, top selling datasets, and recent sales.
- Dataset upload: CSV validation, metadata extraction, preview generation, and batched persistence.
- User administration: listing users and toggling roles via API.
- Authentication and authorization: Bearer token verification and admin role checks against Firestore.
- Firebase integrations: client SDK for UI and admin SDK for server routes.

**Section sources**
- [src/app/admin/page.tsx:18-242](file://src/app/admin/page.tsx#L18-L242)
- [src/app/admin/analytics/page.tsx:18-228](file://src/app/admin/analytics/page.tsx#L18-L228)
- [src/app/admin/upload/page.tsx:22-295](file://src/app/admin/upload/page.tsx#L22-L295)
- [src/app/admin/users/page.tsx:22-178](file://src/app/admin/users/page.tsx#L22-L178)
- [src/lib/auth-middleware.ts:19-47](file://src/lib/auth-middleware.ts#L19-L47)
- [src/lib/firebase-admin.ts:12-50](file://src/lib/firebase-admin.ts#L12-L50)
- [src/lib/firebase.ts:16-22](file://src/lib/firebase.ts#L16-L22)

## Architecture Overview
The admin panel enforces admin-only access using a Bearer token verified by Firebase Admin. Client pages fetch analytics and manage users/datasets via protected API routes. The admin routes compute aggregates from Firestore collections and persist dataset data in batches.

```mermaid
sequenceDiagram
participant Browser as "Admin UI"
participant Auth as "Auth Middleware<br/>(requireAdmin)"
participant API as "Admin API Route"
participant DB as "Firestore"
Browser->>API : "GET /api/admin/analytics"<br/>Authorization : Bearer <token>
API->>Auth : "Verify token and check role"
Auth->>DB : "Read purchases/users/datasets"
DB-->>Auth : "Collections snapshot"
Auth-->>API : "Authorized"
API-->>Browser : "Analytics JSON"
Note over Browser,DB : "Similar pattern for uploads and user updates"
```

**Diagram sources**
- [src/app/api/admin/analytics/route.ts:5-78](file://src/app/api/admin/analytics/route.ts#L5-L78)
- [src/lib/auth-middleware.ts:30-47](file://src/lib/auth-middleware.ts#L30-L47)
- [src/lib/firebase-admin.ts:37-42](file://src/lib/firebase-admin.ts#L37-L42)

## Detailed Component Analysis

### Admin Dashboard Overview
- Purpose: Provide a summary of key metrics and quick actions for admins.
- Key features:
  - Role-gated rendering (non-admins are redirected).
  - Fetches analytics via bearer token.
  - Displays stats cards and recent sales list.
- Navigation: Links to upload, users, and analytics pages.

```mermaid
flowchart TD
Start(["Load Admin Home"]) --> CheckAuth["Check user role"]
CheckAuth --> IsAdmin{"Is admin?"}
IsAdmin --> |No| Redirect["Redirect to home"]
IsAdmin --> |Yes| Fetch["Fetch analytics with Bearer token"]
Fetch --> Render["Render stats and quick links"]
Render --> End(["Ready"])
```

**Diagram sources**
- [src/app/admin/page.tsx:38-102](file://src/app/admin/page.tsx#L38-L102)
- [src/app/admin/page.tsx:50-72](file://src/app/admin/page.tsx#L50-L72)

**Section sources**
- [src/app/admin/page.tsx:38-242](file://src/app/admin/page.tsx#L38-L242)

### Analytics Reporting System
- Endpoint: GET /api/admin/analytics
- Responsibilities:
  - Compute total revenue from completed purchases.
  - Count total users and datasets.
  - Retrieve recent sales (last 30).
  - Aggregate top datasets by revenue.
- Frontend pages:
  - Admin overview and dedicated analytics page both call the same endpoint and render statistics.

```mermaid
sequenceDiagram
participant UI as "Admin Pages"
participant API as "GET /api/admin/analytics"
participant MW as "requireAdmin"
participant DB as "Firestore"
UI->>API : "Fetch analytics"
API->>MW : "Require admin"
MW->>DB : "Read purchases/users/datasets"
DB-->>MW : "Snapshots"
MW-->>API : "OK"
API-->>UI : "{totalRevenue, totalSales, topDatasets, recentSales}"
```

**Diagram sources**
- [src/app/api/admin/analytics/route.ts:5-78](file://src/app/api/admin/analytics/route.ts#L5-L78)
- [src/app/admin/analytics/page.tsx:38-72](file://src/app/admin/analytics/page.tsx#L38-L72)
- [src/app/admin/page.tsx:50-72](file://src/app/admin/page.tsx#L50-L72)

**Section sources**
- [src/app/api/admin/analytics/route.ts:5-78](file://src/app/api/admin/analytics/route.ts#L5-L78)
- [src/app/admin/analytics/page.tsx:18-228](file://src/app/admin/analytics/page.tsx#L18-L228)

### Dataset Management Interface
- Upload page:
  - Validates presence of CSV and required metadata.
  - Parses CSV with Papa Parse, extracts columns and preview rows.
  - Creates dataset document and persists full data in batches to a subcollection.
  - Returns success with record count and column metadata.
- Permissions: Admin-only via bearer token.

```mermaid
sequenceDiagram
participant Admin as "Admin UI"
participant API as "POST /api/admin/upload"
participant MW as "requireAdmin"
participant DB as "Firestore"
Admin->>API : "FormData (CSV + metadata)"
API->>MW : "Verify admin"
MW-->>API : "Authorized"
API->>API : "Parse CSV"
API->>DB : "Create dataset doc"
API->>DB : "Batch write fullData"
DB-->>API : "OK"
API-->>Admin : "{success, recordCount, columns}"
```

**Diagram sources**
- [src/app/admin/upload/page.tsx:44-98](file://src/app/admin/upload/page.tsx#L44-L98)
- [src/app/api/admin/upload/route.ts:6-93](file://src/app/api/admin/upload/route.ts#L6-L93)

**Section sources**
- [src/app/admin/upload/page.tsx:22-295](file://src/app/admin/upload/page.tsx#L22-L295)
- [src/app/api/admin/upload/route.ts:6-93](file://src/app/api/admin/upload/route.ts#L6-L93)

### User Administration System
- Listing users:
  - GET /api/admin/users returns user list ordered by creation date.
- Role management:
  - PATCH /api/admin/users toggles role between "user" and "admin".
  - UI disables self-role change.
- Frontend:
  - Displays users in a table with role badges and action buttons.

```mermaid
sequenceDiagram
participant Admin as "Admin UI"
participant API as "GET/PATCH /api/admin/users"
participant MW as "requireAdmin"
participant DB as "Firestore"
Admin->>API : "GET users"
API->>MW : "Verify admin"
MW-->>API : "Authorized"
API->>DB : "List users"
DB-->>API : "Users"
API-->>Admin : "{users}"
Admin->>API : "PATCH {userId, role}"
API->>DB : "Update user role"
DB-->>API : "OK"
API-->>Admin : "{success}"
```

**Diagram sources**
- [src/app/admin/users/page.tsx:30-92](file://src/app/admin/users/page.tsx#L30-L92)
- [src/app/api/admin/users/route.ts:5-54](file://src/app/api/admin/users/route.ts#L5-L54)

**Section sources**
- [src/app/admin/users/page.tsx:22-178](file://src/app/admin/users/page.tsx#L22-L178)
- [src/app/api/admin/users/route.ts:1-54](file://src/app/api/admin/users/route.ts#L1-L54)

### Analytics API Endpoints
- GET /api/admin/analytics
  - Computes revenue, sales, user, and dataset counts.
  - Aggregates top datasets by revenue.
  - Returns recent sales snapshots.

**Section sources**
- [src/app/api/admin/analytics/route.ts:5-78](file://src/app/api/admin/analytics/route.ts#L5-L78)

### Dataset Upload Pipeline
- Validation and parsing:
  - Ensures required fields and numeric price.
  - Uses Papa Parse to validate CSV and extract headers and preview rows.
- Persistence:
  - Writes dataset metadata to "datasets" collection.
  - Writes full data in batches to a "fullData" subcollection for scalability.

**Section sources**
- [src/app/api/admin/upload/route.ts:23-77](file://src/app/api/admin/upload/route.ts#L23-L77)

### Authentication and Authorization
- Bearer token verification:
  - Extracts Authorization header and verifies ID token.
- Admin enforcement:
  - Confirms user role stored in Firestore "users" collection equals "admin".
- Client token acquisition:
  - React hook provides getIdToken() for protected requests.

```mermaid
flowchart TD
Req["Incoming Request"] --> HasHeader{"Has Bearer?"}
HasHeader --> |No| Unauthorized["401 Unauthorized"]
HasHeader --> |Yes| Verify["Verify ID Token"]
Verify --> Valid{"Valid token?"}
Valid --> |No| Unauthorized
Valid --> |Yes| LoadUser["Load user from Firestore"]
LoadUser --> Role{"role == 'admin'?"}
Role --> |No| Forbidden["403 Forbidden"]
Role --> |Yes| OK["Allow"]
```

**Diagram sources**
- [src/lib/auth-middleware.ts:4-47](file://src/lib/auth-middleware.ts#L4-L47)
- [src/hooks/use-auth.tsx:94-99](file://src/hooks/use-auth.tsx#L94-L99)

**Section sources**
- [src/lib/auth-middleware.ts:19-47](file://src/lib/auth-middleware.ts#L19-L47)
- [src/hooks/use-auth.tsx:94-99](file://src/hooks/use-auth.tsx#L94-L99)

## Dependency Analysis
- Client pages depend on:
  - use-auth hook for user state and getIdToken().
  - UI components from shared libraries.
- API routes depend on:
  - requireAdmin middleware for authorization.
  - adminDb for Firestore operations.
- Firebase:
  - Client SDK for UI interactions.
  - Admin SDK for server-side reads/writes.

```mermaid
graph LR
AdminPages["Admin Pages"] --> UseAuth["use-auth hook"]
AdminPages --> UIComp["UI Components"]
AdminPages --> APIRoutes["Admin API Routes"]
APIRoutes --> AuthMW["requireAdmin"]
APIRoutes --> AdminDB["adminDb (Firestore)"]
UseAuth --> FBClient["Firebase Client SDK"]
AdminDB --> FBAdmin["Firebase Admin SDK"]
```

**Diagram sources**
- [src/app/admin/page.tsx:38-72](file://src/app/admin/page.tsx#L38-L72)
- [src/app/admin/analytics/page.tsx:38-72](file://src/app/admin/analytics/page.tsx#L38-L72)
- [src/app/admin/upload/page.tsx:24-98](file://src/app/admin/upload/page.tsx#L24-L98)
- [src/app/admin/users/page.tsx:32-92](file://src/app/admin/users/page.tsx#L32-L92)
- [src/app/api/admin/analytics/route.ts:8-9](file://src/app/api/admin/analytics/route.ts#L8-L9)
- [src/app/api/admin/upload/route.ts:9-10](file://src/app/api/admin/upload/route.ts#L9-L10)
- [src/app/api/admin/users/route.ts:8-9](file://src/app/api/admin/users/route.ts#L8-L9)
- [src/lib/firebase-admin.ts:37-42](file://src/lib/firebase-admin.ts#L37-L42)
- [src/lib/firebase.ts:18-20](file://src/lib/firebase.ts#L18-L20)

**Section sources**
- [src/app/layout.tsx:31-45](file://src/app/layout.tsx#L31-L45)
- [src/components/layout/navbar.tsx:38-82](file://src/components/layout/navbar.tsx#L38-L82)
- [package.json:11-38](file://package.json#L11-L38)

## Performance Considerations
- Batched writes during dataset upload:
  - Full data is written in chunks to avoid large single transactions and improve reliability.
- Pagination and limits:
  - Analytics endpoint limits recent sales to a fixed number to keep responses small.
- Client-side caching:
  - Consider memoizing analytics results per session to reduce redundant network calls.
- Bulk operations:
  - Role toggling is per-user; for future bulk role changes, implement a dedicated endpoint to minimize round trips.
- CSV parsing:
  - Validate file size and limit preview rows to prevent memory pressure.

[No sources needed since this section provides general guidance]

## Security Considerations
- Admin access control:
  - All admin endpoints enforce bearer token verification and admin role checks.
- Token handling:
  - Tokens are requested via getIdToken() and attached to Authorization headers.
- Audit logging:
  - Add request logging (timestamp, admin UID, endpoint, IP) at the API gateway or middleware level for compliance.
- Data exposure:
  - Ensure analytics responses exclude sensitive fields and apply rate limiting to prevent abuse.
- CORS and transport:
  - Enforce HTTPS and restrict origins at the web server level.

**Section sources**
- [src/lib/auth-middleware.ts:30-47](file://src/lib/auth-middleware.ts#L30-L47)
- [src/hooks/use-auth.tsx:94-99](file://src/hooks/use-auth.tsx#L94-L99)

## Troubleshooting Guide
- Admin page redirects to home:
  - Occurs when user is missing or role is not "admin". Verify user role in Firestore and token validity.
- Analytics fetch fails:
  - Check bearer token presence and admin role. Inspect server logs for analytics route errors.
- Upload fails:
  - Ensure CSV is valid and required fields are present. Confirm price is numeric and preview rows are within bounds.
- User role toggle disabled:
  - Self-role changes are intentionally disabled in the UI. Use another admin account to revoke your own admin privileges.
- Authentication errors:
  - Confirm getIdToken() resolves to a non-null value. Check Firebase credentials and service account configuration.

**Section sources**
- [src/app/admin/page.tsx:44-48](file://src/app/admin/page.tsx#L44-L48)
- [src/app/admin/analytics/page.tsx:50-72](file://src/app/admin/analytics/page.tsx#L50-L72)
- [src/app/admin/upload/page.tsx:44-98](file://src/app/admin/upload/page.tsx#L44-L98)
- [src/app/admin/users/page.tsx:66-92](file://src/app/admin/users/page.tsx#L66-L92)
- [src/lib/auth-middleware.ts:30-47](file://src/lib/auth-middleware.ts#L30-L47)

## Conclusion
The Datafrica admin panel provides a focused set of capabilities for revenue tracking, dataset management, and user administration, secured by robust bearer token verification and admin role enforcement. The analytics API consolidates key metrics, while the upload pipeline ensures reliable ingestion of datasets. For production hardening, consider audit logging, rate limiting, and optional bulk management features.