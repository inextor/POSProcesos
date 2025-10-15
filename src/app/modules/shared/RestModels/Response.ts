export interface Response {
  id: number;
  form_id: number;
  user_id: number | null;
  respondent_identifier: string | null;
  title: string | null;
  created: Date;
  updated: Date;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
}


