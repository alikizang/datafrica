# Download Token Model

<cite>
**Referenced Files in This Document**
- [route.ts](file://src/app/api/datasets/[id]/download/route.ts)
- [route.ts](file://src/app/api/payments/verify/route.ts)
- [index.ts](file://src/types/index.ts)
- [auth-middleware.ts](file://src/lib/auth-middleware.ts)
- [firebase-admin.ts](file://src/lib/firebase-admin.ts)
- [page.tsx](file://src/app/dashboard/page.tsx)
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
This document provides comprehensive documentation for the DownloadToken data model used to secure dataset downloads. It explains the token-based protection mechanism, covering property definitions, generation, validation, expiration handling, and usage tracking. It also outlines the relationships with purchase verification, user authentication, and dataset access control, along with security considerations and operational examples.

## Project Structure
The DownloadToken model is defined in the shared types module and is consumed by the payment verification endpoint (which generates tokens) and the dataset download endpoint (which validates tokens). Authentication is enforced via middleware, and database access is performed through Firebase Admin.

```mermaid
graph TB
subgraph "Client"
UI["Dashboard UI<br/>page.tsx"]
end
subgraph "Server"
AUTH["Auth Middleware<br/>auth-middleware.ts"]
PAY["Payments Verify Endpoint<br/>payments/verify/route.ts"]
DL["Download Endpoint<br/>datasets/[id]/download/route.ts"]
TYPES["Types Definition<br/>types/index.ts"]
FIRE["Firebase Admin<br/>firebase-admin.ts"]
end
UI --> |HTTP Request| PAY
UI --> |HTTP Request| DL
PAY --> |Verify Payment & Create Purchase| FIRE
PAY --> |Generate & Store Token| FIRE
DL --> |Require Auth| AUTH
DL --> |Validate Token & Serve Data| FIRE
TYPES --> PAY
TYPES --> DL
```

**Diagram sources**
- [route.ts:1-135](file://src/app/api/payments/verify/route.ts#L1-L135)
- [route.ts:1-148](file://src/app/api/datasets/[id]/download/route.ts#L1-L148)
- [index.ts:43-50](file://src/types/index.ts#L43-L50)
- [auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [firebase-admin.ts:1-50](file://src/lib/firebase-admin.ts#L1-L50)
- [page.tsx:68-103](file://src/app/dashboard/page.tsx#L68-L103)

**Section sources**
- [route.ts:1-135](file://src/app/api/payments/verify/route.ts#L1-L135)
- [route.ts:1-148](file://src/app/api/datasets/[id]/download/route.ts#L1-L148)
- [index.ts:43-50](file://src/types/index.ts#L43-L50)
- [auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [firebase-admin.ts:1-50](file://src/lib/firebase-admin.ts#L1-L50)
- [page.tsx:68-103](file://src/app/dashboard/page.tsx#L68-L103)

## Core Components
The DownloadToken model defines the structure and constraints for secure dataset access tokens. It includes:
- id: Unique identifier for the token document
- userId: Foreign key to the purchasing user
- datasetId: Foreign key to the purchased dataset
- token: Cryptographic token string (UUID)
- expiresAt: ISO 8601 timestamp indicating expiration
- used: Boolean flag indicating single-use consumption

Validation rules and constraints observed in the codebase:
- Token uniqueness per dataset-user pair is enforced implicitly by the query conditions during validation
- Expiration is checked against the current time
- Single-use semantics are enforced by marking the token as used after successful validation
- Access requires prior purchase verification and active purchase status

Security considerations:
- Token entropy: UUID v4 is used for token generation, providing strong randomness suitable for cryptographic use
- Expiration policy: Tokens expire after 24 hours from creation
- Access logging: Download events are recorded in a dedicated collection
- Validation scope: Token queries include datasetId, userId, and used=false to prevent reuse and cross-dataset misuse

**Section sources**
- [index.ts:43-50](file://src/types/index.ts#L43-L50)
- [route.ts:112-120](file://src/app/api/payments/verify/route.ts#L112-L120)
- [route.ts:38-68](file://src/app/api/datasets/[id]/download/route.ts#L38-L68)

## Architecture Overview
The token-based security system integrates three primary flows:
1. Payment verification creates a purchase and a download token
2. Dataset download validates authentication, purchase, and token before serving data
3. Access logging records each download event

```mermaid
sequenceDiagram
participant Client as "Client"
participant Payments as "Payments Verify Endpoint"
participant Auth as "Auth Middleware"
participant DB as "Firebase Admin"
Client->>Payments : POST /api/payments/verify (transactionId, datasetId, paymentMethod)
Payments->>Auth : requireAuth()
Auth-->>Payments : {user}
Payments->>DB : Verify payment via external API
Payments->>DB : Create purchase document
Payments->>DB : Add downloadTokens document (token, expiresAt, used=false)
Payments-->>Client : {success, purchaseId, downloadToken}
```

**Diagram sources**
- [route.ts:1-135](file://src/app/api/payments/verify/route.ts#L1-L135)
- [auth-middleware.ts:19-28](file://src/lib/auth-middleware.ts#L19-L28)
- [firebase-admin.ts:37-42](file://src/lib/firebase-admin.ts#L37-L42)

```mermaid
sequenceDiagram
participant Client as "Client"
participant Download as "Download Endpoint"
participant Auth as "Auth Middleware"
participant DB as "Firebase Admin"
Client->>Download : GET /api/datasets/ : id/download?format=csv|excel|json&token=...
Download->>Auth : requireAuth()
Auth-->>Download : {user}
Download->>DB : Query purchases (userId, datasetId, status=completed)
DB-->>Download : Purchase exists?
Download->>DB : Query downloadTokens (token, datasetId, userId, used=false)
DB-->>Download : Token exists and not expired?
Download->>DB : Update token.used=true
Download->>DB : Fetch dataset and data
Download-->>Client : File response (CSV/Excel/JSON)
```

**Diagram sources**
- [route.ts:1-148](file://src/app/api/datasets/[id]/download/route.ts#L1-L148)
- [auth-middleware.ts:19-28](file://src/lib/auth-middleware.ts#L19-L28)
- [firebase-admin.ts:37-42](file://src/lib/firebase-admin.ts#L37-L42)

## Detailed Component Analysis

### DownloadToken Data Model
The DownloadToken interface defines the schema and constraints for token storage and validation.

```mermaid
classDiagram
class DownloadToken {
+string id
+string userId
+string datasetId
+string token
+string expiresAt
+boolean used
}
```

**Diagram sources**
- [index.ts:43-50](file://src/types/index.ts#L43-L50)

**Section sources**
- [index.ts:43-50](file://src/types/index.ts#L43-L50)

### Token Generation and Storage
The payment verification endpoint generates a UUID-based token and stores it with an expiration timestamp and a false used flag. It also creates a purchase record upon successful payment verification.

Key behaviors:
- Token generation uses a cryptographically secure UUID v4 generator
- Expiration is set to 24 hours from creation time
- Token is stored in the downloadTokens collection with userId, datasetId, token, expiresAt, and used=false

Operational example:
- On successful payment verification, the endpoint returns both the purchaseId and the generated downloadToken for client-side use.

**Section sources**
- [route.ts:112-126](file://src/app/api/payments/verify/route.ts#L112-L126)

### Token Validation and Usage Tracking
The download endpoint enforces a multi-layered validation:
- Authentication: Requires a valid Firebase ID token via Bearer authorization
- Purchase verification: Confirms the user has a completed purchase for the requested dataset
- Token validation: Ensures the token exists, belongs to the user and dataset, is unused, and not expired
- Usage tracking: Marks the token as used after successful validation

```mermaid
flowchart TD
Start(["Download Request"]) --> RequireAuth["Require Auth"]
RequireAuth --> HasAuth{"Authenticated?"}
HasAuth --> |No| Unauthorized["Return 401 Unauthorized"]
HasAuth --> |Yes| CheckPurchase["Check Completed Purchase"]
CheckPurchase --> HasPurchase{"Has purchase?"}
HasPurchase --> |No| Forbidden["Return 403 Forbidden"]
HasPurchase --> |Yes| CheckToken["Validate Token"]
CheckToken --> TokenExists{"Token exists and matches<br/>userId, datasetId, used=false?"}
TokenExists --> |No| InvalidToken["Return 403 Invalid or expired token"]
TokenExists --> |Yes| CheckExpiry["Check Expiration"]
CheckExpiry --> Expired{"Expired?"}
Expired --> |Yes| ExpiredResp["Return 403 Expired token"]
Expired --> |No| MarkUsed["Mark token.used=true"]
MarkUsed --> FetchData["Fetch dataset and data"]
FetchData --> ServeFile["Serve file (CSV/Excel/JSON)"]
ServeFile --> End(["Done"])
```

**Diagram sources**
- [route.ts:18-105](file://src/app/api/datasets/[id]/download/route.ts#L18-L105)

**Section sources**
- [route.ts:18-105](file://src/app/api/datasets/[id]/download/route.ts#L18-L105)

### Relationship to Purchase Verification, Authentication, and Access Control
- Purchase verification: Ensures only users who completed payment for the dataset can obtain a token and subsequently download data
- User authentication: Enforces Bearer token authentication for all endpoints, validating the caller's identity
- Access control: Combines purchase status, token validity, and user identity to authorize downloads

```mermaid
graph LR
PUR["Purchase Verification<br/>payments/verify/route.ts"] --> TOK["Token Stored<br/>downloadTokens"]
AUTH["requireAuth()<br/>auth-middleware.ts"] --> DL["Download Endpoint<br/>datasets/[id]/download/route.ts"]
DL --> TOK
DL --> PUR
DL --> DATASET["Dataset & Data<br/>datasets/fullData"]
```

**Diagram sources**
- [route.ts:98-126](file://src/app/api/payments/verify/route.ts#L98-L126)
- [auth-middleware.ts:19-28](file://src/lib/auth-middleware.ts#L19-L28)
- [route.ts:22-105](file://src/app/api/datasets/[id]/download/route.ts#L22-L105)

**Section sources**
- [route.ts:98-126](file://src/app/api/payments/verify/route.ts#L98-L126)
- [auth-middleware.ts:19-28](file://src/lib/auth-middleware.ts#L19-L28)
- [route.ts:22-105](file://src/app/api/datasets/[id]/download/route.ts#L22-L105)

## Dependency Analysis
The download token system depends on:
- Types definition for consistent schema representation
- Authentication middleware for Bearer token validation
- Firebase Admin for Firestore operations
- UUID library for secure token generation

```mermaid
graph TB
TYPES["types/index.ts<br/>DownloadToken"] --> PAY["payments/verify/route.ts"]
TYPES --> DL["datasets/[id]/download/route.ts"]
AUTH["auth-middleware.ts"] --> DL
UUID["uuid v4"] --> PAY
FIRE["firebase-admin.ts"] --> PAY
FIRE --> DL
```

**Diagram sources**
- [index.ts:43-50](file://src/types/index.ts#L43-L50)
- [route.ts](file://src/app/api/payments/verify/route.ts#L4)
- [route.ts](file://src/app/api/datasets/[id]/download/route.ts#L2)
- [auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [firebase-admin.ts:1-50](file://src/lib/firebase-admin.ts#L1-L50)

**Section sources**
- [index.ts:43-50](file://src/types/index.ts#L43-L50)
- [route.ts](file://src/app/api/payments/verify/route.ts#L4)
- [route.ts](file://src/app/api/datasets/[id]/download/route.ts#L2)
- [auth-middleware.ts:1-48](file://src/lib/auth-middleware.ts#L1-L48)
- [firebase-admin.ts:1-50](file://src/lib/firebase-admin.ts#L1-L50)

## Performance Considerations
- Token lookup uses composite queries on token, datasetId, userId, and used=false; ensure appropriate Firestore indexing for these fields to minimize latency
- Expiration checks are performed client-side using date comparison; keep expiresAt in ISO 8601 format for reliable comparisons
- Consider implementing periodic cleanup jobs to remove expired tokens and reduce collection size over time
- Batch operations for bulk downloads should avoid redundant token validations by leveraging cached purchase and token states where feasible

## Troubleshooting Guide
Common issues and resolutions:
- Invalid or expired token: Occurs when the token does not match the user/dataset combination, is marked as used, or has exceeded the 24-hour window
  - Resolution: Regenerate a new token via payment verification or ensure the token is used within the expiration period
- Unauthorized access: Returned when the Bearer token is missing or invalid
  - Resolution: Ensure the client includes a valid Firebase ID token in the Authorization header
- No purchase found: Occurs when the user has not completed a purchase for the dataset
  - Resolution: Complete the payment flow and verify the purchase status before attempting to download
- Download fails with internal error: Indicates server-side exceptions during file generation
  - Resolution: Check server logs and ensure dataset data is accessible and properly formatted

**Section sources**
- [route.ts:31-68](file://src/app/api/datasets/[id]/download/route.ts#L31-L68)
- [auth-middleware.ts:19-28](file://src/lib/auth-middleware.ts#L19-L28)
- [route.ts:98-126](file://src/app/api/payments/verify/route.ts#L98-L126)

## Conclusion
The DownloadToken model provides a robust, token-based mechanism for securing dataset downloads. By combining purchase verification, user authentication, and time-bound, single-use tokens, the system ensures that only authorized users can access purchased datasets. Proper indexing, consistent schema enforcement, and periodic maintenance will help sustain performance and security over time.