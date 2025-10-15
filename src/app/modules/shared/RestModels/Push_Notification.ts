export interface Push_Notification {
  id: number;
  app_path: string | null;
  body: string;
  created: Date;
  icon_image_id: number | null;
  link: string | null;
  object_id: string | null;
  object_type: string;
  priority: 'normal' | 'high';
  push_notification_id: string | null;
  read_status: 'PENDING' | 'READ';
  response: string | null;
  sent_status: number | null;
  title: string;
  updated: Date;
  user_id: number;
}


