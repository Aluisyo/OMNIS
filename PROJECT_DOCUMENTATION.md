# ArNS Explorer Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Installation & Setup](#installation--setup)
5. [Development Workflow](#development-workflow)
6. [Core Features](#core-features)
   - [Directory Page](#directory-page)
   - [LiveFeed Page](#livefeed-page)
   - [Name Details Timeline](#name-details-timeline)
   - [Analytics Page](#analytics-page)
   - [Global Owner Resolution Indicator](#global-owner-resolution-indicator)
   - [CSV Export Utility](#csv-export-utility)
7. [Architecture & Data Flow](#architecture--data-flow)
   - [Web Worker (`arnsWorker.ts`)](#web-worker-arnsworkerts)
   - [Worker Client (`arnsWorkerClient.ts`)](#worker-client-arnsworkerclientts)
8. [Styling & UI](#styling--ui)
   - [Tailwind CSS Configuration](#tailwind-css-configuration)
   - [Component UI Patterns](#component-ui-patterns)
9. [Error Handling & Accessibility](#error-handling--accessibility)
10. [Testing & Debugging](#testing--debugging)
11. [Deployment](#deployment)
12. [Contributing](#contributing)
13. [License](#license)

---

## Introduction
ArNS Explorer is a React+TypeScript web application for browsing, filtering, and resolving ArNS name records. It showcases a directory of records, a live feed, and analytics, while offloading intensive tasks to a Web Worker and persisting data via IndexedDB.

## Technology Stack
- React with TypeScript
- Tailwind CSS for utility-first styling
- Framer Motion for smooth animations
- react-hot-toast for toast notifications
- IndexedDB (via idb) for local data storage
- Web Worker (`arnsWorker.ts`) for heavy computations
- @ar.io/sdk for ArNS name resolution

## Project Structure
```
project/
├── docs/                     # Project documentation
│   └── PROJECT_DOCUMENTATION.md
├── src/
│   ├── components/
│   │   ├── layout/           # Header, Footer, Layout, Global indicator
│   │   └── common/           # Reusable components (Card, Logo, etc.)
│   ├── pages/                # Route-based pages (Directory, LiveFeed, Analytics)
│   ├── services/             # Worker client (arnsWorkerClient.ts)
│   ├── arnsWorker.ts         # Web Worker entry point
│   └── types/                # Shared TypeScript types
├── public/                   # Static assets
├── tailwind.config.js        # Tailwind CSS config
├── package.json              # Scripts & dependencies
└── tsconfig.json             # TypeScript config
```

## Installation & Setup
1. Clone the repo: `git clone https://github.com/Aluisyo/OMNIS`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## Development Workflow
- Organize code by feature: pages, components, services.
- Run `npm run lint` for linting.
- Add unit tests when implementing new features.
- Ensure ARIA labels and keyboard support for accessibility.

## Core Features

### Directory Page
- Paginated table of ArNS records with filtering and sorting.
- CSV export for current page, specified pages, or all records using a Web Worker.
- High-contrast modal UI with light/dark support.

### LiveFeed Page
- Glass-morphism styled stats cards and registrations table with backdrop blur.
- Staggered animations for stats cards, table rows, and “Show More” button transitions.
- Loading skeletons (pulse) for initial DB load and delta fetches, with error banners that reset on retry.
- Accurate `Expires` display: proper dates for leases and “Never” badges for permabuys.
- Manual pagination via stylish “Show More” button with gradient and disabled state.
- Notification toggles and auto-refresh controls with toast feedback.

### Name Details Timeline
- Interactive timeline view for the Name Details page.
- Glass-morphism cards with backdrop blur and animated entry.
- Pulsing and glow effects for scheduled future events via Framer Motion.
- Staggered appearance and hover interactions for events.
- Responsive layout with custom date formatting and accessible tooltips.

### Analytics Page
- Offloads analytics computations to the Web Worker.
- Displays charts and summary statistics.

### Global Owner Resolution Indicator
- Floating resolution status dot at bottom-right, indicating owner resolution progress.
- Colors: red on errors, orange during pending resolution, green on successful completion, and resets on new cycles.
- Resolves only missing owners in IndexedDB to minimize redundant API calls, triggered via `resolveMissingOwnersInDB`.
- Tooltip shows “Resolving owners: X of Y” progress or detailed error messages.
- Accessible via `aria-label` and native `title`.

### CSV Export Utility
- Dropdown for export options and page range input.
- Displays progress feedback and triggers CSV download.

## Architecture & Data Flow

### Web Worker (`arnsWorker.ts`)
- Functions: `resolveOwnersBatch`, `filterRecords`, `sortAndPaginate`, `calculateAnalyticsStatsInWorker`, `calculateTopHoldersInWorker`.
- Rate-limited API calls with `safeApiCall` and `throttleAll`.
- Posts messages: `RESOLUTION_PROGRESS` (includes name), `RESOLUTION_ERROR`, and result types.

### Worker Client (`arnsWorkerClient.ts`)
- Singleton loader via `getArnsWorker()`.
- Exposed methods: resolve and analytics functions with callbacks.
- Event subscriptions: `onResolutionProgress(cb)`, `onResolutionError(cb)`.

## Styling & UI

### Tailwind CSS Configuration
- Dark mode via `class` strategy.
- Custom colors, blur effects, and glass-morphism.
- Responsive breakpoints (`sm`, `md`, `lg`).

### Component UI Patterns
- Utility classes for layout, spacing, and state variants.
- Reusable patterns with `@apply` when needed.

## Error Handling & Accessibility
- ARIA labels, roles, and native tooltips.
- Toast notifications for success/errors.
- Linting and TypeScript for early error detection.

## Testing & Debugging
- Use browser dev tools to inspect Web Worker messages.
- Console logs in Worker for progress and rate-limit delays.
- Lint via `npm run lint`.

## Deployment
- Build static assets via `npm run build`.
- Deploy to Netlify, Vercel, or any static host.

## Contributing
1. Fork the repo and create a feature branch.
2. Adhere to code style and add tests.
3. Submit a PR for review.

## License
MIT 
