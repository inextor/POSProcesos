# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **POSReservaciones20** (internally named "POSProcesos"), an Angular 20 application for managing Point of Sale (POS) operations, production processes, reservations, and rentals. The system handles production areas, requisitions, shipping, user attendance, tasks, e-commerce orders, and SAT invoicing (Mexican tax system).

## Development Commands

### Start Development Server
```bash
npm start
```
Runs the dev server on `http://0.0.0.0:4001` with development configuration.

### Build Commands
```bash
# Production build (automatically runs update_build_info.sh)
npm run build

# Production build with source maps
npm run build_maps

# Build and deploy to production server
npm run deploy
```

**Important**: All build commands automatically run `update_build_info.sh` which generates a timestamp in `src/app/modules/shared/BuildInfo.ts`. This file tracks the build version.

### Testing
```bash
npm test
```
Executes unit tests via Karma.

### Watch Mode
```bash
npm run watch
```
Builds with watch mode for development.

## Architecture

### Application Structure

- **Lazy Loading**: Most pages are lazy-loaded via the router configuration in `src/app/app.routes.ts`
- **Standalone Components**: The application uses Angular standalone components (no NgModules for most pages)
- **Feature Modules**: Only a few legacy modules remain:
  - `modules/rentals` - Rental management feature module
  - `modules/shared` - Shared utilities and services
  - `modules/pos` - Point of Sale features

### Core Services

#### RestService (`src/app/modules/shared/services/rest.service.ts`)
Central service for all API communication and application state:
- **API Communication**: Provides `initRest()` and `initRestSimple()` methods to create REST endpoints
- **Socket.IO Integration**: Real-time updates via WebSocket connection to `https://notifications.integranet.xyz:5000`
- **Session Management**: Handles user authentication, permissions, and session storage
- **Theme Management**: Applies dynamic theming via CSS custom properties based on user preferences
- **Image/File Handling**: Methods for image paths, file uploads via `uploadAttachment()`
- **Offline Support**: Includes offline database schema and sync capabilities

Key patterns:
```typescript
// Initialize a REST endpoint
let rest = this.rest.initRestSimple<ModelType>('endpoint_name');

// Make API updates
this.rest.update('method_name', data_object);

// Upload files
this.rest.uploadAttachment(file, is_private);
```

### Authentication

- **Auth Guard**: `src/app/modules/shared/finger/auth.guard.ts` (currently returns `true` for all routes)
- **User Permissions**: Stored in localStorage under `USER_PERMISSION_KEY`
- **Session Token**: Bearer token authentication via HTTP headers

### Real-Time Updates

Socket.IO connection handles real-time notifications for:
- Order updates (`order` event)
- General updates (`update` event)
- Kitchen commands (`updateCommandas` event)

Subscribe to updates via `rest.updates` Observable.

### Routing Patterns

Routes follow consistent patterns:
- `/add-{entity}` - Create new entity
- `/edit-{entity}/:id` - Edit existing entity
- `/list-{entity}` - List entities
- `/view-{entity}/:id` - View entity details

Protected routes use `canActivate: [authGuard]`.

### Environment Configuration

Environment settings in `src/environments/environment.ts`:
- `socket_io_url`: WebSocket server URL
- `path_api`: API path ('PointOfSale')
- `test_url`: Optional test URL override
- `pdf_service_url`: PDF generation service

The application auto-detects local vs production environment based on hostname.

### Build Info System

The `update_build_info.sh` script generates `BuildInfo.ts` with a timestamp for version tracking. Access via:
```typescript
import { BuildInfo } from './modules/shared/BuildInfo';
// BuildInfo.timestamp contains Unix timestamp
```

### Deployment

The `deploy.sh` script uses rsync to deploy built files to production:
```bash
rsync -av dist/posprocesos/browser/* pos:/var/www/html/integranet.xyz/subdomains/pos/produccion/
```

Deployment requires SSH access configured for the `pos` host.

### Service Worker (PWA)

Configured via `ngsw-config.json` for Progressive Web App capabilities with:
- Prefetch strategy for app files
- Lazy loading for assets

### Shared Utilities

Located in `src/app/modules/shared/`:
- `Utils.ts` - Date transformations, error handling, keyboard shortcuts
- `GetEmpty.ts` - Factory functions for empty model objects
- `RestModels.ts` - TypeScript interfaces for API models
- `OfflineDBSchema.ts` - IndexedDB schema for offline functionality

### Key Components

- **Modal Component**: `src/app/components/modal/modal.component.ts` - Reusable modal dialogs
- **Toast Error Component**: `src/app/modules/shared/toast-error/` - Error notifications
- **Loading Component**: `src/app/components/loading/` - Loading indicators
- **Pagination Component**: `src/app/components/pagination/` - List pagination
- **Attachment Uploader**: `src/app/components/attachment-uploader/` - File upload functionality

## External Scripts

The application includes external JavaScript libraries in `src/assets/js/`:
- `xlsx.full.min.js` - Excel file handling
- `excelUtils.js` - Excel utilities
- `maps.js` - Mapping functionality

These are loaded via `angular.json` scripts configuration.

## TypeScript Configuration

Strict mode is enabled with:
- `strict: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `experimentalDecorators: true` (for Angular decorators)

## Common Development Patterns

### Creating New Pages

1. Generate component: `ng generate component pages/page-name`
2. Add lazy-loaded route in `app.routes.ts`:
```typescript
{path: 'route-path', loadComponent: () => import('./pages/page-name/page-name.component').then(m => m.PageNameComponent), canActivate: [authGuard]}
```

### Working with REST APIs

```typescript
constructor(private rest: RestService) {}

ngOnInit() {
  let rest_entity = this.rest.initRestSimple<EntityType>('entity');
  rest_entity.search({}).subscribe(response => {
    // Handle response.data
  });
}
```

### Handling Errors

Use RestService methods:
```typescript
this.rest.showError(error);      // Show error
this.rest.showSuccess(message);  // Show success
this.rest.showWarning(message);  // Show warning
```

## Git Commit Guidelines

**IMPORTANT**: When creating git commits in this repository:
- **DO NOT** include the "Co-Authored-By: Claude" footer
- **DO NOT** include the "Generated with Claude Code" message
- Keep commit messages clean and concise without AI attribution
