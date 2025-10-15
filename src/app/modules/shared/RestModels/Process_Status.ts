export interface Process_Status {
  id: number;
  name: string;
  process_id: number;
  status: 'ACTIVE' | 'DELETED';
  mark_task_as_done: any;
  created: Date;
  updated: Date;
}


