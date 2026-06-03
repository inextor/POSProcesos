# Design and Layout Guidelines

## Layout Structure

The application uses a fixed layout consisting of:

```
┌─────────────────────────────────────┐
│ Header (app-header)                 │
├────────┬────────────────────────────┤
│ Menu   │                            │
│ (app-  │  Page Content              │
│ menu)  │  (<router-outlet>)         │
│        │                            │
│        │                            │
└────────┴────────────────────────────┘
```

## Header Component

**File:** `src/app/modules/shared/header/`

The header contains:
- Menu toggle button (show/hide sidebar)
- Application title/logo
- Real-time notifications
- User profile info
- Commanda/kitchen order indicator

## Menu Component

**File:** `src/app/modules/shared/components/menu/`

The menu is a sidebar navigation that:
- Shows items based on user permissions
- Filters by store context
- Groups related items under categories

## Page Structure Component

**File:** `src/app/modules/shared/page-structure/`

The `PageStructureComponent` combines header, menu, and `<router-outlet>` into the main application shell.

## Styling

### CSS Framework
- **Bootstrap 5** (`bootstrap.min.css`) - Primary UI framework
- Custom CSS in `src/styles.css` - Application-specific styles
- Component-specific styles in each component's `.css` file

### Theming
Dynamic theming is applied via `RestService.applyTheme()` using CSS custom properties based on user preferences.

### Component CSS Conventions
- Each component has its own `.css` file
- Styles follow component-scoped conventions
- Bootstrap utility classes are preferred for layout
- Custom CSS for application-specific styling

## Responsive Design

The layout uses Bootstrap's responsive grid system and is designed for:
- Desktop POS terminals (primary target)
- Tablets (secondary)
- Mobile devices (basic support)

## UI Components

### Buttons
- Bootstrap button classes (`btn`, `btn-primary`, `btn-danger`, etc.)
- Consistent spacing and sizing

### Forms
- Bootstrap form controls
- Consistent label placement
- Validation feedback via Bootstrap validation styles

### Tables
- Bootstrap table classes
- Consistent column alignment
- Sortable headers (via `BaseComponent.sort()`)
- Pagination controls (via PaginationComponent)

### Modals
- Reusable ModalComponent for dialogs
- Used for confirmations, detail views, and forms

### Notifications
- Toast notifications for success/error/warning
- Managed via RestService notification methods

### Loading States
- LoadingComponent for async operations
- Controlled via `is_loading` property

## Page Layout Patterns

### List Pages
- Search/filter bar at top
- Data table in middle
- Pagination at bottom
- Action buttons per row (edit, view, delete)

### Save Pages
- Form layout with labeled fields
- Validation messages
- Submit/cancel buttons at bottom
- Loading overlay during save

### View Pages
- Read-only display of entity details
- Action buttons for edit, delete, print
- Related data sections below main info

### Dashboard
- Summary cards/panels
- Quick action buttons
- Real-time data via Socket.IO
