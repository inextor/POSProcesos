# Multi-Store Support

The application is designed to support multiple stores/branches from a single deployment. Store-level data isolation is enforced throughout the data model and services.

## Store Entity

**Model:** `Store` (in `RestModels/Store.ts`)

Each store has its own configuration:
- Operating settings (tax, currency, price list)
- Payment methods (cash, card, check, transfer)
- Invoice settings (SAT series, billing mode)
- Ticket/printer configuration
- POS display preferences
- Production and sales flags

## Store ID on Entities

Almost every major entity has a `store_id` field to scope data:

| Entity | Field |
|--------|-------|
| `User` | `store_id` |
| `Order` | `store_id` |
| `Payment` | `store_id` |
| `Production_Area` | `store_id` |
| `Production` | `store_id` |
| `Shipping` | `from_store_id`, `to_store_id` |
| `Requisition` | `requested_to_store_id`, `required_by_store_id` |
| `Purchase` | `store_id` |
| `Stock_Record` | `store_id` |
| `Item_Store` | `store_id` |
| `Reservation` | `store_id` |
| `Printer` | `store_id` |
| `Consumption` | `store_id` |
| `Task` | `store_id` |
| `Cash_Close` | `store_id` |
| `Stocktake` | `store_id` |
| And 15+ more | `store_id` |

## Cross-Store Operations

- **Shipping**: Items can be shipped between stores (`from_store_id` / `to_store_id`)
- **Requisitions**: Stores can request items from other stores
- **Reports**: Some reports aggregate across all stores (e.g., `item-movement-all-stores-report`)
- **Currency rates**: Stored per-store for multi-currency support

## Store-Specific Configuration

| Configuration | Description |
|---------------|-------------|
| `offline_search_enabled` | Enable offline item search per store |
| `print_receipt_copies` | Number of receipt copies |
| `printer_ticket_config` | Ticket layout configuration (JSON) |
| `pos_category_preferences` | POS category visibility |
| `modo_facturacion` | Invoice mode (itemized vs compact) |
| `autofacturacion_settings` | Auto-invoicing rules |
| `ticket_footer_text` | Custom footer per store |
| `qr_size` | QR code size on tickets |
| `show_facturacion_qr` | Show invoice QR on tickets |

## Store Assignment

Users are assigned to a store via `User.store_id`. Menu items and permissions are filtered based on the user's store and role. The application's domain auto-detection also influences store selection.
