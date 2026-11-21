export interface Question {
  id: number;
  form_id: number;
  options?: string | null;
  priority: number;
  type: 'text' | 'textarea' | 'multiple_choice' | 'rating' | 'ranking' | 'date' | 'number' | 'tel' | 'select' | 'checkbox' | 'label';
  question: string;
  help: string | null;
  required: any | null;
  status: 'ACTIVE' | 'DELETED';
  created: Date;
  updated: Date;
}


