# Changelog

---

# Sprint 1 – Foundation

## Added

- Express + TypeScript project setup
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Global Error Handling
- Generic API Response helper
- Zod Validation

---

# Sprint 2 – Marketplace Core

## Added

- Product CRUD
- Category Management
- Favorites
- Reviews
- Azure Blob Storage
- Product Media
- Media Upload
- Media Delete
- Media Reordering

---

# Sprint 3 – Search & Discovery

## Added

- Keyword Search
- Category Filtering
- Price Filtering
- Sorting
- Pagination Metadata
- Query Validation

## Changed

- Refactored Product Repository to use ProductFilters
- Improved search architecture
- Preserved pagination behavior

---

# Sprint 3.5 – Architecture Cleanup

## Changed

- Introduced Auth Repository
- Introduced Auth Service
- Standardized Repository Pattern
- Moved Product authorization into Services
- Moved Review authorization into Services
- Introduced Review Repository
- Introduced Favorite Repository
- Standardized business logic ownership
- Standardized authorization ownership
- Unified layered architecture across all modules

---

# Sprint 3.6 – Architecture Polish

## Added

- Generic successResponse<T>()
- Unified Validation Middleware
- Route Parameter Validation
- Centralized Environment Configuration

## Changed

- Improved type safety
- Reduced validation duplication
- Improved configuration management
- Updated project documentation

---

# Upcoming

## Sprint 4

- Messaging
- Conversations
- Attachments

## Sprint 5

- Notifications

## Sprint 6

- Administration

## Sprint 7

- Performance

## Sprint 8

- Testing & DevOps