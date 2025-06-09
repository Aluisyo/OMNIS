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
   - [Global Activity Indicator](#global-activity-indicator)
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
├── backend/                   # Node.js cron backend (fetch & upload jobs)
├── docs/                     # Project documentation
├── src/                      # Frontend source code
│   ├── components/          # UI components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom hooks
│   ├── pages/               # Route pages (Directory, LiveFeed, etc.)
│   ├── services/            # Data services & worker client
│   ├── utils/               # Helper functions
│   └── arnsWorker.ts        # Web Worker entry point
├── public/                  # Static assets
├── docs/                    # Project documentation
├── tailwind.config.js       # Tailwind CSS config
├── package.json             # Frontend scripts & dependencies
├── tsconfig.json            # Frontend TypeScript config
└── vite.config.ts           # Vite configuration
```

## Installation & Setup

#### Prerequisites

- Node.js 16+ and npm (or yarn)

#### Clone repository
```bash
git clone https://github.com/Aluisyo/OMNIS
cd OMNIS
```

#### Frontend Setup
```bash
# Install dependencies
npm install
# Start development server
npm run dev
```

#### Backend Setup
```bash
# Navigate to backend directory
cd backend
# Install dependencies
npm install
# Start backend (build + run with cron jobs)
npm run dev
```

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

### Global Activity Indicator
- Floating activity status dot at bottom-right, indicating app data loading or refresh operations.
- Color: amber (`#F59E0B`) pulsing while loading or refreshing.
- Visible only during loading or refresh operations.
- Tooltip shows “Loading ARNS data...” or “Refreshing ARNS data...” based on context.
- Accessible via `aria-label` and `title`.

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

#### Frontend
```bash
cd OMNIS
npm run build
```
- Deploy contents of `dist/` to any static host (Arweave, Netlify, Vercel, S3, etc.)

#### Backend
```bash
cd OMNIS/backend
npm install    # if not already installed
npm run build  # compile TypeScript
npm start      # runs `dist/index.js` and schedules cron jobs
```
- Cron schedule is configured in `backend/src/config.ts` (`CRON_SCHEDULE`). Run as a long-lived process (e.g., via pm2, systemd, or Docker).

## Contributing
1. Fork the repo and create a feature branch.
2. Adhere to code style and add tests.
3. Submit a PR for review.

## License
MIT 
