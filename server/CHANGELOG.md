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

# Sprint 4 – Messaging

## Added

- Conversation management
- Conversation participants
- Product-based conversations
- Message management
- Conversation authorization
- DTO layer for messaging
- Shared validation middleware supporting body, params and query
- Conversation and message validators
- RESTful messaging endpoints

## Changed

- Introduced reusable DTO mapping
- Improved API contract isolation from Prisma models
- Enhanced validation middleware with Zod error details
- Standardized messaging API responses

## Security

- Participant authorization for conversations
- Participant authorization for messages
- Ownership validation
- Input validation for conversations and messages

## Testing

- End-to-end API testing completed
- Authorization testing completed
- Validation testing completed
- Regression testing completed

---

# Sprint 5 – Notifications

## Added

- Notification module
- Notification repository layer
- Notification service layer
- Notification controllers
- Notification routes
- Notification DTO layer
- Notification validation
- Notification REST API
- Unread notification count
- Mark notification as read
- Mark all notifications as read
- Automatic message notifications
- Notification metadata support

## Changed

- Messaging now automatically creates notifications after successful message delivery
- Notification responses now use DTOs instead of Prisma models

## Security

- Recipient authorization
- Notification ownership validation

## Testing

- Notification API testing completed
- Authorization testing completed
- Validation testing completed
- Messaging integration testing completed
- End-to-end regression testing completed

---

# Upcoming

## Sprint 6 – Orders

- Order lifecycle
- Buyer order history
- Seller order management
- Order status transitions
- Order notifications

## Sprint 7 – Administration

- Admin dashboard
- User management
- Product moderation

## Sprint 8 – Performance

- Redis caching
- Query optimization
- Rate limiting

## Sprint 9 – Testing & DevOps

- CI/CD
- Docker improvements
- Monitoring
- Production deployment