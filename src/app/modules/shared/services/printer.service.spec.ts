import { PrinterService, isPreWriteUsbError, resolveEncoderModel, resolveFontBColumns, snapEncoderColumns } from './printer.service';
import { Printer } from '../RestModels/Printer';

function makePrinter(over: Partial<Printer> = {}): Printer {
	return {
		id: 1,
		created_by_user_id: 0,
		created: new Date(),
		description: 0,
		device: null,
		ip_address: null,
		model: 'pos-8350',
		name: 'Cocina',
		font_a_columns: 48,
		font_b_columns: 64,
		port: null,
		protocol: '',
		serial_number: '',
		store_id: null,
		updated_by_user_id: 0,
		updated: new Date(),
		vendor_id: '0x0416',
		product_id: '0x5011',
		interface_number: null,
		codepage_mapping: null,
		paper_width: null,
		ticket_id: null,
		...over
	};
}

describe('snapEncoderColumns', () => {
	it('keeps supported widths', () => {
		expect(snapEncoderColumns(48)).toBe(48);
		expect(snapEncoderColumns(32)).toBe(32);
	});

	it('snaps unsupported widths to the nearest supported one', () => {
		expect(snapEncoderColumns(64)).toBe(48);
	});

	it('falls back to 48 on missing values', () => {
		expect(snapEncoderColumns(0)).toBe(48);
		expect(snapEncoderColumns(NaN)).toBe(48);
	});
});

describe('resolveFontBColumns', () => {
	it('returns the clamped configured width', () => {
		expect(resolveFontBColumns(makePrinter({ font_b_columns: 64 }), 48)).toBe(64);
	});

	it('throws when font B is not configured', () => {
		expect(() => resolveFontBColumns(makePrinter({ font_b_columns: null }), 48)).toThrow();
	});
});

describe('resolveEncoderModel', () => {
	it('maps models without an encoder profile to the closest one', () => {
		expect(resolveEncoderModel('pos-8350')).toBe('pos-8360');
	});

	it('keeps supported models as is', () => {
		expect(resolveEncoderModel('bixolon-srp350iii')).toBe('bixolon-srp350iii');
	});

	it('defaults a missing model', () => {
		expect(resolveEncoderModel(null)).toBe('bixolon-srp350iii');
	});
});

describe('printed item memory', () => {
	it('never returns a marked id as unprinted, even without storage', async () => {
		const service = new PrinterService();
		await service.markItemsPrinted(['7-1-2']).catch(() => undefined);
		expect(await service.getUnprintedItemIds(['7-1-2'])).toEqual([]);
	});
});

describe('isPreWriteUsbError', () => {
	it('is true only when nothing could have printed', () => {
		expect(isPreWriteUsbError({ name: 'NotFoundError' })).toBeTrue();
		expect(isPreWriteUsbError({ name: 'SecurityError' })).toBeTrue();
	});

	it('is false for ambiguous errors so no browser fallback double-prints', () => {
		expect(isPreWriteUsbError({ name: 'NetworkError' })).toBeFalse();
		expect(isPreWriteUsbError({ name: 'InvalidStateError' })).toBeFalse();
		expect(isPreWriteUsbError({ message: 'busy' })).toBeFalse();
		expect(isPreWriteUsbError(null)).toBeFalse();
		expect(isPreWriteUsbError(undefined)).toBeFalse();
	});
});
