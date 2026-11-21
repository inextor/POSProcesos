import { Injectable } from '@angular/core';
import { DatabaseStore } from '../Finger/DatabaseStore';
import { OFFLINE_DB_SCHEMA } from '../OfflineDBSchema';
import { Printer } from '../RestModels/Printer';

export interface PrinterUsbConfig {
	vendorId: number;
	productId: number;
	serial_number?: string;
}

export interface PrinterEncoderConfig {
	language: string;
	columns: number;
	printerModel: string;
	codepageMapping: string;
}

export interface PrintResult {
	success: boolean;
	message: string;
	error?: any;
}

export interface ComandaPrintPrefs {
	auto_print_commanda_ids: number[];
	comanda_printer_by_id: Record<number, number | null>;
}

export const COMANDA_PRINT_PREFS_KEY = 'comanda_print_prefs';

/**
 * Line widths accepted by receipt-printer-encoder.esm.js.
 * The encoder constructor throws "The width of the paper must me either
 * 32, 35, 42, 44 or 48 columns" for any other value, regardless of model.
 */
export const ENCODER_COLUMN_WIDTHS = [32, 35, 42, 44, 48];

/**
 * Snap a configured column count to the nearest width the encoder accepts.
 * Missing/invalid values fall back to 48 (font A default).
 */
export function snapEncoderColumns(columns: number): number {
	if (!columns || isNaN(columns)) {
		return 48;
	}
	let best = ENCODER_COLUMN_WIDTHS[0];
	for (const width of ENCODER_COLUMN_WIDTHS) {
		if (Math.abs(width - columns) < Math.abs(best - columns)) {
			best = width;
		}
	}
	return best;
}

/**
 * Font-B width used for ticket layout math (tables, dotted rows).
 * The printer's font_b_columns is required (like font_a_columns) and is
 * clamped to the same 20-80 range the printer config screen enforces.
 * A missing or invalid value is a configuration error and throws instead
 * of silently deriving a width from Font A.
 */
export function resolveFontBColumns(printer: Printer, columns: number): number {
	const configured = Number(printer?.font_b_columns);
	if (configured && !isNaN(configured)) {
		return Math.min(80, Math.max(20, Math.round(configured)));
	}
	throw new Error(`La impresora ${printer?.name || '(sin nombre)'} no tiene configurado "Columnas Fuente B" (es requerido). Edite la impresora y guarde el valor.`);
}

/**
 * Models offered by the config screen that have no profile in the
 * vendored encoder bundle (it throws "Unknown printer model" for
 * them). Each maps to the closest supported profile of the same
 * family so existing records keep printing instead of dying.
 */
export const MODEL_PROFILE_FALLBACKS: Record<string, string> = {
	'bixolon-srp350plusiii': 'bixolon-srp350iii',
	'epson-tm-t88': 'epson-tm-t88vii',
	'epson-tm-t20': 'epson-tm-t20iv',
	'star-tsp100': 'star-tsp100iv',
	'pos-8350': 'pos-8360'
};

/**
 * Resolve the encoder profile for a configured model, applying the
 * fallback table above with a warning when it kicks in.
 */
export function resolveEncoderModel(model: string | null | undefined): string {
	const configured = model || 'bixolon-srp350iii';
	const fallback = MODEL_PROFILE_FALLBACKS[configured];
	if (fallback) {
		console.warn(`printer model ${configured} has no encoder profile, using ${fallback}.`);
		return fallback;
	}
	return configured;
}

type PrintUsbFunction = (xmlString: string, evt: Event | null, config: PrinterUsbConfig, interfaceNumber: number, encoderConfig?: PrinterEncoderConfig) => Promise<string>;

/**
 * True when the USB error proves nothing reached the printer
 * (device not found or permission denied happen before any write),
 * so a browser fallback cannot double-print. Any other error
 * (busy interface, network cut mid-write, unknown) is ambiguous:
 * the ticket may already be on paper, so the caller must NOT
 * fall back and must leave the items unprinted for retry.
 */
export function isPreWriteUsbError(error: any): boolean {
	const name = error?.name;
	return name === 'NotFoundError' || name === 'SecurityError';
}

@Injectable({
	providedIn: 'root'
})
export class PrinterService {
	private print_chain: Promise<void> = Promise.resolve();

	constructor() {
	}

	private isPrinterLibraryLoaded(): boolean {
		return typeof (window as any)._printUsb === 'function';
	}

	private getPrintUsbFunction(): PrintUsbFunction {
		if (!this.isPrinterLibraryLoaded()) {
			throw new Error('Libreria de impresion no cargada. Recargue la pagina.');
		}
		return (window as any)._printUsb;
	}

	/**
	 * Parse hex string to number (e.g. "0x1504" -> 5380)
	 */
	private parseHexId(hexString: string | null | undefined): number {
		if (!hexString) {
			throw new Error('Vendor ID o Product ID no configurado. Edite la impresora para agregar estos valores.');
		}
		if (hexString.startsWith('0x') || hexString.startsWith('0X')) {
			return parseInt(hexString, 16);
		}
		return parseInt(hexString, 10);
	}

	/**
	 * Build USB config from Printer model
	 */
	private buildUsbConfig(printer: Printer): PrinterUsbConfig {
		return {
			vendorId: this.parseHexId(printer.vendor_id),
			productId: this.parseHexId(printer.product_id),
			serial_number: printer.serial_number || undefined
		};
	}

	/**
	 * Build encoder config from Printer model
	 */
	buildEncoderConfig(printer: Printer): PrinterEncoderConfig {
		const columns = snapEncoderColumns(Number(printer.font_a_columns));
		if (columns !== Number(printer.font_a_columns)) {
			console.warn(`font_a_columns=${printer.font_a_columns} is not supported by the encoder, using ${columns}. Valid widths: ${ENCODER_COLUMN_WIDTHS.join(', ')}`);
		}
		return {
			language: 'esc-pos',
			columns: columns,
			printerModel: resolveEncoderModel(printer.model),
			codepageMapping: printer.codepage_mapping || 'bixolon'
		};
	}

	private getDefaultPrefs(): ComandaPrintPrefs {
		return {
			auto_print_commanda_ids: [],
			comanda_printer_by_id: {}
		};
	}

	/**
	 * Load this device's comanda print preferences from localStorage.
	 * Selections are per device: two kitchen stations can check different
	 * comandas and pick different printers.
	 */
	loadComandaPrintPrefs(): ComandaPrintPrefs {
		try {
			const stored = localStorage.getItem(COMANDA_PRINT_PREFS_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				return {
					auto_print_commanda_ids: parsed.auto_print_commanda_ids || [],
					comanda_printer_by_id: parsed.comanda_printer_by_id || {}
				};
			}
		} catch (e) {
			console.warn('Error loading comanda print prefs:', e);
		}
		return this.getDefaultPrefs();
	}

	saveComandaPrintPrefs(prefs: ComandaPrintPrefs): void {
		try {
			localStorage.setItem(COMANDA_PRINT_PREFS_KEY, JSON.stringify(prefs));
		} catch (e) {
			console.warn('Error saving comanda print prefs:', e);
		}
	}

	isComandaAutoPrint(commanda_id: number): boolean {
		return this.loadComandaPrintPrefs().auto_print_commanda_ids.includes(commanda_id);
	}

	setComandaAutoPrint(commanda_id: number, enabled: boolean): ComandaPrintPrefs {
		const prefs = this.loadComandaPrintPrefs();
		if (enabled && !prefs.auto_print_commanda_ids.includes(commanda_id)) {
			prefs.auto_print_commanda_ids.push(commanda_id);
		}
		if (!enabled) {
			prefs.auto_print_commanda_ids = prefs.auto_print_commanda_ids.filter((id) => id !== commanda_id);
		}
		this.saveComandaPrintPrefs(prefs);
		return prefs;
	}

	/**
	 * USB printer selected for one comanda (single choice). Null means
	 * traditional browser printing for that comanda. Selections are
	 * independent per comanda id.
	 */
	getComandaPrinter(commanda_id: number | null | undefined, available_printers: Printer[]): Printer | null {
		if (commanda_id === null || commanda_id === undefined) {
			return null;
		}
		const prefs = this.loadComandaPrintPrefs();
		const printer_id = (prefs.comanda_printer_by_id || {})[commanda_id];
		if (printer_id === null || printer_id === undefined) {
			return null;
		}
		return available_printers.find((printer) => printer.id === printer_id) || null;
	}

	/**
	 * Save the USB printer for one comanda (null = browser printing).
	 */
	setComandaPrinter(commanda_id: number, printer_id: number | null): ComandaPrintPrefs {
		const prefs = this.loadComandaPrintPrefs();
		const map = { ...(prefs.comanda_printer_by_id || {}) };
		if (printer_id === null || printer_id === undefined) {
			delete map[commanda_id];
		} else {
			map[commanda_id] = printer_id;
		}
		prefs.comanda_printer_by_id = map;
		this.saveComandaPrintPrefs(prefs);
		return prefs;
	}

	private getPrintedItemsDb(): DatabaseStore {
		return DatabaseStore.builder(
			OFFLINE_DB_SCHEMA.name,
			OFFLINE_DB_SCHEMA.version,
			OFFLINE_DB_SCHEMA.schema
		);
	}

	private printed_memory_set: Set<string> = new Set();

	/**
	 * Return the subset of ids that this device has NOT printed yet.
	 * Unlike the legacy getPrintedItems, this does NOT mark anything:
	 * ids are marked only after a successful print via markItemsPrinted,
	 * so a failed USB attempt that falls back (or fails entirely) never
	 * silently loses the comanda.
	 */
	async getUnprintedItemIds(ids: string[]): Promise<string[]> {
		const candidates = ids.filter((id) => !this.printed_memory_set.has(id));
		if (candidates.length === 0) {
			return [];
		}
		const db = this.getPrintedItemsDb();
		const found = await Promise.all(candidates.map((id) => db.get('printed_items', id).catch(() => null)));
		return candidates.filter((_id, index) => found[index] === undefined || found[index] === null);
	}

	/**
	 * Mark ids as printed by this device. Call only after the ticket
	 * (USB or browser) was actually dispatched. Memory is updated first
	 * so the session never reprints even when IndexedDB is unavailable;
	 * the database copy covers page reloads.
	 */
	async markItemsPrinted(ids: string[]): Promise<void> {
		ids.forEach((id) => this.printed_memory_set.add(id));
		if (ids.length === 0) {
			return;
		}
		const db = this.getPrintedItemsDb();
		await db.addAll('printed_items', ids.map((id) => ({ id })), true);
	}

	/**
	 * Probe the printed-items storage. When it fails, printed state only
	 * survives in memory: already-printed tickets WILL print again after
	 * a page reload, and the page must warn about it instead of
	 * reprinting silently.
	 */
	async checkPrintedStorage(): Promise<boolean> {
		try {
			const db = this.getPrintedItemsDb();
			const probe = '__probe__' + Date.now();
			await db.add('printed_items', { id: probe });
			const back = await db.get<{ id: string }>('printed_items', probe);
			await db.remove('printed_items', probe).catch(() => undefined);
			return !!back && back.id === probe;
		} catch {
			return false;
		}
	}

	/**
	 * Print ESC/POS XML to the given USB printer.
	 * Requires user interaction (click event) due to WebUSB security
	 * on some platforms; pass null when printing from a socket event.
	 * Jobs run one at a time through an internal queue: concurrent
	 * prints (bulk buttons, socket bursts) must never fight over the
	 * USB interface, which surfaces as busy-device errors and
	 * duplicate browser fallbacks.
	 */
	print(xml: string, printer: Printer, evt: Event | null = null): Promise<PrintResult> {
		if (!printer) {
			return Promise.resolve({ success: false, message: 'No hay impresora configurada' });
		}
		const job = this.print_chain.then(() => this.runPrint(xml, printer, evt));
		this.print_chain = job.then(() => undefined, () => undefined);
		return job;
	}

	private async runPrint(xml: string, printer: Printer, evt: Event | null = null): Promise<PrintResult> {
		try {
			const usb_config = this.buildUsbConfig(printer);
			const encoder_config = this.buildEncoderConfig(printer);
			const print_usb = this.getPrintUsbFunction();
			await print_usb(xml, evt, usb_config, printer.interface_number || 0, encoder_config);
			return { success: true, message: 'Impresion exitosa' };
		} catch (error: any) {
			let error_message = 'Error al imprimir';
			if (error?.message) {
				error_message = error.message;
			} else if (error?.name === 'NotFoundError') {
				error_message = 'Impresora no encontrada. Verifique conexion USB.';
			} else if (error?.name === 'SecurityError') {
				error_message = 'Permiso denegado. Requiere clic del usuario.';
			} else if (error?.name === 'NetworkError') {
				error_message = 'Error de red USB. Reconecte la impresora.';
			} else if (typeof error === 'string') {
				error_message = error;
			}
			return { success: false, message: error_message, error: error };
		}
	}
}
