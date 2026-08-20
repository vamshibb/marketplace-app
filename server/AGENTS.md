# AGENTS.md

## Purpose

This repository follows a defined architecture and development workflow. Before implementing any feature or making changes, read `AI_CONTEXT.md`.

The goal is to maintain a clean, scalable, and production-ready codebase. Prefer extending existing patterns instead of introducing new ones.

---

# Development Principles

- Follow the existing project architecture.
- Reuse existing code whenever possible.
- Do not introduce new architectural patterns without explicit approval.
- Keep implementations simple, readable, and maintainable.
- Prioritize consistency over cleverness.

---

# Layer Responsibilities

Follow the project layering strictly.

```
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
Database
```

Never bypass a layer unless explicitly instructed.

---

# General Rules

- Controllers should only handle HTTP requests and responses.
- Services contain all business logic.
- Repositories are responsible for database access only.
- DTOs shape API responses.
- Validators only validate incoming requests.
- Middleware should remain reusable and generic.

---

# Database Rules

- Never access Prisma directly from Controllers.
- Never access Prisma directly from Services.
- Always use Repository methods for database operations.
- Reuse existing repository methods before creating new ones.

---

# Error Handling

- Use the existing `AppError` class for application errors.
- Use the global error middleware.
- Do not create feature-specific error handling unless required.

---

# Response Standards

- Use the existing API response helpers.
- Return DTOs instead of Prisma entities when appropriate.
- Keep API responses consistent across the application.

---

# Code Quality

- Keep functions focused on a single responsibility.
- Prefer small reusable helper methods.
- Avoid duplicated logic.
- Follow existing naming conventions.
- Prefer readability over micro-optimizations.

---

# Before Implementing a Feature

1. Read `AI_CONTEXT.md`.
2. Review the existing implementation.
3. Reuse existing services, repositories, and utilities.
4. Identify whether new architecture is actually required.
5. If a design change is needed, explain it before implementing.

---

# Expected Workflow

Feature Specification

↓

Implementation

↓

Code Review

↓

Testing

↓

Build Verification

↓

Commit

↓

Deployment

---

# Important

When implementing new functionality:

- Extend the current architecture.
- Do not redesign the project.
- Do not duplicate existing functionality.
- Keep changes isolated to the current feature whenever possible.