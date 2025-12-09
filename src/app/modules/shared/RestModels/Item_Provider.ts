export interface Item_Provider {
  id: number;
  provider_user_id: number;
  name: string;
  codigo: string | null;
  to_item_id: number;
  tasa: string | null;
  clave_unidad: string | null;
  objeto_impuesto: string | null;
  created: Date;
  updated: Date;
}
