export interface Image {
  id: number;
  content_type: string;
  created: Date;
  filename: string;
  height: number;
  is_private: any;
  original_filename: string | null;
  size: number;
  uploader_user_id: number | null;
  width: number;
}


