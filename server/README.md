# Marketplace Backend

Marketplace Backend is an enterprise-grade REST API built to demonstrate production-quality backend engineering practices. The project emphasizes clean architecture, scalability, maintainability, security, performance, and developer experience.

---

# Architecture

The application uses a layered architecture with clear boundaries between HTTP handling, business logic, and data access.

```text
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

Every business module follows this architecture to ensure consistency, maintainability, and predictable code organization across the application.

| Layer | Responsibility |
| --- | --- |
| Route | Defines endpoints and applies middleware. |
| Controller | Translates HTTP requests into service calls and returns standardized responses. |
| Service | Owns business logic, authorization, and application workflows. |
| Repository | Encapsulates database access and Prisma queries. |
| Prisma | Provides type-safe database access and schema management. |
| PostgreSQL | Stores application data persistently. |

---

# Tech Stack

| Area | Technologies |
| --- | --- |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT |
| Validation | Zod |
| Storage | Azure Blob Storage |
| API Style | REST |
| Architecture | Repository Pattern, Layered Architecture, DTO Mapping |

---

# Features

## Authentication

- User registration
- Login
- JWT authentication

## Marketplace

- Product CRUD
- Categories
- Favorites
- Reviews
- Product media
- Order management
- Azure Blob Storage integration

## Search & Discovery

- Keyword search
- Filtering
- Sorting
- Pagination
- Query validation

## Messaging

- Product-based conversations
- Direct messaging
- Conversation management
- Conversation authorization
- Message authorization

## Notifications

- In-app notifications
- Automatic message notifications
- Unread notification count
- Mark notification as read
- Mark all notifications as read

## Architecture & Platform

- Repository pattern
- Thin controllers
- Service layer
- DTO mapping
- Generic API responses
- Unified validation middleware
- Route parameter validation
- Centralized environment configuration

---

# Project Structure

```text
src/
├── config/
├── constants/
├── controllers/
├── dto/
├── errors/
├── generated/
├── middleware/
├── prisma/
├── repositories/
├── routes/
├── services/
├── types/
├── utils/
└── validators/
```

| Directory | Responsibility |
| --- | --- |
| `config/` | Centralized application and external-service configuration. |
| `constants/` | Shared constant values used across the application. |
| `controllers/` | HTTP request handling and response coordination. |
| `dto/` | Public response shapes and data-transfer objects. |
| `errors/` | Application error types and error-handling primitives. |
| `generated/` | Generated code, including the Prisma client. |
| `middleware/` | Authentication, validation, error handling, and other cross-cutting concerns. |
| `prisma/` | Database schema, migrations, client setup, and seed logic. |
| `repositories/` | Database access and persistence operations. |
| `routes/` | API endpoint definitions and middleware composition. |
| `services/` | Business rules, authorization, and application workflows. |
| `types/` | Shared TypeScript types and interfaces. |
| `utils/` | Reusable utilities and response helpers. |
| `validators/` | Zod schemas for request validation. |

---

# Getting Started

## Prerequisites

- Node.js
- PostgreSQL
- Azure Storage account (for product media)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL=
JWT_SECRET=
AZURE_STORAGE_CONNECTION_STRING=
```

## Run in Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

---

# API Overview

The API is organized into focused modules.

- Authentication
- Products
- Categories
- Reviews
- Favorites
- Product Media
- Conversations
- Messages
- orders
- Notifications

Every module follows the same:

- Route
- Controller
- Service
- Repository
- DTO
- Validation

architecture to keep the codebase consistent, maintainable, and scalable.

---

# Engineering Principles

- **Thin Controllers** — Controllers focus exclusively on HTTP concerns.
- **Business Logic in Services** — Services own workflows, authorization, and business rules.
- **Repository Pattern** — Repositories are the only application layer that accesses Prisma.
- **DTO Mapping** — Public API responses are isolated from database models.
- **Global Error Handling** — Application errors are processed consistently through centralized middleware.
- **Shared Validation Middleware** — Reusable Zod-based validation supports request bodies, route parameters, and query parameters.
- **Module Consistency** — Every feature follows the same layered architecture and engineering conventions.

---

# Documentation

Additional project documentation is available at the project root.

- [`ROADMAP.md`](ROADMAP.md) — Project roadmap, completed milestones, and upcoming work.
- [`CHANGELOG.md`](CHANGELOG.md) — Project release history and notable changes.
- [`AI_CONTEXT.md`](AI_CONTEXT.md) — Architecture decisions, implementation guidelines, and development conventions.

---

# Upcoming Features

Current roadmap includes:

- Administration
- Performance improvements
- Testing & DevOps

See [`ROADMAP.md`](ROADMAP.md) for the complete roadmap.

---

# License

This project is licensed under the MIT License.