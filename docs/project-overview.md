# Project Overview

**POSReservaciones20** (internally named **POSProcesos**) is an Angular 20 application for managing Point of Sale (POS) operations, production processes, reservations, and rentals.

## Domain

The system handles:
- Point of Sale operations (orders, payments, tickets)
- Production areas and production processes
- Requisitions and shipping
- User attendance and task management
- E-commerce order management
- SAT invoicing (Mexican tax system - CFDI)
- Reservations and rentals
- Inventory management (items, transformations, batch records, storage)
- Purchasing and provider management
- Commissions and payroll
- Multi-store operations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 20 (standalone components) |
| Language | TypeScript 5.8 (strict mode) |
| Styling | Bootstrap 5 + custom CSS |
| Real-time | Socket.IO 4.x |
| PWA | @angular/service-worker |
| Testing | Karma + Jasmine |
| Modules | ES2022, bundler resolution |

## Key Architecture Decisions

- **Standalone Components**: The application uses Angular standalone components with no NgModules for most pages (only legacy modules remain: `rentals`, `shared`, `pos`)
- **Lazy Loading**: All pages are lazy-loaded via the router configuration
- **Centralized API Service**: `RestService` handles all API communication, session management, and state
- **Offline Support**: IndexedDB-based offline database with sync capabilities
- **Real-Time Updates**: Socket.IO connection for live notifications
- **No i18n**: The application is Spanish-only (Mexican Spanish)

## Application Structure

```
src/
├── app/
│   ├── app.routes.ts          # Lazy-loaded route definitions
│   ├── app.component.ts       # Root component
│   ├── components/            # Reusable shared components
│   │   ├── attachment-uploader/
│   │   ├── clear-inventory/
│   │   ├── create-orders/
│   │   ├── create-orders-installments/
│   │   ├── create-users-billing/
│   │   ├── loading/
│   │   ├── modal/
│   │   ├── pagination/
│   │   ├── search-items/
│   │   ├── search-users/
│   │   └── transform-batch-items/
│   ├── pages/                 # All page components (87+ directories)
│   ├── modules/
│   │   ├── shared/            # Shared utilities, services, models
│   │   │   ├── services/      # RestService, Rest, shortcuts, etc.
│   │   │   ├── components/    # Menu, header, page-structure
│   │   │   ├── Empties/       # Factory functions for empty models
│   │   │   ├── RestModels/    # TypeScript interfaces (155+ files)
│   │   │   ├── pipes/         # Custom pipes
│   │   │   ├── finger/        # Auth guard
│   │   │   └── Finger/        # Database, Excel, scheme utilities
│   │   ├── rentals/           # Legacy feature module (NgModule)
│   │   └── pos/               # Legacy POS module
│   ├── environments/
│   │   └── environment.ts     # Configuration
├── assets/
│   ├── js/                    # External scripts
│   └── bootstrap/             # Bootstrap assets
├── ngsw-config.json           # Service worker (PWA)
```

## Key Dependencies

- `@angular/core` ^20.0.4
- `@angular/router` ^20.0.4
- `@angular/service-worker` ^20.0.4
- `socket.io-client` ^4.8.1
- `rxjs` ~7.8.0
- `subsink` ^1.0.2
- `typescript` ~5.8.3
