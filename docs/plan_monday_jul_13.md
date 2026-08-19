# Plan: Add bank account selection to expense payments

`store_bank_account` links a `bank_account` to a store with a `default_transaction_type`. Currently:

| Page | Transaction type | Bank account | `bank_account_id` |
|------|-----------------|-------------|--------------------|
| `save-purchase` | Has dropdown | **Missing** | `null` (hardcoded) |
| `list-provider-bills` | **Missing** | **Missing** | `null` (hardcoded) |
| `pending-commissions-report` | Has dropdown | Has dropdown | Works (already set) |

---

## Step 1 — `save-purchase`

### TS (`save-purchase.component.ts`):
- Import `Store_Bank_Account`, `Bank_Account` from RestModels
- Add properties:
  - `store_bank_accounts: any[] = []` — loaded list (with joined `bank_account`)
  - `selected_bank_account_id: number | null = null`
- Add method `loadStoreBankAccounts()`:
  - Searches `store_bank_account` filtered by `eq: { store_id: current_store_id }`, with `bank_account` relation
  - If `default_transaction_type` on each record is set, only show records matching the selected `transaction_type` (null = show for any type)
- Call `loadStoreBankAccounts()` on `ngOnInit` and on `transaction_type` change (`ngModelChange`)
- In `markAsPaid()`, set `bank_account_id: this.selected_bank_account_id` instead of `null`

### HTML (`save-purchase.component.html`):
- Add `<select>` for bank account next to the transaction_type dropdown (line ~82-91 area):

```html
<select [(ngModel)]="selected_bank_account_id" name="bank_account_id" class="form-control"
  [disabled]="purchase_info.bank_movements_info.length > 0">
  <option [ngValue]="null">Seleccionar cuenta</option>
  <option *ngFor="let sba of store_bank_accounts" [ngValue]="sba.store_bank_account.bank_account_id">
    {{ sba.bank_account?.name || sba.bank_account?.alias }} - {{ sba.bank_account?.bank }}
  </option>
</select>
```

---

## Step 2 — `list-provider-bills`

### TS (`list-provider-bills.component.ts`):
- Import `Store_Bank_Account`, `Bank_Account` from RestModels
- Add properties:
  - `store_bank_accounts: any[] = []`
  - `selected_bank_account_id: number | null = null`
  - `selected_transaction_type: string | null = null`
- Add method `loadStoreBankAccounts()` same pattern as above (filter by `store_id = user_store`)
- In `makePayment()`:
  - Set `bank_movement.transaction_type = this.selected_transaction_type` (instead of `null`)
  - Set `bank_movement.bank_account_id = this.selected_bank_account_id` (instead of `null`)

### HTML (`list-provider-bills.component.html`):
- Add in the payment modal (after `payment_amount` input, before submit buttons):

```html
<div class="mb-4">
  <label>Metodo de Pago</label>
  <select [(ngModel)]="selected_transaction_type" name="transaction_type" class="form-control">
    <option [ngValue]="null">Seleccionar</option>
    <option value="CASH">Efectivo</option>
    <option value="TRANSFER">Transferencia</option>
    <option value="CHECK">Cheque</option>
    <option value="CREDIT_CARD">Tarjeta de credito</option>
    <option value="DEBIT_CARD">Tarjeta de debito</option>
  </select>
</div>
<div class="mb-4">
  <label>Cuenta Bancaria</label>
  <select [(ngModel)]="selected_bank_account_id" name="bank_account_id" class="form-control">
    <option [ngValue]="null">Sin cuenta / Efectivo</option>
    <option *ngFor="let sba of store_bank_accounts" [ngValue]="sba.store_bank_account.bank_account_id">
      {{ sba.bank_account?.name }} - {{ sba.bank_account?.bank }}
    </option>
  </select>
</div>
```

---

## Step 3 — `pending-commissions-report`

Already works. No changes needed. Could optionally change from `bank_account` to `store_bank_account` filtered by `default_transaction_type`, but lower priority.

---

## Step 4 — Verify build

```bash
npx ng build --configuration=development
```

---

## Risk/Edge cases
- `list-provider-bills` uses the user's `store_id` (not a per-purchase store) — this is consistent since the provider bills are already filtered to the user's store context
- `default_transaction_type` can be `null` on some `store_bank_account` records — should show those for ALL transaction types (or hide them entirely — need decision on this)
- A `store_bank_account` may reference a single `bank_account`, so the `bank_account_id` from the `store_bank_account` record maps directly to `bank_movement.bank_account_id`
