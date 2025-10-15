export interface Form {
  id: number;
  title: string;
  description: string | null;
  is_response_title_required: any | null;
  responses_allowed: number;
  created: Date;
  updated: Date;
  created_by_user_id: number;
  updated_by_user_id: number;
  is_active: any | null;
}


