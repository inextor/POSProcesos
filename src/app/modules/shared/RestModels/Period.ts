export interface Period {
  id: number;
  created: Date;
  created_by_user_id: number;
  end_timestamp: Date;
  minutes_offset: number;
  note: string | null;
  reservation_id: number;
  start_timestamp: Date;
  status: 'ACTIVE' | 'DELETED';
  updated: Date;
  updated_by_user_id: number;
}


