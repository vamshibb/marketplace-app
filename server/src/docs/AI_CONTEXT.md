# AI Context - Marketplace Backend

## Project Overview

This project is an enterprise-grade marketplace backend built with Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, and Azure Blob Storage.

The project prioritizes clean architecture, maintainability, scalability, and consistency over rapid feature implementation.

The existing architecture is considered stable. New features should extend the current architecture rather than introducing new patterns.

---

# Technology Stack

## Backend

- Node.js
- Express.js
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

The application follows a layered architecture.

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

Prisma ORM

↓

PostgreSQL
```

Each layer has a single responsibility.

---

# Layer Responsibilities

## Routes

Responsibilities

- Define API endpoints.
- Apply middleware.
- Forward requests to Controllers.

Must NOT

- Contain business logic.
- Access Prisma.

---

## Controllers

Responsibilities

- Read HTTP requests.
- Call a single Service method.
- Return API responses.
- Forward errors to error middleware.

Must NOT

- Access Prisma.
- Access Azure.
- Contain business logic.
- Validate ownership.

---

## Services

Responsibilities

- Own business logic.
- Coordinate repositories.
- Coordinate storage.
- Perform authorization checks.
- Perform business validation.

Must NOT

- Access Prisma directly.

---

## Repositories

Responsibilities

- Database access only.
- Execute Prisma queries.
- Return database models.

Must NOT

- Contain business logic.

---

## DTOs

Responsibilities

- Shape API responses.
- Hide internal database implementation.
- Prevent exposing unnecessary fields.

---

## Validators

Responsibilities

- Validate incoming requests.
- Validate request body.
- Validate params.
- Validate query parameters.

Must NOT

- Perform business validation.

---

## Middleware

Responsibilities

- Authentication
- Validation
- Logging
- Cross-cutting concerns

Middleware should remain reusable.

---

# Folder Structure

```
src/

config/
constants/
controllers/
dto/
middleware/
prisma/
repositories/
routes/
services/
types/
utils/
validators/
generated/
```

Follow the existing folder structure.

Do not introduce new folders without approval.

---

# Coding Standards

- Use TypeScript strict mode.
- Prefer async/await.
- Prefer early returns.
- Keep methods focused on one responsibility.
- Avoid duplicated logic.
- Reuse existing utilities whenever possible.
- Follow existing naming conventions.
- Prefer readability over clever implementations.

---

# Naming Conventions

Files

```
product.controller.ts

product.service.ts

product.repository.ts

product.validator.ts

product.dto.ts
```

Methods

```
findProductById()

createProduct()

updateProduct()

deleteProduct()
```

Use descriptive names.

---

# Repository Rules

Repositories are the only layer allowed to communicate with Prisma.

Always reuse existing repository methods before creating new ones.

Avoid duplicate queries.

---

# Error Handling

Use the existing AppError class.

Use the global error middleware.

Avoid custom error implementations.

---

# API Responses

Use the existing API response helpers.

Maintain consistent response structures.

Prefer DTOs instead of returning Prisma models.

---

# Validation

Request validation belongs in Validators.

Business validation belongs in Services.

Database validation belongs in Repositories.

---

# Authentication

Authentication is handled using JWT.

Authenticated user information is available through AuthRequest.

Authorization belongs inside Services.

---

# Storage

Azure Blob Storage is abstracted behind StorageService.

Never access Azure SDK directly outside StorageService.

StorageService is responsible for

- Uploading files
- Deleting files
- Blob naming

Business logic does not belong in StorageService.

---

# Database

Prisma ORM is used for all database operations.

Repositories own all Prisma access.

Services should never import Prisma Client directly.

---

# Feature Development Workflow

Every feature follows this lifecycle.

1. Define feature requirements.
2. Update repositories if necessary.
3. Implement service.
4. Implement controller.
5. Implement routes.
6. Add validation.
7. Test.
8. Build.
9. Commit.
10. Deploy.

---

# Existing Features

Current implemented modules include

- Authentication
- Products
- Categories
- Favorites
- Reviews
- Azure Storage
- Product Media (in progress)

Reuse existing modules before creating new implementations.

---

# AI Implementation Rules

Before writing code

1. Review existing implementation.
2. Reuse existing architecture.
3. Extend existing modules.
4. Avoid introducing new patterns.

When generating code

- Keep Controllers thin.
- Keep Services responsible for business logic.
- Keep Repositories responsible for database access.
- Use DTOs.
- Use AppError.
- Use existing response helpers.
- Use existing validators.

Do not

- Access Prisma from Controllers.
- Access Prisma from Services.
- Duplicate repository methods.
- Introduce architectural changes without explanation.

If the requested implementation conflicts with the current architecture, explain the issue before generating code.