export interface Work_Log {
  id: number;
  in_out_count: any;
  date: string;
  user_id: number;
  json_values: any | null;
  disciplinary_actions: string | null;
  docking_pay: number;
  start_timestamp: Date | null;
  end_timestamp: Date | null;
  seconds_log: number;
  hours: number;
  extra_hours: number;
  break_seconds: number;
  on_time: 'YES' | 'NO';
  total_payment: number;
  updated: Date;
}


