export interface User_Attachment {
  id: number;
  alias: string;
  attachment_id: number;
  created: Date;
  status: 'ACTIVE' | 'DELETED';
  user_id: number;
  created_by_user_id: number;
  updated_by_user_id: number;
  updated: Date;
}


