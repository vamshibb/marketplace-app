# Project Decisions

## Stack

### React 19
Decision: React 19 is the frontend UI runtime.
Reason: It provides the approved component and rendering model.

### Vite
Decision: Vite is the development and production build tool.
Reason: It provides the approved frontend build pipeline.

### React Router v7
Decision: React Router v7 owns client-side routing.
Reason: It provides the approved route, layout, and navigation model.

### TanStack Query
Decision: TanStack Query v5 owns server state.
Reason: It centralizes fetching, caching, synchronization, and mutations.

### Zustand
Decision: Zustand owns cross-component client state only.
Reason: It provides minimal client-state management without duplicating server data.

### Axios
Decision: Axios is the sole HTTP client.
Reason: It centralizes REST transport and authentication headers.

### React Hook Form
Decision: React Hook Form owns form state and submission state.
Reason: It provides the approved form lifecycle with minimal rendering overhead.

### Zod
Decision: Zod owns runtime input and form validation schemas.
Reason: It keeps validation explicit and type-aligned.

### Tailwind CSS
Decision: Tailwind CSS v4 is the sole styling system.
Reason: It provides consistent utility-first styling without parallel CSS systems.

### Feature-First Architecture
Decision: Business capabilities are organized as isolated features.
Reason: It keeps ownership clear and changes localized.

## Routing

Decision: Routes are centrally composed with public, protected, and nested boundaries.
Reason: Navigation remains consistent while feature pages retain feature ownership.

## State Management

Decision: TanStack Query owns server state; Zustand owns client state.
Reason: A single owner prevents duplicated and divergent state.

## API

Decision: Requests follow Component → Hook → Feature API → Shared Axios → Backend.
Reason: HTTP concerns remain outside components and feature boundaries stay explicit.

## Styling

Decision: Components use Tailwind CSS v4 utilities only.
Reason: One styling model prevents fragmented conventions.

## Testing

Decision: Vitest, React Testing Library, and MSW form the frontend test stack.
Reason: Tests verify user behavior and API integration at stable boundaries.

## Folder Structure

Decision: Source code is organized under `app/`, `features/`, `shared/`, and `assets/`.
Reason: The structure separates composition, business capabilities, reusable primitives, and static files.
