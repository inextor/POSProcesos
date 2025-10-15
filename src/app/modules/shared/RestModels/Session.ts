export interface Session {
  id: string;
  user_id: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  created: Date;
  updated: Date | null;
}


