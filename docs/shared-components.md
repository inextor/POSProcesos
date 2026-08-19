# Shared Components

Reusable components are located in `src/app/components/` and `src/app/modules/shared/components/`.

## General-Purpose Components (`src/app/components/`)

### Modal Component
**Files:** `components/modal/`

Reusable modal dialog. Used for confirmations, forms, and displaying content.

### Loading Component
**Files:** `components/loading/`

Loading spinner/indicator. Controlled via `is_loading` property from `BaseComponent`.

### Pagination Component
**Files:** `components/pagination/`

Page navigation control for lists. Works with `BaseComponent.setPages()`.

### Attachment Uploader Component
**Files:** `components/attachment-uploader/`

File upload with drag-and-drop support. Uses `RestService.uploadAttachment()`.

### Search Items Component
**Files:** `components/search-items/`

Item search selector with filtering and pagination.

### Search Users Component
**Files:** `components/search-users/`

User/client search selector.

### Clear Inventory Component
**Files:** `components/clear-inventory/`

Inventory clearing/zeroing functionality.

### Create Orders Component
**Files:** `components/create-orders/`

Order creation interface component.

### Create Orders Installments Component
**Files:** `components/create-orders-installments/`

Order creation with installment payment support.

### Create Users Billing Component
**Files:** `components/create-users-billing/`

Billing data creation/management for users.

### Transform Batch Items Component
**Files:** `components/transform-batch-items/`

Batch item transformation interface.

## Application Layout Components (`src/app/modules/shared/components/`)

### Menu Component
**Files:** `shared/components/menu/`

Sidebar navigation menu. Shows menu items based on user permissions per store. Includes `old-menu/` subdirectory.

### Header Component
**Files:** `shared/header/`

Application header with:
- Notifications (real-time updates)
- User profile info
- Commandas (kitchen order display)
- Menu toggle

### Page Structure Component
**Files:** `shared/page-structure/`

Main layout shell combining header, menu, and router outlet.

## Shared Module Components

### Toast Error Component
**Files:** `shared/toast-error/`

Error/success/warning notification toasts. Managed via `RestService.showError()`, `showSuccess()`, `showWarning()`.

### Camera Scanner Component
**Files:** `shared/camera-scanner/`

Camera-based barcode/QR scanner.

### Code Reader Component
**Files:** `shared/code-reader/`

Barcode/QR code reader input.

## Component Usage Pattern

All shared components are standalone and import their dependencies directly:

```typescript
@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule, ...],
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.css']
})
export class ModalComponent { ... }
```
