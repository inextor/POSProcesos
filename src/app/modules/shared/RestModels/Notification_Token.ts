export interface Notification_Token {
  id: number;
  user_id: number;
  provider: string;
  token: string;
  created: Date;
  updated: Date;
  status: 'ACTIVE' | 'DELETED';
}


