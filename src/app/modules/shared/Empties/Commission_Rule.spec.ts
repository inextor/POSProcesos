import { GetEmpty } from '../GetEmpty';

describe('GetEmpty.commission_rule', () => {
	it('includes a null formula default', () => {
		const rule = GetEmpty.commission_rule();
		expect(rule.formula).toBeNull();
	});
});
