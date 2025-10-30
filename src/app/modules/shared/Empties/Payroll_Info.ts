import { payroll } from './Payroll';

export function payroll_info() {
	return {
		payroll: payroll(),
		work_logs: [],
		payroll_concept_values: []
	};
}
