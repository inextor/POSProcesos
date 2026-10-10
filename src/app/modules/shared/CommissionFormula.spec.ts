import { GetEmpty } from './GetEmpty';
import { Commission_Rule } from './RestModels';
import {
	AgentCommissionReport,
	FormulaOrder,
	FormulaOrderItem,
	FormulaPeriod,
	FormulaRule,
	buildFormulaOrder,
	buildFormulaOrderItem,
	calcLegacyCommission,
	calcPaidRatio,
	calculateAgentCommissions,
	calculateItemCommission,
	evaluateCommissionFormula,
	resolveCommissionRule
} from './CommissionFormula';

function makeOrder(overrides: Partial<FormulaOrder> = {}): FormulaOrder {
	return {
		id: 10,
		total: 1000,
		subtotal: 1000,
		discount: 100,
		price_type_id: 2,
		store_id: 1,
		closed_timestamp: '2026-01-15T10:00:00',
		amount_paid: 600,
		...overrides
	};
}

function makeOrderItem(overrides: Partial<FormulaOrderItem> = {}): FormulaOrderItem {
	return {
		id: 100,
		item_id: 5,
		category_id: 7,
		qty: 2,
		unitary_price: 500,
		total: 1000,
		subtotal: 1000,
		discount: 0,
		discount_percent: 0,
		unit_cost: 300,
		total_cost: 600,
		profit: 400,
		tax: 160,
		original_unitary_price: 500,
		...overrides
	};
}

function makeRule(): FormulaRule {
	return { id: 3, base_percent: 10, discount_reduction_per_percent: 0.5 };
}

function makePeriod(): FormulaPeriod {
	return { amount_paid_in_period: 600, paid_ratio: 0.6, date_start: '2026-01-01 00:00:00', date_end: '2026-01-31 23:59:59' };
}

function makeStoredRule(overrides: Partial<Commission_Rule> = {}): Commission_Rule {
	const rule = GetEmpty.commission_rule();
	rule.id = 3;
	rule.status = 'ACTIVE';
	rule.base_percent = 10;
	rule.discount_reduction_per_percent = 0.5;
	return { ...rule, ...overrides };
}

describe('CommissionFormula', () => {
	describe('evaluateCommissionFormula', () => {
		it('runs the canonical multi-statement example', () => {
			const formula = [
				'let y = 0;',
				'let discount_percent = ((order.discount / order.total) + (order_item.discount / order_item.total)) / 2;',
				'if (discount_percent < 10) y = 1;',
				'if (y == 1)',
				'  return order_item.total * 0.10;',
				'return 0;'
			].join('\n');

			// ((100/1000) + (0/1000)) / 2 = 0.05 < 10, so y = 1 -> 1000 * 0.10.
			expect(evaluateCommissionFormula(formula, makeOrder(), makeOrderItem(), makeRule(), makePeriod())).toBe(100);
		});

		it('returns zero from the example when the discount is high', () => {
			const formula = 'let d = order.discount / order.total; if (d < 0.05) return 1; return 0;';
			expect(evaluateCommissionFormula(formula, makeOrder(), makeOrderItem(), makeRule(), makePeriod())).toBe(0);
		});

		it('rejects syntax errors', () => {
			expect(() => evaluateCommissionFormula('return 1 +;', makeOrder(), makeOrderItem(), makeRule(), makePeriod()))
				.toThrowError(/invalid formula syntax/);
		});

		it('rejects runtime errors', () => {
			expect(() => evaluateCommissionFormula('throw new Error("boom");', makeOrder(), makeOrderItem(), makeRule(), makePeriod()))
				.toThrowError(/formula execution failed.*boom/);
		});

		it('rejects a missing return', () => {
			expect(() => evaluateCommissionFormula('let x = 1;', makeOrder(), makeOrderItem(), makeRule(), makePeriod()))
				.toThrowError(/must return a finite number, got undefined/);
		});

		it('rejects non-number returns', () => {
			expect(() => evaluateCommissionFormula('return "10";', makeOrder(), makeOrderItem(), makeRule(), makePeriod()))
				.toThrowError(/must return a finite number, got string/);
		});

		it('rejects infinite results from division by zero', () => {
			expect(() => evaluateCommissionFormula('return 1 / 0;', makeOrder(), makeOrderItem(), makeRule(), makePeriod()))
				.toThrowError(/must return a finite number/);
		});

		it('rejects negative results', () => {
			expect(() => evaluateCommissionFormula('return -5;', makeOrder(), makeOrderItem(), makeRule(), makePeriod()))
				.toThrowError(/negative commission/);
		});

		it('exposes tax and original_unitary_price to formulas', () => {
			const formula = 'let original_total = order_item.original_unitary_price * order_item.qty; return original_total - order_item.total + order_item.tax;';
			expect(evaluateCommissionFormula(formula, makeOrder(), makeOrderItem(), makeRule(), makePeriod())).toBe(160);
		});
	});

	describe('resolveCommissionRule', () => {
		it('prefers the item-specific rule over category and store rules', () => {
			const store_rule = makeStoredRule({ id: 1, store_id: 1 });
			const category_rule = makeStoredRule({ id: 2, category_id: 7 });
			const item_rule = makeStoredRule({ id: 3, item_id: 5 });

			expect(resolveCommissionRule([store_rule, category_rule, item_rule], 1, 2, 7, 5)).toBe(item_rule);
		});

		it('prefers category over a store-or-price rule on equal score', () => {
			const store_rule = makeStoredRule({ id: 1, store_id: 1 });
			const category_rule = makeStoredRule({ id: 2, category_id: 7 });

			expect(resolveCommissionRule([store_rule, category_rule], 1, 2, 7, 5)).toBe(category_rule);
		});

		it('treats null scopes as match-any and skips inactive rules', () => {
			const inactive_rule = makeStoredRule({ id: 1, status: 'INACTIVE' });
			const global_rule = makeStoredRule({ id: 2 });

			expect(resolveCommissionRule([inactive_rule, global_rule], 1, 2, 7, 5)).toBe(global_rule);
		});

		it('returns null when no rule matches', () => {
			const other_store_rule = makeStoredRule({ id: 1, store_id: 999 });

			expect(resolveCommissionRule([other_store_rule], 1, 2, 7, 5)).toBeNull();
		});
	});

	describe('calcLegacyCommission', () => {
		it('calculates PERCENT from the item total', () => {
			expect(calcLegacyCommission('PERCENT', 10, makeOrderItem(), makeRule())).toBe(100);
		});

		it('calculates AMOUNT from the item qty', () => {
			expect(calcLegacyCommission('AMOUNT', 25, makeOrderItem(), makeRule())).toBe(50);
		});

		it('reduces RULE_PERCENT by the item discount', () => {
			const item = makeOrderItem({ discount_percent: 10 });
			// 10 - (10 * 0.5) = 5 percent of 1000.
			expect(calcLegacyCommission('RULE_PERCENT', 0, item, makeRule())).toBe(50);
		});

		it('clamps RULE_PERCENT at zero', () => {
			const item = makeOrderItem({ discount_percent: 100 });
			expect(calcLegacyCommission('RULE_PERCENT', 0, item, makeRule())).toBe(0);
		});

		it('returns zero for NONE and unknown types', () => {
			expect(calcLegacyCommission('NONE', 99, makeOrderItem(), makeRule())).toBe(0);
			expect(calcLegacyCommission('WHAT', 99, makeOrderItem(), makeRule())).toBe(0);
		});
	});

	describe('calculateItemCommission', () => {
		it('uses the formula when the rule has one', () => {
			const rule = makeStoredRule({ formula: 'return order_item.profit * 0.5;' });
			const output = calculateItemCommission({
				order: makeOrder(),
				order_item: makeOrderItem(),
				rule: rule,
				commission_type: 'RULE_PERCENT',
				commission_value: 0,
				period: makePeriod()
			});

			expect(output).toEqual({ commission_full: 200, rule_id: 3, formula_used: true });
		});

		it('falls back to legacy math when the formula is empty', () => {
			const rule = makeStoredRule({ formula: null });
			const output = calculateItemCommission({
				order: makeOrder(),
				order_item: makeOrderItem(),
				rule: rule,
				commission_type: 'PERCENT',
				commission_value: 10,
				period: makePeriod()
			});

			expect(output).toEqual({ commission_full: 100, rule_id: 3, formula_used: false });
		});

		it('falls back to legacy math when no rule matches', () => {
			const output = calculateItemCommission({
				order: makeOrder(),
				order_item: makeOrderItem(),
				rule: null,
				commission_type: 'AMOUNT',
				commission_value: 25,
				period: makePeriod()
			});

			expect(output).toEqual({ commission_full: 50, rule_id: null, formula_used: false });
		});
	});

	describe('calcPaidRatio', () => {
		it('uses the full paid amount when the order total is zero', () => {
			expect(calcPaidRatio(50, 0)).toBe(50);
			expect(calcPaidRatio(600, 1000)).toBe(0.6);
		});
	});

	describe('builders', () => {
		it('coerces string numbers and converts closed_timestamp', () => {
			const order = buildFormulaOrder({
				order_id: '10',
				order_total: '1000.00',
				order_subtotal: '1000.00',
				order_discount: '100.50',
				price_type_id: '2',
				store_id: '1',
				closed_timestamp: '2026-01-15 10:00:00',
				amount_paid: '600'
			});

			expect(order.total).toBe(1000);
			expect(order.discount).toBe(100.5);
			expect(order.price_type_id).toBe(2);
			expect(order.closed_timestamp).toBe('2026-01-15T10:00:00');
		});

		it('keeps a null closed_timestamp as null', () => {
			const order = buildFormulaOrder({
				order_id: 10,
				order_total: 1000,
				order_subtotal: 1000,
				order_discount: 0,
				price_type_id: null,
				store_id: null,
				closed_timestamp: null,
				amount_paid: 0
			});

			expect(order.closed_timestamp).toBeNull();
			expect(order.price_type_id).toBeNull();
		});

		it('derives profit from total minus cost', () => {
			const item = buildFormulaOrderItem({
				order_item_id: 100,
				item_id: 5,
				category_id: 7,
				qty: '2.000',
				unitary_price: 500,
				total_sale: 1000,
				subtotal: 1000,
				discount: 0,
				discount_percent: null,
				unit_cost: '300',
				total_cost: 600,
				commission_type: 'RULE_PERCENT',
				commission: 0,
				tax: '160.00',
				original_unitary_price: '500'
			});

			expect(item.qty).toBe(2);
			expect(item.profit).toBe(400);
			expect(item.discount_percent).toBe(0);
			expect(item.tax).toBe(160);
			expect(item.original_unitary_price).toBe(500);
		});
	});

	describe('calculateAgentCommissions', () => {
		function makeReport(): AgentCommissionReport {
			return {
				sales: [
					{ order_id: 10, payment_id: 50, amount_paid_in_period: 600, order_total: 1000 }
				],
				items_by_order: {
					'10': {
						amount_paid_in_period: 600,
						order: {
							order_id: 10,
							order_total: 1000,
							order_subtotal: 1000,
							order_discount: 100,
							price_type_id: 2,
							store_id: 1,
							closed_timestamp: '2026-01-15 10:00:00',
							amount_paid: 600
						},
						items: [
							{
								order_item_id: 100,
								item_id: 5,
								category_id: 7,
								qty: 2,
								unitary_price: 500,
								total_sale: 1000,
								subtotal: 1000,
								discount: 0,
								discount_percent: 0,
								unit_cost: 300,
								total_cost: 600,
								commission_type: 'RULE_PERCENT',
								commission: 0,
								tax: 160,
								original_unitary_price: 500
							}
						]
					}
				}
			};
		}

		it('scales the formula result by the line paid ratio', () => {
			const rule = makeStoredRule({ item_id: 5, formula: 'return order_item.total * 0.10;' });
			const result = calculateAgentCommissions(makeReport(), [rule], '2026-01-01 00:00:00', '2026-01-31 23:59:59');

			expect(result.errors).toEqual([]);
			expect(result.lines.length).toBe(1);
			expect(result.lines[0]).toEqual({
				order_id: 10,
				payment_id: 50,
				paid_ratio: 0.6,
				amount: 60,
				items: [{ order_item_id: 100, rule_id: 3, amount: 60 }]
			});
			expect(result.total_amount).toBe(60);
		});

		it('collects formula errors with order and item context', () => {
			const rule = makeStoredRule({ item_id: 5, formula: 'throw new Error("boom");' });
			const result = calculateAgentCommissions(makeReport(), [rule], '2026-01-01 00:00:00', '2026-01-31 23:59:59');

			expect(result.errors.length).toBe(1);
			expect(result.errors[0]).toContain('order 10 item 100');
			expect(result.errors[0]).toContain('boom');
		});

		it('reports sales whose order is missing from the items', () => {
			const report = makeReport();
			report.items_by_order = {};
			const result = calculateAgentCommissions(report, [], '2026-01-01 00:00:00', '2026-01-31 23:59:59');

			expect(result.lines).toEqual([]);
			expect(result.errors.length).toBe(1);
			expect(result.errors[0]).toContain('order not found');
		});
	});
});
