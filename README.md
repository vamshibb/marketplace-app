# Marketplace Application

## Project Overview

Marketplace Application is a full-stack platform for product discovery, listings, favorites, reviews, messaging, orders, and notifications. The repository contains a React client and a Node.js REST API backed by PostgreSQL.

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router v7 |
| Data and state | TanStack Query v5, Zustand, Axios |
| Forms and UI | React Hook Form, Zod, Tailwind CSS v4, React Hot Toast, Lucide React |
| Backend | Node.js, Express, TypeScript, Prisma |
| Data and auth | PostgreSQL, JWT |
| Media storage | Azure Blob Storage |

## Folder Structure

```text
marketplace-app/
├── client/          # React frontend
│   └── src/
│       ├── app/     # Application composition
│       ├── features/# Marketplace features
│       ├── shared/  # Reusable domain-neutral code
│       └── assets/  # Static assets
├── server/          # Express REST API
│   ├── prisma/      # Database migrations
│   └── src/         # Backend source
└── docs/            # Maintainer documentation
```

## Getting Started

Prerequisites: Node.js, PostgreSQL, and an Azure Storage account.

Install dependencies:

```bash
cd server
npm install

cd ../client
npm install
```

Configure `server/.env`:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
AZURE_STORAGE_CONNECTION_STRING=...
PORT=5000
```

Configure `client/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

Prepare the database and start both applications in separate terminals:

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

```bash
cd client
npm run dev
```

## Scripts

### Client

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

### Server

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API in development mode |
| `npm run build` | Generate Prisma Client and compile the API |
| `npm start` | Run the compiled API |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Apply development migrations |
| `npm run seed` | Seed the database |
| `npm run db:reset` | Reset and seed the database |

## High-Level Architecture Diagram

```text
Browser
  ↓
React UI → Feature hooks → Feature API → Axios
  ↓                                      ↓
Client state                         Express REST API
                                         ↓
                              Services → Repositories → Prisma
                                         ↓
                                     PostgreSQL
```

## Development Workflow

1. Create a focused branch for the change.
2. Confirm the relevant API contract and feature ownership.
3. Implement the smallest complete change within the owning area.
4. Run linting, type checking, relevant tests, and production builds.
5. Review the change for API compatibility, accessibility, and error states.
6. Submit the change with a concise description and verification notes.
