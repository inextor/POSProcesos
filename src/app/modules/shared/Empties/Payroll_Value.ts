import { Payroll_Value } from '../RestModels';

export function payroll_value(): Payroll_Value {
	return {
		id: 0,
		payroll_id: 0,
		payroll_concept_id: 0,
		description: '',
		type: 'PERCEPTION',
		value: 0,
		status: 'ACTIVE',
	};
}
