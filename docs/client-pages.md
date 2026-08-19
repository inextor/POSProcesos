# Client Pages

Client-related pages handle customer management, e-commerce orders, and client-facing features.

## Client Representation

Clients are stored as `User` records with `type: 'CLIENT'`. Key client fields:

- `name` - Client name
- `email` - Contact email
- `phone` - Contact phone
- `credit_days` - Payment terms (days)
- `credit_limit` - Maximum credit amount
- `price_type_id` - Assigned price type
- `points` - Loyalty points
- `default_billing_address_id` - Default billing address
- `default_shipping_address_id` - Default shipping address

## Client Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/view-account` | ViewAccountComponent | View client account details and history |
| `/view-ledger` | ViewLedgerComponent | View client ledger (accounting entries) |
| `/reporte-estado-cuenta-cliente` | ReporteEstadoCuentaClienteComponent | Client account statement report with balance, payments, charges |
| `/item-sales-by-client-report` | ItemSalesByClientReportComponent | Sales grouped by client |

## E-Commerce Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-ecommerce-order` | ListEcommerceOrderComponent | List e-commerce orders placed by clients |
| `/list-item-online` | ListItemOnlineComponent | Items available online |
| `/add-item-online` | SaveItemOnlineComponent | Add item to online catalog |
| `/edit-item-online/:id` | SaveItemOnlineComponent | Edit online catalog item |

## Shared Components for Clients

| Component | File | Description |
|-----------|------|-------------|
| `create-users-billing` | `components/create-users-billing/` | Create/manage billing data for client users |
| `search-users` | `components/search-users/` | User/client search selector |

## Client Patterns

Clients are associated with orders through:
- `Order.client_user_id` - Links order to the client user record
- `Order.client_name` - Denormalized client name for quick display

Client payments and credit are tracked via:
- `Payment` records linked to orders
- `Ledger` entries for accounting
- `Account` balance tracking
