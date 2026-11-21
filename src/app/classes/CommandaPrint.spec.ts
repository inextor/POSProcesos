import { OrderItemStructureInfo } from '../modules/shared/Models';
import { CommandaPrint, commandaChildOptionPrefix, tableDisplayName, toCommandaPrintLines } from './CommandaPrint';

function makeStructuredItem(overrides: Partial<OrderItemStructureInfo> = {}): OrderItemStructureInfo {
	return {
		item: { id: 1, name: 'Taco' } as any,
		category: { id: 2, name: 'Cocina' } as any,
		item_options: [],
		options: [],
		exceptions: [],
		serials: [],
		prices: [],
		records: [],
		serials_string: '',
		commanda_type_id: 7,
		category_zero: null,
		order_item: {
			id: 10,
			qty: 2,
			note: '',
			exceptions: '',
			has_separator: 'NO',
			item_option_id: null,
			item_option_qty: 1,
			item_group: 1
		} as any,
		created: new Date(),
		order_item_exceptions: [],
		childs: [],
		total_options: 0,
		total_cost: 0,
		...overrides
	} as OrderItemStructureInfo;
}

describe('commandaChildOptionPrefix', () => {
	it('returns the option name plus a space when it matches', () => {
		const options = [{ item_option: { id: 5, name: 'Extra' } } as any];
		expect(commandaChildOptionPrefix(options, 5)).toBe('Extra ');
	});

	it('returns empty string for unknown option id', () => {
		const options = [{ item_option: { id: 5, name: 'Extra' } } as any];
		expect(commandaChildOptionPrefix(options, 9)).toBe('');
	});

	it('returns empty string when options are missing', () => {
		expect(commandaChildOptionPrefix(null, 5)).toBe('');
		expect(commandaChildOptionPrefix(undefined, 5)).toBe('');
	});
});

describe('tableDisplayName', () => {
	it('returns the preloaded table name', () => {
		expect(tableDisplayName({ 5: 'Terraza 1' }, 5)).toBe('Terraza 1');
	});

	it('falls back to the id when the table is missing', () => {
		expect(tableDisplayName({}, 5)).toBe('5');
	});

	it('returns null when there is no table', () => {
		expect(tableDisplayName({}, null)).toBeNull();
		expect(tableDisplayName({}, undefined)).toBeNull();
	});
});

describe('toCommandaPrintLines', () => {
	it('prefixes the category name when categories are shown', () => {
		const lines = toCommandaPrintLines([makeStructuredItem()], true);
		expect(lines[0].name).toBe('Cocina - Taco');
	});

	it('uses the plain item name when categories are hidden', () => {
		const lines = toCommandaPrintLines([makeStructuredItem()], false);
		expect(lines[0].name).toBe('Taco');
	});

	it('maps child options with qty and option prefix plus notes and separators', () => {
		const item = makeStructuredItem({
			order_item: { id: 10, qty: 1, note: 'Sin cebolla', exceptions: 'Extra salsa', has_separator: 'YES', item_option_id: null, item_option_qty: 1, item_group: 1 } as any,
			options: [{ item_option: { id: 5, name: 'Queso' } } as any],
			childs: [
				{
					item: { name: 'Quesadilla' },
					order_item: { item_option_id: 5, item_option_qty: 2, note: 'Bien cocida' }
				} as any
			]
		});
		const lines = toCommandaPrintLines([item], false);
		expect(lines[0].options).toEqual(['2x Queso Quesadilla']);
		expect(lines[0].child_notes).toEqual(['Bien cocida']);
		expect(lines[0].note).toBe('Sin cebolla');
		expect(lines[0].exceptions).toBe('Extra salsa');
		expect(lines[0].has_separator).toBeTrue();
	});
});

describe('CommandaPrint.createCommandaXml', () => {
	const printer = new CommandaPrint();

	it('builds the header with order, client, service type and mesa', () => {
		const xml = printer.createCommandaXml(99, 'Juan', 'TOGO', [], 42, 'b', null);
		expect(xml).toContain('Orden #99');
		expect(xml).toContain('Cliente: Juan');
		expect(xml).toContain('A DOMICILIO');
		expect(xml).toContain('='.repeat(42));
		expect(xml).toContain('<Cut mode="partial"/>');
	});

	it('prints the mesa line instead of a service label for dine-in', () => {
		const xml = printer.createCommandaXml(99, '', 'IN_PLACE', [], 42, 'b', 'Terraza 1');
		expect(xml).toContain('Terraza 1');
		expect(xml).not.toContain('A DOMICILIO');
		expect(xml).not.toContain('RECOGER');
	});

	it('emits a reverse-mode black bar for separator items and dashes otherwise', () => {
		const xml = printer.createCommandaXml(1, '', 'IN_PLACE', [
			{ qty: 1, name: 'Agua', options: [], note: '', exceptions: '', has_separator: true },
			{ qty: 2, name: 'Taco', options: [], note: '', exceptions: '', has_separator: false }
		], 10, 'b', null);
		expect(xml).toContain('<Bytes>1d 42 01</Bytes>');
		expect(xml).toContain('1 x Agua');
		expect(xml).toContain('-'.repeat(10));
	});

	it('escapes xml and replaces bullets with middle dots', () => {
		const xml = printer.createCommandaXml(1, 'A&B', 'IN_PLACE', [
			{ qty: 1, name: '• Taco <grande>', options: [], note: '', exceptions: '', has_separator: false }
		], 10, 'a', null);
		expect(xml).toContain('Cliente: A&amp;B');
		expect(xml).toContain('· Taco &lt;grande&gt;');
	});
});

describe('CommandaPrint.buildTestXml', () => {
	const printer = new CommandaPrint();

	it('builds a connection test ticket with escaped printer data', () => {
		const xml = printer.buildTestXml('Cocina & Bar', 'pos-8350');
		expect(xml).toContain('TEST DE CONEXION');
		expect(xml).toContain('Cocina &amp; Bar');
		expect(xml).toContain('Modelo: pos-8350');
		expect(xml).toContain('<Cut mode="partial"/>');
	});
});

describe('CommandaPrint.buildCommandaBrowserHtml', () => {
	const printer = new CommandaPrint();

	it('builds a browser ticket with order, client, pickup label and child notes', () => {
		const html = printer.buildCommandaBrowserHtml(7, 'Maria', 'PICK_UP', [
			{ qty: 2, name: 'Taco', options: ['Queso Quesadilla'], child_notes: ['Bien cocida'], note: 'Sin cebolla', exceptions: '', has_separator: false }
		]);
		expect(html).toContain('Order #7');
		expect(html).toContain('Maria');
		expect(html).toContain('RECOGER');
		expect(html).toContain('Sin cebolla');
		expect(html).toContain('Bien cocida');
	});

	it('escapes html in names and notes', () => {
		const html = printer.buildCommandaBrowserHtml(1, 'A&B', 'TOGO', [
			{ qty: 1, name: '<Taco>', options: [], child_notes: [], note: 'a\nb', exceptions: '', has_separator: false }
		]);
		expect(html).toContain('&lt;Taco&gt;');
		expect(html).toContain('a<br>b');
		expect(html).toContain('A DOMICILIO');
	});
});
