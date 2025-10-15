export interface Task_Comment {
  id: number;
  comment: string;
  created: Date;
  task_id: number;
  type: 'SYSTEM' | 'USER';
  user_id: number | null;
  updated: Date;
}


