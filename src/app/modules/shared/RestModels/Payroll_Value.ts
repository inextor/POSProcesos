export interface Payroll_Value{
	id:number;
	payroll_id:number;
	payroll_concept_id:number;
	description: string;
	value:number;
	type: 'PERCEPTION'|'DEDUCTION',
	status:'ACTIVE'|'DELETED';
}
