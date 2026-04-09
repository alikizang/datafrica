# Authentication APIs

<cite>
**Referenced Files in This Document**
- [auth-middleware.ts](file://src/lib/auth-middleware.ts)
- [use-auth.tsx](file://src/hooks/use-auth.tsx)
- [login/page.tsx](file://src/app/(auth)/login/page.tsx)
- [register/page.tsx](file://src/app/(auth)/register/page.tsx)
- [admin-users/route.ts](file://src/app/api/admin/users/route.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive API documentation for Datafrica’s authentication endpoints. It covers:
- POST /api/auth/login for user login
- POST /api/auth/register for user registration
- GET /api/auth/me for retrieving current user information

It also documents request/response schemas, error handling, cURL examples, common HTTP error codes, rate limiting considerations, and security best practices. Where applicable, the documentation references the actual implementation files in the repository.

## Project Structure
The authentication logic spans client-side pages and server-side middleware:
- Client-side pages handle user interactions for login and registration.
- A server-side authentication middleware verifies Firebase ID tokens and enforces authorization.
- An admin route demonstrates how server-side endpoints use the middleware.

```mermaid
graph TB
subgraph "Client-Side"
Login["Login Page<br/>(src/app/(auth)/login/page.tsx)"]
Register["Register Page<br/>(src/app/(auth)/register/page.tsx)"]
AuthHook["Auth Hook<br/>(src/hooks/use-auth.tsx)"]
end
subgraph "Server-Side"
Middleware["Auth Middleware<br/>(src/lib/auth-middleware.ts)"]
AdminUsers["Admin Users Endpoint<br/>(src/app/api/admin/users/route.ts)"]
end
Login --> AuthHook
Register --> AuthHook
AuthHook --> Middleware
AdminUsers --> Middleware
```

**Diagram sources**
- [login/page.tsx:14-36](file://src/app/(auth)/login/page.tsx#L14-L36)
- [register/page.tsx:14-43](file://src/app/(auth)/register/page.tsx#L14-L43)
- [use-auth.tsx:34-108](file://src/hooks/use-auth.tsx#L34-L108)
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)
- [admin-users/route.ts:1-53](file://src/app/api/admin/users/route.ts#L1-L53)

**Section sources**
- [login/page.tsx:14-36](file://src/app/(auth)/login/page.tsx#L14-L36)
- [register/page.tsx:14-43](file://src/app/(auth)/register/page.tsx#L14-L43)
- [use-auth.tsx:34-108](file://src/hooks/use-auth.tsx#L34-L108)
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)
- [admin-users/route.ts:1-53](file://src/app/api/admin/users/route.ts#L1-L53)

## Core Components
- Authentication middleware: Verifies Authorization: Bearer tokens against Firebase Admin SDK and returns decoded tokens or 401 Unauthorized.
- Client-side auth hook: Manages Firebase authentication state, handles sign-up/sign-in, and persists user profiles in Firestore.
- Public auth pages: Provide forms for login and registration with basic client-side validation.

Key behaviors:
- Token verification requires the Authorization header to start with "Bearer ".
- On successful authentication, the client obtains a Firebase ID token via the auth hook.
- Server endpoints can reuse the middleware to enforce authentication.

**Section sources**
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)
- [use-auth.tsx:34-108](file://src/hooks/use-auth.tsx#L34-L108)
- [login/page.tsx:14-36](file://src/app/(auth)/login/page.tsx#L14-L36)
- [register/page.tsx:14-43](file://src/app/(auth)/register/page.tsx#L14-L43)

## Architecture Overview
The authentication flow integrates client-side Firebase operations with server-side token verification.

```mermaid
sequenceDiagram
participant Client as "Client App"
participant LoginUI as "Login Page<br/>(login/page.tsx)"
participant AuthHook as "Auth Hook<br/>(use-auth.tsx)"
participant Firebase as "Firebase Auth"
participant Server as "Server Endpoint"
participant MW as "Auth Middleware<br/>(auth-middleware.ts)"
Client->>LoginUI : Submit login form
LoginUI->>AuthHook : signIn(email, password)
AuthHook->>Firebase : signInWithEmailAndPassword(...)
Firebase-->>AuthHook : User credential
AuthHook-->>LoginUI : Resolve
LoginUI-->>Client : Redirect to dashboard
Client->>Server : Request with Authorization : Bearer <id_token>
Server->>MW : verifyAuth(request)
MW-->>Server : Decoded token or null
Server-->>Client : Protected resource or 401
```

**Diagram sources**
- [login/page.tsx:14-36](file://src/app/(auth)/login/page.tsx#L14-L36)
- [use-auth.tsx:84-86](file://src/hooks/use-auth.tsx#L84-L86)
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)

## Detailed Component Analysis

### POST /api/auth/login
Purpose:
- Authenticate a user and return a JWT-like token issued by Firebase (via client-side flow) and user data.

Request:
- Method: POST
- Path: /api/auth/login
- Headers:
  - Content-Type: application/json
  - Authorization: Bearer <Firebase ID Token>
- Body (JSON):
  - email: string (required)
  - password: string (required)
- Validation:
  - Password length checked on the client side before attempting sign-in.

Response:
- On success:
  - 200 OK with JSON containing:
    - token: string (Firebase ID token)
    - user: object with fields such as uid, email, displayName, role, createdAt
- On failure:
  - 400 Bad Request: Invalid input or malformed request
  - 401 Unauthorized: Invalid or missing Authorization header or invalid/expired token
  - 500 Internal Server Error: Unexpected server error

Notes:
- The client obtains the token via the auth hook and sets it in the Authorization header for subsequent requests.
- The server middleware verifies the token using Firebase Admin.

cURL example:
- curl -X POST https://datafricaproject.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{"email":"user@example.com","password":"securepass"}'

Security considerations:
- Use HTTPS in production.
- Store tokens securely on the client and avoid logging them.
- Enforce short token lifetimes and refresh token strategies if needed.

Common error codes:
- 400: Invalid request payload
- 401: Unauthorized (missing/invalid/expired token)
- 500: Internal server error

Rate limiting:
- Apply per-IP or per-user limits on login attempts to prevent brute force.

**Section sources**
- [login/page.tsx:21-36](file://src/app/(auth)/login/page.tsx#L21-L36)
- [use-auth.tsx:84-86](file://src/hooks/use-auth.tsx#L84-L86)
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)

### POST /api/auth/register
Purpose:
- Register a new user with email and password, create a profile in Firestore, and return success or error.

Request:
- Method: POST
- Path: /api/auth/register
- Headers:
  - Content-Type: application/json
  - Authorization: Bearer <Firebase ID Token>
- Body (JSON):
  - name: string (required)
  - email: string (required)
  - password: string (required)
- Validation:
  - Client enforces minimum password length before sending the request.

Response:
- On success:
  - 201 Created with JSON containing:
    - message: string
    - user: object with uid, email, displayName, role, createdAt
- On failure:
  - 400 Bad Request: Invalid input or weak password
  - 401 Unauthorized: Missing/invalid Authorization header or token
  - 500 Internal Server Error: Unexpected server error

Notes:
- The client creates the user via Firebase and writes a Firestore document with user metadata.
- The server middleware can be used to protect downstream endpoints after registration.

cURL example:
- curl -X POST https://datafricaproject.com/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{"name":"John Doe","email":"john@example.com","password":"securepass"}'

Security considerations:
- Enforce strong password policies on the client and server.
- Verify email addresses using Firebase Auth verification flows.
- Sanitize and validate all inputs server-side.

Common error codes:
- 400: Invalid request payload or weak password
- 401: Unauthorized
- 500: Internal server error

Rate limiting:
- Limit registration attempts per IP/email to mitigate abuse.

**Section sources**
- [register/page.tsx:22-43](file://src/app/(auth)/register/page.tsx#L22-L43)
- [use-auth.tsx:69-82](file://src/hooks/use-auth.tsx#L69-L82)
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)

### GET /api/auth/me
Purpose:
- Retrieve the currently authenticated user’s profile data.

Request:
- Method: GET
- Path: /api/auth/me
- Headers:
  - Authorization: Bearer <Firebase ID Token> (required)
- Query parameters: None

Response:
- On success:
  - 200 OK with JSON containing:
    - user: object with uid, email, displayName, role, createdAt
- On failure:
  - 401 Unauthorized: Missing/invalid Authorization header or token
  - 404 Not Found: User profile not found in Firestore
  - 500 Internal Server Error: Unexpected server error

Notes:
- The client obtains the token via the auth hook and includes it in the Authorization header.
- The server middleware verifies the token; downstream handlers can use it to resolve the user.

cURL example:
- curl -X GET https://datafricaproject.com/api/auth/me \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"

Security considerations:
- Always require Authorization: Bearer tokens.
- Avoid exposing sensitive fields unnecessarily.
- Rotate tokens and enforce short-lived sessions.

Common error codes:
- 401: Unauthorized
- 404: Not Found (profile missing)
- 500: Internal server error

Rate limiting:
- Apply per-user limits to prevent enumeration attacks.

**Section sources**
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)
- [use-auth.tsx:44-58](file://src/hooks/use-auth.tsx#L44-L58)

## Dependency Analysis
The authentication system relies on:
- Firebase Authentication for user identity.
- Firebase Admin SDK for server-side token verification.
- Firestore for storing user profiles.

```mermaid
graph TB
AuthHook["Auth Hook<br/>(use-auth.tsx)"] --> FirebaseAuth["Firebase Auth"]
AuthHook --> Firestore["Firestore"]
Middleware["Auth Middleware<br/>(auth-middleware.ts)"] --> FirebaseAdmin["Firebase Admin SDK"]
AdminUsers["Admin Users Endpoint<br/>(admin-users/route.ts)"] --> Middleware
```

**Diagram sources**
- [use-auth.tsx:34-108](file://src/hooks/use-auth.tsx#L34-L108)
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)
- [admin-users/route.ts:1-53](file://src/app/api/admin/users/route.ts#L1-L53)

**Section sources**
- [use-auth.tsx:34-108](file://src/hooks/use-auth.tsx#L34-L108)
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)
- [admin-users/route.ts:1-53](file://src/app/api/admin/users/route.ts#L1-L53)

## Performance Considerations
- Token verification latency: Offload token verification to Firebase Admin SDK; keep network calls minimal.
- Caching: Cache frequently accessed user metadata in memory or Redis for short periods.
- Database reads/writes: Batch Firestore operations and avoid N+1 queries.
- CDN and HTTPS: Serve assets over HTTPS and leverage caching headers.

## Troubleshooting Guide
Common issues and resolutions:
- 401 Unauthorized:
  - Cause: Missing or malformed Authorization header; invalid/expired token.
  - Resolution: Ensure the client sends Authorization: Bearer <id_token>; refresh token if expired.
- 400 Bad Request:
  - Cause: Invalid JSON payload or missing fields.
  - Resolution: Validate request body on the client and server; return precise error messages.
- 404 Not Found:
  - Cause: User profile not found in Firestore.
  - Resolution: Trigger profile creation on first login; ensure user document exists.
- 500 Internal Server Error:
  - Cause: Unhandled exceptions during token verification or database operations.
  - Resolution: Add structured logging and error boundaries; return generic errors to clients.

Operational tips:
- Log failed authentication attempts without exposing sensitive details.
- Monitor token verification failures and alert on spikes.
- Use health checks for Firebase Admin SDK connectivity.

**Section sources**
- [auth-middleware.ts:4-28](file://src/lib/auth-middleware.ts#L4-L28)
- [login/page.tsx:29-32](file://src/app/(auth)/login/page.tsx#L29-L32)
- [register/page.tsx:36-42](file://src/app/(auth)/register/page.tsx#L36-L42)

## Conclusion
Datafrica’s authentication system combines Firebase Authentication for identity with a server-side middleware for token verification. The documented endpoints follow secure patterns: require Authorization headers, enforce input validation, and return standardized error responses. Implement rate limiting, robust logging, and HTTPS to maintain security and reliability.