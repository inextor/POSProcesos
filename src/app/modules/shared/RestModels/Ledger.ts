export interface Ledger {
  id: number;
  account_id: number;
  amount: number;
  created: Date;
  created_by_user_id: number;
  currency_id: string;
  description: string | null;
  final_balance: number;
  ledger_category_id: number | null;
  order_id: number | null;
  payment_id: number | null;
  previous_balance: number;
  source_document_id: string | null;
  source_document_type: string | null;
  transaction_type: 'DEBIT' | 'CREDIT' | 'DEBIT incrementa el adeudo, CREDIT lo reduce.';
  updated: Date;
  updated_by_user_id: number;
}


