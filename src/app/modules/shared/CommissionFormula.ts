import { Commission_Rule } from './RestModels';

// Shared frontend commission engine.
//
// Every order item commission is calculated here, in the browser. The backend
// never executes formulas: it only validates and persists the amounts this
// module produces (see backend/generate_commission_by_agent.php).
//
// A rule formula is a full multi-statement JS function body. It receives four
// objects and must `return` the item full commission (a finite number >= 0).
// Property names mirror the backend column names (snake_case) so formulas
// read like the database:
//
//	let discount_percent = ((order.discount / order.total)
//		+ (order_item.discount / order_item.total)) / 2;
//	if (discount_percent < 10)
//		return order_item.total * 0.10;
//	return 0;

export const MAX_FORMULA_LENGTH = 2000;

export interface FormulaOrder {
	id: number;
	total: number;
	subtotal: number;
	discount: number;
	price_type_id: number | null;
	store_id: number | null;
	// Raw 'YYYY-MM-DD HH:mm:ss' from MySQL converted to 'YYYY-MM-DDTHH:mm:ss', or null when the order is not closed.
	closed_timestamp: string | null;
	amount_paid: number;
}

export interface FormulaOrderItem {
	id: number;
	item_id: number;
	category_id: number | null;
	qty: number;
	unitary_price: number;
	total: number;
	subtotal: number;
	discount: number;
	discount_percent: number;
	unit_cost: number;
	total_cost: number;
	profit: number;
	tax: number;
	original_unitary_price: number;
}

export interface FormulaRule {
	id: number | null;
	base_percent: number;
	discount_reduction_per_percent: number;
}

export interface FormulaPeriod {
	amount_paid_in_period: number;
	paid_ratio: number;
	date_start: string;
	date_end: string;
}

// Subset of the getCommissionByAgentByPayment.php JSON used by the calculator.
// Numbers may arrive as strings (MySQL decimals over JSON); the builders coerce them.
export interface AgentCommissionSaleRow {
	order_id: number | string;
	payment_id: number | string;
	amount_paid_in_period: number | string;
	order_total: number | string;
}

export interface AgentCommissionItemRow {
	order_item_id: number | string;
	item_id: number | string;
	category_id: number | string | null;
	qty: number | string;
	unitary_price: number | string;
	total_sale: number | string;
	subtotal: number | string;
	discount: number | string;
	discount_percent: number | string | null;
	unit_cost: number | string;
	total_cost: number | string;
	commission_type: string;
	commission: number | string;
	tax: number | string;
	original_unitary_price: number | string;
}

export interface AgentCommissionOrderRow {
	order_id: number | string;
	order_total: number | string;
	order_subtotal: number | string;
	order_discount: number | string;
	price_type_id: number | string | null;
	store_id: number | string | null;
	closed_timestamp: string | null;
	amount_paid: number | string;
}

export interface AgentCommissionOrderEntry {
	amount_paid_in_period: number | string;
	order: AgentCommissionOrderRow;
	items: AgentCommissionItemRow[];
}

export interface AgentCommissionReport {
	sales: AgentCommissionSaleRow[];
	items_by_order: Record<string, AgentCommissionOrderEntry>;
}

export interface GeneratedLineItem {
	order_item_id: number;
	rule_id: number | null;
	amount: number;
}

export interface GeneratedLine {
	order_id: number;
	payment_id: number;
	paid_ratio: number;
	amount: number;
	items: GeneratedLineItem[];
}

export interface AgentCommissionCalcResult {
	lines: GeneratedLine[];
	total_amount: number;
	errors: string[];
}

export function toCalcNumber(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function toIdNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function toClosedTimestamp(value: string | null): string | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	return String(value).replace(' ', 'T');
}

export function buildFormulaOrder(row: AgentCommissionOrderRow): FormulaOrder {
	return {
		id: toCalcNumber(row.order_id),
		total: toCalcNumber(row.order_total),
		subtotal: toCalcNumber(row.order_subtotal),
		discount: toCalcNumber(row.order_discount),
		price_type_id: toIdNumber(row.price_type_id),
		store_id: toIdNumber(row.store_id),
		closed_timestamp: toClosedTimestamp(row.closed_timestamp),
		amount_paid: toCalcNumber(row.amount_paid)
	};
}

export function buildFormulaOrderItem(row: AgentCommissionItemRow): FormulaOrderItem {
	const total = toCalcNumber(row.total_sale);
	const total_cost = toCalcNumber(row.total_cost);
	return {
		id: toCalcNumber(row.order_item_id),
		item_id: toCalcNumber(row.item_id),
		category_id: toIdNumber(row.category_id),
		qty: toCalcNumber(row.qty),
		unitary_price: toCalcNumber(row.unitary_price),
		total: total,
		subtotal: toCalcNumber(row.subtotal),
		discount: toCalcNumber(row.discount),
		discount_percent: toCalcNumber(row.discount_percent),
		unit_cost: toCalcNumber(row.unit_cost),
		total_cost: total_cost,
		profit: total - total_cost,
		tax: toCalcNumber(row.tax),
		original_unitary_price: toCalcNumber(row.original_unitary_price)
	};
}

export function buildFormulaRule(rule: Commission_Rule | null): FormulaRule {
	return {
		id: rule ? Number(rule.id) : null,
		base_percent: rule ? toCalcNumber(rule.base_percent) : 0,
		discount_reduction_per_percent: rule ? toCalcNumber(rule.discount_reduction_per_percent) : 0
	};
}

// Same ratio the backend report uses: full amount paid when the order total is zero.
export function calcPaidRatio(amount_paid_in_period: number, order_total: number): number {
	return amount_paid_in_period / (order_total === 0 ? 1 : order_total);
}

export function evaluateCommissionFormula(
	formula: string,
	order: FormulaOrder,
	order_item: FormulaOrderItem,
	rule: FormulaRule,
	period: FormulaPeriod
): number {
	let compiled: (...args: unknown[]) => unknown;
	try {
		compiled = new Function('order', 'order_item', 'rule', 'period', formula) as (...args: unknown[]) => unknown;
	} catch (error) {
		throw new Error('invalid formula syntax: ' + getErrorMessage(error));
	}

	let result: unknown;
	try {
		result = compiled(order, order_item, rule, period);
	} catch (error) {
		throw new Error('formula execution failed: ' + getErrorMessage(error));
	}

	if (typeof result !== 'number' || !Number.isFinite(result)) {
		throw new Error('formula must return a finite number, got ' + describeValue(result));
	}

	if (result < 0) {
		throw new Error('formula returned a negative commission (' + result + ')');
	}

	return result;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function describeValue(value: unknown): string {
	if (value === null) {
		return 'null';
	}
	if (Array.isArray(value)) {
		return 'array';
	}
	return typeof value;
}

// Mirrors OrderUtils::getCommissionRuleJoinSql priority (backend/OrderUtils.php):
// a rule matches when every non-null scope equals the row (null scope = any),
// then rules rank by (item scope) + (category scope) + (store or price scope),
// breaking ties by item scope, then category scope. Keep both in sync.
export function resolveCommissionRule(
	rule_array: Commission_Rule[],
	store_id: number | null,
	price_type_id: number | null,
	category_id: number | null,
	item_id: number
): Commission_Rule | null {
	let best_rule: Commission_Rule | null = null;
	let best_score = -1;
	let best_item_scope = -1;
	let best_category_scope = -1;

	for (const rule of rule_array) {
		if (rule.status !== 'ACTIVE') {
			continue;
		}
		if (!scopeMatches(rule.store_id, store_id)) {
			continue;
		}
		if (!scopeMatches(rule.price_type_id, price_type_id)) {
			continue;
		}
		if (!scopeMatches(rule.category_id, category_id)) {
			continue;
		}
		if (!scopeMatches(rule.item_id, item_id)) {
			continue;
		}

		const item_scope = rule.item_id === null ? 0 : 1;
		const category_scope = rule.category_id === null ? 0 : 1;
		const scope_score = item_scope + category_scope + ((rule.store_id !== null || rule.price_type_id !== null) ? 1 : 0);

		if (scope_score > best_score
			|| (scope_score === best_score && item_scope > best_item_scope)
			|| (scope_score === best_score && item_scope === best_item_scope && category_scope > best_category_scope)) {
			best_rule = rule;
			best_score = scope_score;
			best_item_scope = item_scope;
			best_category_scope = category_scope;
		}
	}

	return best_rule;
}

function scopeMatches(rule_value: number | null, row_value: number | null): boolean {
	if (rule_value === null || rule_value === undefined) {
		return true;
	}
	return Number(rule_value) === Number(row_value);
}

export interface ItemCommissionInput {
	order: FormulaOrder;
	order_item: FormulaOrderItem;
	rule: Commission_Rule | null;
	commission_type: string;
	commission_value: number;
	period: FormulaPeriod;
}

export interface ItemCommissionOutput {
	commission_full: number;
	rule_id: number | null;
	formula_used: boolean;
}

// Single entry point for every item. Uses the rule formula when present,
// otherwise the legacy math from getOrderItemCommissionSql.
export function calculateItemCommission(input: ItemCommissionInput): ItemCommissionOutput {
	const formula = input.rule && input.rule.formula ? input.rule.formula.trim() : '';

	if (formula !== '') {
		return {
			commission_full: evaluateCommissionFormula(formula, input.order, input.order_item, buildFormulaRule(input.rule), input.period),
			rule_id: input.rule ? Number(input.rule.id) : null,
			formula_used: true
		};
	}

	return {
		commission_full: calcLegacyCommission(
			input.commission_type,
			input.commission_value,
			input.order_item,
			buildFormulaRule(input.rule)
		),
		rule_id: input.rule ? Number(input.rule.id) : null,
		formula_used: false
	};
}

// TS port of OrderUtils::getOrderItemCommissionSql. Keep both in sync.
export function calcLegacyCommission(
	commission_type: string,
	commission_value: number,
	order_item: FormulaOrderItem,
	rule: FormulaRule
): number {
	if (commission_type === 'PERCENT') {
		return order_item.total * commission_value / 100;
	}
	if (commission_type === 'AMOUNT') {
		return order_item.qty * commission_value;
	}
	if (commission_type === 'RULE_PERCENT') {
		const effective_percent = Math.max(0, rule.base_percent - (order_item.discount_percent * rule.discount_reduction_per_percent));
		return order_item.total * effective_percent / 100;
	}
	return 0;
}

function roundAmount(value: number): number {
	return Math.round(value * 1000000) / 1000000;
}

export function calculateAgentCommissions(
	report: AgentCommissionReport,
	rule_array: Commission_Rule[],
	date_start: string,
	date_end: string
): AgentCommissionCalcResult {
	const errors: string[] = [];
	const lines: GeneratedLine[] = [];

	const full_by_order: Record<string, { order: FormulaOrder; items: { row: AgentCommissionItemRow; item: FormulaOrderItem; commission_full: number; rule_id: number | null }[] }> = {};

	for (const order_id of Object.keys(report.items_by_order || {})) {
		const entry = report.items_by_order[order_id];
		if (!entry || !entry.order) {
			errors.push('order ' + order_id + ': missing order context in report');
			continue;
		}

		const order = buildFormulaOrder(entry.order);
		const order_paid = toCalcNumber(entry.amount_paid_in_period);
		const period: FormulaPeriod = {
			amount_paid_in_period: order_paid,
			paid_ratio: calcPaidRatio(order_paid, order.total),
			date_start: date_start,
			date_end: date_end
		};

		const item_results: { row: AgentCommissionItemRow; item: FormulaOrderItem; commission_full: number; rule_id: number | null }[] = [];
		for (const item_row of entry.items || []) {
			const order_item = buildFormulaOrderItem(item_row);
			const rule = resolveCommissionRule(rule_array, order.store_id, order.price_type_id, order_item.category_id, order_item.item_id);
			try {
				const output = calculateItemCommission({
					order: order,
					order_item: order_item,
					rule: rule,
					commission_type: String(item_row.commission_type || 'NONE'),
					commission_value: toCalcNumber(item_row.commission),
					period: period
				});
				item_results.push({ row: item_row, item: order_item, commission_full: output.commission_full, rule_id: output.rule_id });
			} catch (error) {
				errors.push('order ' + order.id + ' item ' + order_item.id + ' (rule ' + (rule ? rule.id : 'none') + '): ' + getErrorMessage(error));
			}
		}

		full_by_order[order_id] = { order: order, items: item_results };
	}

	for (const sale_row of report.sales || []) {
		const order_id = String(sale_row.order_id);
		const order_entry = full_by_order[order_id];
		if (!order_entry) {
			errors.push('order ' + order_id + ' payment ' + sale_row.payment_id + ': order not found in report items');
			continue;
		}

		const line_paid = toCalcNumber(sale_row.amount_paid_in_period);
		const line_ratio = calcPaidRatio(line_paid, order_entry.order.total);
		const line_items: GeneratedLineItem[] = [];
		let line_amount = 0;

		for (const item_result of order_entry.items) {
			// Items that failed evaluation were already reported above; the line
			// is only sendable when errors is empty, so partial lines never persist.
			const item_amount = roundAmount(item_result.commission_full * line_ratio);
			line_items.push({ order_item_id: item_result.item.id, rule_id: item_result.rule_id, amount: item_amount });
			line_amount = roundAmount(line_amount + item_amount);
		}

		lines.push({
			order_id: Number(order_id),
			payment_id: Number(sale_row.payment_id),
			paid_ratio: line_ratio,
			amount: line_amount,
			items: line_items
		});
	}

	const total_amount = roundAmount(lines.reduce((sum, line) => sum + line.amount, 0));

	return { lines: lines, total_amount: total_amount, errors: errors };
}
