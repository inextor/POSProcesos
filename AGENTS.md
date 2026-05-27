# POSProcesos / POSReservaciones20

This is the new system, new things goes here
POS is the old System(still working)

This file is the entry point for AI agents. Core documentation has been extracted into dedicated files under `docs/`.

## Quick Start

```bash
npm start          # Dev server on http://0.0.0.0:4001
npm run build      # Production build
npm run deploy     # Build + deploy to production server
npm test           # Run Karma unit tests
```

## Documentation Index

### General

| Topic | File | Description |
|-------|------|-------------|
| Project Overview | [docs/project-overview.md](docs/project-overview.md) | Domain, tech stack, architecture decisions |
| Human Instructions | [docs/human-instruction-not-for-agents.md](docs/human-instruction-not-for-agents.md) | Info for human devs (not agents) |
| Design & Layout | [docs/design-and-layout.md](docs/design-and-layout.md) | Layout structure, styling conventions |

### Architecture

| Topic | File | Description |
|-------|------|-------------|
| Core Classes | [docs/core-classes.md](docs/core-classes.md) | BaseComponent, Utils, GetEmpty, OrderBuilder |
| REST Service | [docs/rest-service.md](docs/rest-service.md) | RestService, Rest\<U,T\>, SearchObject, patterns |
| Services Layer | [docs/services-layer.md](docs/services-layer.md) | ShortcutsService, ConfirmationService, Finger utils |
| Data Models | [docs/data-models.md](docs/data-models.md) | All 155+ model interfaces (User, Store, Order, etc.) |
| Page Architecture | [docs/page-architecture.md](docs/page-architecture.md) | Routing, layout, page lifecycle, categories |
| Admin Pages | [docs/admin-pages.md](docs/admin-pages.md) | All CRUD, management, and report pages |
| Client Pages | [docs/client-pages.md](docs/client-pages.md) | Client-related pages and patterns |
| Shared Components | [docs/shared-components.md](docs/shared-components.md) | Modal, loading, pagination, uploader, etc. |

### Features

| Topic | File | Description |
|-------|------|-------------|
| Offline Architecture | [docs/offline-architecture.md](docs/offline-architecture.md) | IndexedDB schema, sync, PWA |
| Real-Time Communication | [docs/real-time-communication.md](docs/real-time-communication.md) | Socket.IO events and patterns |
| Multi-Store Support | [docs/multi-store-support.md](docs/multi-store-support.md) | Store model, data isolation, cross-store ops |
| Localization | [docs/localization.md](docs/localization.md) | Spanish-only, date formatting |
| Authentication | [docs/authentication.md](docs/authentication.md) | Auth guard, session, permissions |
| Printing System | [docs/printing-system.md](docs/printing-system.md) | Printer model, ticket config, store settings |
| Payment Processing | [docs/payment-processing.md](docs/payment-processing.md) | Payment model, PayPal, Pharos, SAT invoicing |

### Configuration

| Topic | File | Description |
|-------|------|-------------|
| Environment Configuration | [docs/environment-configuration.md](docs/environment-configuration.md) | environment.ts, BuildInfo |
| TypeScript Configuration | [docs/typescript-configuration.md](docs/typescript-configuration.md) | tsconfig.json, strict mode flags |

### References

| Topic | File | Description |
|-------|------|-------------|
| Common Workflows | [docs/common-workflows.md](docs/common-workflows.md) | Code patterns for pages, CRUD, errors, dates |
| Backend Search Operators | [docs/skills/backend-search.md](docs/skills/backend-search.md) | SearchObject, parameter suffixes, search methods |

## Key Files

| File | Purpose |
|------|---------|
| `src/app/app.routes.ts` | All route definitions |
| `src/app/modules/shared/services/rest.service.ts` | Central API service |
| `src/app/modules/shared/services/Rest.ts` | Low-level REST client |
| `src/app/modules/shared/base/base.component.ts` | Base component for all pages |
| `src/app/modules/shared/Utils.ts` | Date, error, and general utilities |
| `src/app/modules/shared/GetEmpty.ts` | Factory functions for empty models |
| `src/app/modules/shared/OrderBuilder.ts` | Order info builder |
| `src/app/modules/shared/OfflineDBSchema.ts` | IndexedDB schema |
| `src/environments/environment.ts` | Environment config |
| `ngsw-config.json` | PWA service worker config |

## Git Commit Rules

- **DO NOT** include "Co-Authored-By" footer
- **DO NOT** include "Generated with" message
- Keep commit messages clean and concise without AI attribution
