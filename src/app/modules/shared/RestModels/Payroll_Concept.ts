export interface Payroll_Concept {
  formula: string;
  id: number;
  name: string;
  status: 'ACTIVE' | 'DELETED';
  type: 'DEDUCTION' | 'PERCEPTION';
}


