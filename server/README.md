# Marketplace Backend

Marketplace Backend is an enterprise-grade REST API built to demonstrate production-quality backend engineering practices. The project emphasizes clean architecture, scalability, maintainability, security, performance, and developer experience.

## Architecture

The application uses a layered architecture with clear boundaries between HTTP handling, business logic, and data access:

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

| Layer | Responsibility |
| --- | --- |
| Route | Defines endpoints and applies middleware. |
| Controller | Translates HTTP requests into service calls and returns standardized responses. |
| Service | Owns business logic, authorization, and application workflows. |
| Repository | Encapsulates database access and Prisma queries. |
| Prisma | Provides type-safe database access and schema management. |
| PostgreSQL | Stores application data persistently. |

## Tech Stack

| Area | Technologies |
| --- | --- |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT |
| Validation | Zod |
| Storage | Azure Blob Storage |

## Features

### Authentication

- User registration
- Login
- JWT authentication

### Marketplace

- Product CRUD
- Categories
- Favorites
- Reviews
- Product media

### Search and Discovery

- Keyword search
- Filtering
- Sorting
- Pagination

### Architecture and Platform

- Repository pattern
- Thin controllers
- Service layer
- Generic API responses
- Unified validation
- Route parameter validation
- Centralized environment configuration

## Project Structure

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

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL
- An Azure Storage account for product media

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root and provide the required values:

```env
DATABASE_URL=
JWT_SECRET=
AZURE_STORAGE_CONNECTION_STRING=
```

### Run in Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## API Overview

The API is organized into focused modules for:

- Authentication
- Products
- Categories
- Reviews
- Favorites
- Product media

Each module follows the same route, controller, service, and repository flow to keep behavior consistent and maintainable.

## Engineering Principles

- **Thin controllers:** Controllers focus exclusively on HTTP concerns.
- **Business logic in services:** Services own workflows, authorization, and business rules.
- **Repository pattern:** Repositories are the only application layer that accesses Prisma.
- **DTOs:** API responses use deliberate public shapes instead of exposing database models directly.
- **Global error handling:** Application errors are processed consistently by centralized middleware.
- **Shared validation middleware:** Reusable Zod-based validation covers request bodies, parameters, and queries.

## Documentation

Additional project documentation is available at the project root:

- [`ROADMAP.md`](ROADMAP.md) outlines completed milestones, active work, and planned improvements.
- [`AI_CONTEXT.md`](AI_CONTEXT.md) documents the architecture, conventions, and implementation rules.
- [`CHANGELOG.md`](CHANGELOG.md) records notable project changes over time.

## Upcoming Features

Planned work is tracked in [`ROADMAP.md`](ROADMAP.md) and currently includes:

- Messaging
- Notifications
- Administration
- Performance improvements

## License

This project is licensed under the MIT License.
