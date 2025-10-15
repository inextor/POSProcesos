export interface Store_Bank_Account {
  id: number;
  bank_account_id: number;
  default_transaction_type: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'COUPON' | 'TRANSFER' | 'DISCOUNT' | 'RETURN_DISCOUNT' | 'PAYPAL' | null;
  created: Date;
  name: string;
  store_id: number;
  updated: Date;
}


