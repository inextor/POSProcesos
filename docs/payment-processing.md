# Payment Processing

## Payment Model

**File:** `src/app/modules/shared/RestModels/Payment.ts`

```typescript
export interface Payment {
    id: number;
    store_id: number;
    order_id: number;
    payment_type: string;
    amount: number;
    reference: string | null;
    status: string;
    created: Date;
    // ... additional fields
}
```

## Store Payment Configuration

Each store configures which payment methods are accepted:

| Field | Description |
|-------|-------------|
| `accept_cash` | Cash payments |
| `accept_credit_card` | Credit/debit card payments |
| `accept_check` | Check payments |
| `accept_transfer` | Electronic transfer |
| `max_cash_amount` | Maximum cash amount per transaction |
| `electronic_transfer_percent_fee` | Fee percentage for transfers |

## Payment-Related Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/save-production-payment` | SaveProductionPaymentComponent | Production payment recording |
| `/report-credit-payments` | ReportCreditPaymentsComponent | Credit payment report |
| `/assign-sat-factura-payment` | AssignSatFacturaPaymentComponent | Assign SAT invoice to payment |
| `/assign-sat-factura-payment/:payment_id` | AssignSatFacturaPaymentComponent | Assign by payment ID |
| `/list-payment-sat-factura/:payment_id` | ListObjectSatFacturaComponent | View invoices for payment |

## Paypal Integration

The system supports PayPal payments via:

| Model | Description |
|-------|-------------|
| `Paypal_Access_Token` | PayPal OAuth token |
| `Paypal_Order` | PayPal order data |
| `Store.paypal_email` | Store's PayPal email |

## Pharos Payment Gateway

**File:** `RestModels/Pharos_Payment_Request.ts`
**File:** `RestModels/Pharos_Credentials.ts`

Integration with Pharos payment processing for additional payment options.

## Order Payment Flow

1. Order is created with `initial_payment` amount
2. Payments are recorded against the order (`Payment.order_id`)
3. Order `paid_status` tracks: `PENDING` / `PAID` / `PARTIALLY_PAID`
4. `amount_paid` accumulates from individual payments
5. Installments can be created via `Installment` model

## SAT Invoicing for Payments

Payments can have associated SAT invoices (CFDI). The payment-invoice relationship is managed through:
- `AssignSatFacturaPaymentComponent` - Links payments to invoices
- `ListObjectSatFacturaComponent` - Displays invoices for a payment
