export interface Payment {
  id: number;
  cancellation_reason: string | null;
  cancellation_timestamp: Date | null;
  cancelled_by_user_id: number | null;
  change_amount: number;
  concept: string | null;
  created_by_user_id: number | null;
  created: Date;
  currency_id: string;
  exchange_rate: number;
  facturado: 'YES' | 'NO';
  paid_by_user_id: number | null;
  payment_amount: number;
  received_amount: number;
  sat_factura_id: number | null;
  sat_pdf_attachment_id: number | null;
  sat_uuid: string | null;
  sat_xml_attachment_id: number | null;
  status: 'ACTIVE' | 'DELETED';
  store_id: number | null;
  sync_id: string | null;
  sync_uuid: any | null;
  tag: string | null;
  type: 'income' | 'expense';
  updated: Date;
}


