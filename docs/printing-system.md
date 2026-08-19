# Printing System

## Printer Management

The application manages network printers for ticket/receipt printing.

### Printer Model

**File:** `src/app/modules/shared/RestModels/Printer.ts`

```typescript
export interface Printer {
    id: number;
    name: string;
    store_id: number | null;
    type: string;
    ip_address: string;
    port: number;
    status: 'ACTIVE' | 'DISABLED';
}
```

### Printer CRUD Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-printer` | ListPrinterComponent | List all printers |
| `/add-printer` | SavePrinterComponent | Create new printer |
| `/edit-printer/:id` | SavePrinterComponent | Edit printer configuration |

### Empty Factory

**File:** `src/app/modules/shared/Empties/Printer.ts`

Used to create empty `Printer` objects for the save form:
```typescript
GetEmpty.printer  // returns empty Printer object
```

## Ticket Model

**File:** `src/app/modules/shared/RestModels/Ticket.ts`

Ticket data structure for receipt generation.

## Store Printing Configuration

Each store has printing-related settings:

| Setting | Description |
|---------|-------------|
| `printer_ticket_config` | JSON configuration for ticket layout |
| `print_receipt_copies` | Number of copies per receipt |
| `ticket_footer_text` | Custom footer text |
| `ticket_image_id` | Optional store logo on tickets |
| `qr_size` | QR code size on tickets ('PERCENT_25'/'50'/'75'/'100') |
| `show_facturacion_qr` | Whether to show invoice QR |

## Printed Records

The offline database tracks printed orders and items:

```
printed_orders: "id"
printed_items: "id"
```

This prevents duplicate printing and enables offline print tracking.
