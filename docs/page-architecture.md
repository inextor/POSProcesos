# Page Architecture

## Routing Patterns

Routes follow consistent naming conventions:

| Pattern | Description |
|---------|-------------|
| `/add-{entity}` | Create new entity |
| `/edit-{entity}/:id` | Edit existing entity |
| `/list-{entity}` | List entities |
| `/view-{entity}/:id` | View entity details |
| `/save-{entity}` | Combined create/edit |
| `/report-{name}` | Reports |

All routes (except `/login`, `/close-shift`, and rentals) use `canActivate: [authGuard]`.

**Route configuration file:** `src/app/app.routes.ts`

## Layout Structure

```
HomeComponent (shell)
├── PageStructureComponent
│   ├── HeaderComponent (app-header)
│   │   ├── Notifications
│   │   ├── User info
│   │   └── Commandas (kitchen orders)
│   ├── MenuComponent (app-menu)
│   │   └── Sidebar navigation
│   └── <router-outlet>
│       └── Page content (lazy-loaded)
```

## Page Lifecycle

All page components extend `BaseComponent` which provides:

1. `ngOnInit()` - Initialize data, set up subscriptions
2. Data loading with loading indicator (`is_loading`)
3. Error handling via `showError()`, `showSuccess()`, `showWarning()`
4. Automatic subscription cleanup via `SubSink`

## Page Categories

| Category | Examples |
|----------|----------|
| List pages | `list-item-provider`, `list-production-area`, `list-shipping` |
| Save pages | `save-role`, `save-printer`, `save-production-area` |
| View pages | `view-production-area`, `view-item-provider`, `view-ledger` |
| Reports | `report-cash-count-totals`, `item-movement-report`, `commission-report` |
| Dashboard | `dashboard` |
| Admin | `users-checking-clock`, `validate-production` |

## Rentals Module

The rentals functionality uses a legacy NgModule pattern (`RentalsModule`) with its own routing:

| Path | Component |
|------|-----------|
| `/rentals` | RentalsComponent |
| `/rentals/list-reservation` | ListReservationComponent |
| `/rentals/add-reservation` | SaveReservationComponent |
| `/rentals/edit-reservation/:id` | SaveReservationComponent |
| `/rentals/view-reservation/:id` | ViewReservationComponent |
| `/rentals/add-period/:reservation_id` | SavePeriodComponent |
| `/rentals/calendar-stock` | CalendarStockComponent |
| `/rentals/view-map/:title/:lat/:lng` | ViewMapComponent |
