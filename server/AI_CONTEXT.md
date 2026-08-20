# AI Context - Marketplace Backend

## Project Overview

This project is an enterprise-grade marketplace backend built with:

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Azure Blob Storage

The project prioritizes:

- Clean Architecture
- Maintainability
- Scalability
- Consistency
- Security
- Developer Experience

The architecture is considered stable.

Future features should extend the existing architecture instead of introducing new patterns.

---

# Technology Stack

## Backend

- Node.js
- Express
- TypeScript

## Database

- PostgreSQL
- Prisma ORM

## Authentication

- JWT Authentication

## Storage

- Azure Blob Storage

## Validation

- Zod

---

# Architecture

Every business module follows the same layered architecture.

```
HTTP Request
      ↓
Route
      ↓
Controller
      ↓
Service
      ↓
Repository
      ↓
Prisma
      ↓
PostgreSQL
```

---

# Layer Responsibilities

## Routes

Responsibilities

- Define endpoints
- Apply middleware
- Forward requests to controllers

Must NOT

- Contain business logic
- Access Prisma

---

## Controllers

Responsibilities

- Read HTTP requests
- Call a single service
- Return API responses
- Forward errors to middleware

Must NOT

- Access Prisma
- Access Azure SDK
- Perform business validation
- Perform authorization
- Contain business logic

---

## Services

Responsibilities

- Own business logic
- Own authorization
- Own ownership validation
- Coordinate repositories
- Coordinate StorageService
- Throw AppError when necessary

Must NOT

- Access Prisma directly

---

## Repositories

Responsibilities

- Execute Prisma queries
- Return database models

Must NOT

- Contain business logic
- Perform authorization

Repositories are the only layer allowed to access Prisma.

---

## DTOs

Responsibilities

- Shape API responses
- Hide internal implementation details
- Prevent leaking database models

---

## Validators

Responsibilities

- Validate request body
- Validate query parameters
- Validate route parameters

Business validation belongs inside Services.

---

## Middleware

Responsibilities

- Authentication
- Validation
- Error Handling
- Cross-cutting concerns

Middleware should remain reusable.

---

# Configuration

Application configuration is centralized under:

```
src/config/
```

Use:

```
env.ts
```

for all environment variables.

Do not access `process.env` outside configuration modules.

---

# Storage

Azure Blob Storage is abstracted behind StorageService.

StorageService is responsible for:

- Uploading files
- Deleting files
- Blob naming

Business logic must not access Azure SDK directly.

---

# Error Handling

Use AppError.

Forward errors using the global error middleware.

Do not manually construct error responses inside controllers.

---

# API Responses

Use:

```
successResponse<T>()
```

Controllers should never return raw objects.

---

# Validation

Use the shared validation middleware.

Supported request sources:

- body
- query
- params

---

# Authentication

Authentication uses JWT.

Authenticated user information is available through AuthRequest.

Authorization belongs inside Services.

---

# Repository Rules

Repositories should:

- Reuse existing queries whenever possible
- Avoid duplicate database logic
- Return Prisma models only

---

# Coding Standards

- TypeScript strict mode
- Prefer async/await
- Prefer early returns
- One responsibility per function
- Keep controllers thin
- Keep services focused
- Reuse utilities
- Prefer readability over clever implementations

---

# Existing Features

Current modules include:

- Authentication
- Products
- Categories
- Reviews
- Favorites
- Product Media
- Search & Discovery

Reuse existing modules whenever possible.

---

# Development Workflow

Every feature follows this lifecycle.

1. Requirements
2. Repository
3. Service
4. Controller
5. Routes
6. Validation
7. Testing
8. Build
9. Documentation
10. Deployment

---

# AI Implementation Rules

Before generating code:

1. Review the existing implementation.
2. Reuse the current architecture.
3. Extend existing modules.
4. Avoid introducing new patterns.

When generating code:

- Keep controllers thin.
- Keep services responsible for business logic.
- Keep repositories responsible for database access.
- Use DTOs.
- Use AppError.
- Use successResponse<T>().
- Use the shared validation middleware.

Never:

- Access Prisma outside repositories.
- Access Azure SDK outside StorageService.
- Duplicate repository methods.
- Introduce architectural changes without explanation.