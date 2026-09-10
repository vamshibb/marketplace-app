# Marketplace App — AI Agent Guide

## Project Overview

Marketplace web application with a React frontend and REST backend.
Use feature-first boundaries and preserve the existing backend API contract.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router v7
- TanStack Query v5
- Zustand
- Axios
- React Hook Form
- Zod
- Tailwind CSS v4
- React Hot Toast

## Folder Structure

```text
src/
├── app/
├── features/
├── shared/
└── assets/
```

- `app/`: providers, router, layouts, and configuration.
- `features/`: feature-owned API, hooks, components, pages, schemas, and types.
- `shared/`: domain-neutral API infrastructure, components, hooks, types, and utilities.
- `assets/`: static bundled assets only.

## Data Flow

```text
Component
→ Hook
→ Feature API
→ Shared Axios
→ Backend
```

## Core Architecture Rules

- Use feature-first architecture.
- Keep feature implementation private to its owner.
- Do not import another feature's internals.
- Components never call Axios directly.
- Feature API modules own HTTP calls and response extraction.
- Hooks own TanStack Query server state and mutations.
- Zustand stores client-owned state only.
- Never duplicate server state in Zustand or local state.
- Pages compose feature hooks and components.
- Components are presentational by default.
- Shared code must be domain-neutral and reusable.
- App code composes providers, routing, layouts, and features.
- Keep backend DTOs aligned with the frozen API contract.
- Keep form state in React Hook Form and validation in Zod schemas.
- Use Tailwind CSS utilities for styling.

## Coding Standards

- Use strict TypeScript; do not use `any`.
- Use functional React components.
- Prefer named exports.
- Keep files small and focused.
- Prefer composition over inheritance.
- Use explicit props and return types at public boundaries.
- Keep loading, empty, error, and success states explicit.
- Preserve accessibility and semantic HTML.

## Do Not

- Do not redesign backend APIs.
- Do not add repository or service layers to the frontend.
- Do not call Axios from components or pages.
- Do not store API resources in Zustand.
- Do not deep-import another feature.
- Do not place feature business logic in `shared` or `app`.
- Do not create circular dependencies.
- Do not duplicate DTOs, query keys, or validation rules.
- Do not introduce parallel state, routing, form, or styling patterns.
- Do not create catch-all utility modules.
