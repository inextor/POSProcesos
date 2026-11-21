import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, timer } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { PrinterService, isPreWriteUsbError, resolveFontBColumns } from '../../modules/shared/services/printer.service';
import { CommandaPrint, CommandaPrintLine, toCommandaPrintLines, tableDisplayName } from '../../classes/CommandaPrint';
import { Commanda, Commanda_Type, Order, Printer, Store, Table } from '../../modules/shared/RestModels';
import { OrderInfo, OrderItemInfo, SocketMessage } from '../../modules/shared/Models';
import { LoadingComponent } from '../../components/loading/loading.component';

declare function printHtml(html_body: string, title: string): void;

interface CCommanda extends Commanda {
	store_display: string;
	commanda_type_display: string;
	is_auto_print: boolean;
	printer_id: number | null;
	printer_display: string;
	store_printer_array: Printer[];
	status_message: string;
}

interface ReceptionLogEntry {
	timestamp_display: string;
	message: string;
}

@Component({
	selector: 'app-print-commandas',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
		LoadingComponent
	],
	templateUrl: './print-commandas.component.html',
	styleUrl: './print-commandas.component.css'
})
export class PrintCommandasComponent extends BaseComponent implements OnInit {
	commanda_array: CCommanda[] = [];
	reception_log_array: ReceptionLogEntry[] = [];
	printing_key_set: Set<string> = new Set();
	handling_order_set: Set<number> = new Set();
	last_order_timestamp: number = Date.now();
	is_polling: boolean = false;
	storage_warning: string = '';
	printer_array: Printer[] = [];
	table_name_dict: Record<number, string> = {};
	commanda_print: CommandaPrint = new CommandaPrint();
	printer_service: PrinterService;

	rest_commanda: RestSimple<Commanda> = this.rest.initRestSimple<Commanda>('commanda');
	rest_commanda_type: RestSimple<Commanda_Type> = this.rest.initRestSimple<Commanda_Type>('commanda_type');
	rest_printer: RestSimple<Printer> = this.rest.initRestSimple<Printer>('printer');
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_table: RestSimple<Table> = this.rest.initRestSimple<Table>('table');
	rest_order_info: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order_info');

	constructor(injector: Injector) {
		super(injector);
		this.printer_service = injector.get(PrinterService);
	}

	ngOnInit(): void {
		this.path = '/print-commandas';
		this.setTitle('Impresion de Comandas');
		this.loadData();

		this.subs.sink = this.rest.updates.subscribe((message: SocketMessage) => {
			this.onSocketMessage(message);
		});

		this.subs.sink = timer(30000, 30000).subscribe(() => {
			this.pollWhenQuiet();
		});
	}

	loadData(): void {
		this.is_loading = true;
		this.subs.sink = forkJoin({
			commandas: this.rest_commanda.search({ limit: 99999, sort_order: ['name_ASC'] }),
			printers: this.rest_printer.search({ limit: 99999, sort_order: ['name_ASC'] }),
			stores: this.rest_store.search({ limit: 99999 }),
			commanda_types: this.rest_commanda_type.search({ limit: 99999 }),
			tables: this.rest_table.search({ limit: 99999 })
		}).subscribe({
			next: (response) => {
				this.printer_array = response.printers.data || [];
				let table_dict: Record<number, string> = {};
				for (let table of response.tables.data || []) {
					if (table?.name) {
						table_dict[table.id] = table.name;
					}
				}
				this.table_name_dict = table_dict;
				let store_dict: Record<number, string> = {};
				for (let store of response.stores.data || []) {
					if (store?.name) {
						store_dict[store.id] = store.name;
					}
				}
				let commanda_type_dict: Record<number, string> = {};
				for (let commanda_type of response.commanda_types.data || []) {
					commanda_type_dict[commanda_type.id] = commanda_type.name;
				}
				let prefs = this.printer_service.loadComandaPrintPrefs();
				this.commanda_array = (response.commandas.data || []).map((commanda) => this.toCCommanda(commanda, store_dict, commanda_type_dict, prefs));
				this.seedPrintedBaseline();
				this.printer_service.checkPrintedStorage().then((ok) => {
					this.storage_warning = ok ? '' : 'Almacenamiento local no disponible: los impresos solo se recordaran mientras la pagina este abierta';
					if (!ok) {
						this.logReception('Almacenamiento local no disponible');
					}
				});
				this.is_loading = false;
			},
			error: (error) => this.showError(error)
		});
	}

	toCCommanda(commanda: Commanda, store_dict: Record<number, string>, commanda_type_dict: Record<number, string>, prefs: { auto_print_commanda_ids: number[]; comanda_printer_by_id: Record<number, number | null> }): CCommanda {
		let store_printer_array = this.printer_array
			.filter((printer) => printer.store_id == commanda.store_id)
			.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
		let printer_id = prefs.comanda_printer_by_id[commanda.id] ?? null;
		let selected = store_printer_array.find((printer) => printer.id == printer_id) || null;
		return {
			...commanda,
			store_display: store_dict[commanda.store_id] || '',
			commanda_type_display: commanda_type_dict[commanda.commanda_type_id] || '',
			is_auto_print: prefs.auto_print_commanda_ids.includes(commanda.id),
			printer_id,
			printer_display: selected ? (selected.name || '') : 'Navegador',
			store_printer_array,
			status_message: ''
		};
	}

	onAutoPrintChange(commanda: CCommanda): void {
		this.printer_service.setComandaAutoPrint(commanda.id, commanda.is_auto_print);
		commanda.status_message = commanda.is_auto_print ? 'Impresion automatica activada' : 'Impresion automatica desactivada';
	}

	onPrinterChange(commanda: CCommanda): void {
		this.printer_service.setComandaPrinter(commanda.id, commanda.printer_id);
		let selected = commanda.store_printer_array.find((printer) => printer.id == commanda.printer_id) || null;
		commanda.printer_display = selected ? (selected.name || '') : 'Navegador';
		commanda.status_message = commanda.printer_id === null ? 'Impresion tradicional del navegador' : `Impresora: ${commanda.printer_display}`;
		this.showSuccess(commanda.status_message);
	}

	onSocketMessage(message: SocketMessage): void {
		if (!message || message.type !== 'order' || !message.id) {
			return;
		}
		this.last_order_timestamp = Date.now();
		let order_id = Number(message.id);
		if (this.handling_order_set.has(order_id)) {
			return;
		}
		this.handling_order_set.add(order_id);
		this.logReception('Orden recibida #' + message.id);
		let checked = this.commanda_array.filter((commanda) => commanda.is_auto_print);
		if (checked.length === 0) {
			this.handling_order_set.delete(order_id);
			this.logReception('Orden #' + message.id + ' ignorada: ninguna comanda en automatico');
			return;
		}
		this.subs.sink = this.rest_order_info.get(order_id).subscribe({
			next: (order_info: OrderInfo) => {
				this.handling_order_set.delete(order_info.order.id);
				this.logReception('Orden #' + order_info.order.id + ' cargada con ' + (order_info.items || []).length + ' articulos');
				checked.forEach((commanda) => this.autoPrintOrder(commanda, order_info));
				if (checked.some((commanda) => commanda.has_sound && this.getMatchingItems(commanda, order_info).length > 0)) {
					this.playSound();
				}
			},
			error: (error) => {
				this.handling_order_set.delete(order_id);
				this.logReception('Orden #' + message.id + ' no se pudo cargar');
				this.showError(error);
			}
		});
	}

	isOrderItemSameCommanda(commanda: Commanda, order_item_info: OrderItemInfo): boolean {
		return order_item_info.item.commanda_type_id == commanda.commanda_type_id ||
			order_item_info.order_item.commanda_id == commanda.id;
	}

	getMatchingItems(commanda: Commanda, order_info: OrderInfo): OrderItemInfo[] {
		return (order_info.items || []).filter((order_item_info) => this.isOrderItemSameCommanda(commanda, order_item_info));
	}

	printedKey(commanda_id: number, order_id: number, order_item_id: number): string {
		return `${commanda_id}-${order_id}-${order_item_id}`;
	}

	autoPrintOrder(commanda: CCommanda, order_info: OrderInfo): void {
		let matching = this.getMatchingItems(commanda, order_info);
		if (matching.length === 0) {
			this.logReception('Orden #' + order_info.order.id + ' sin articulos para ' + commanda.name);
			return;
		}
		let keys = matching.map((order_item_info) => this.printedKey(commanda.id, order_info.order.id, order_item_info.order_item.id));
		this.printer_service.getUnprintedItemIds(keys).then((unprinted) => {
			if (unprinted.length === 0) {
				this.logReception('Orden #' + order_info.order.id + ' ya impresa en ' + commanda.name);
				return;
			}
			// Auto-print only ever prints unprinted items, whatever the
			// preference (checked ONLY_DISPLAY counts as FULL_PRINT).
			// Legacy reprinted the whole comanda on every change under
			// PRINT_PARTIAL; that reprint loop is exactly what this
			// page must not do.
			let to_print = matching.filter((_item, index) => unprinted.includes(keys[index]));
			this.dispatchPrint(commanda, order_info, to_print, null);
		}).catch((error) => {
			commanda.status_message = 'No se pudo revisar impresos: ' + (error?.message || error);
		});
	}

	dispatchPrint(commanda: CCommanda, order_info: OrderInfo, items: OrderItemInfo[], evt: Event | null): void {
		if (!items || items.length === 0) {
			return;
		}
		let all_keys = items.map((order_item_info) => this.printedKey(commanda.id, order_info.order.id, order_item_info.order_item.id));
		let fresh_keys = all_keys.filter((key) => !this.printing_key_set.has(key));
		if (fresh_keys.length === 0) {
			this.logReception('Orden #' + order_info.order.id + ' ya en impresion (' + commanda.name + ')');
			return;
		}
		items = items.filter((_item, index) => fresh_keys.includes(all_keys[index]));
		fresh_keys.forEach((key) => this.printing_key_set.add(key));
		let structured = this.rest.createStructuredItems(order_info);
		let relevant = structured.structured_items.filter((structured_item) => items.some((item) => item.order_item.id == structured_item.order_item.id));
		let show_categories = this.rest.preferences.display_categories_on_items == 'YES';
		let lines = toCommandaPrintLines(relevant, show_categories);
		let keys = fresh_keys;
		let printer = this.printer_service.getComandaPrinter(commanda.id, this.printer_array);
		let table_name = tableDisplayName(this.table_name_dict, order_info.order.table_id);
		if (!printer) {
			this.printViaBrowser(commanda, order_info, lines, keys, 'Impreso en navegador');
			this.releasePrintingKeys(keys);
			return;
		}
		let encoder_columns = this.printer_service.buildEncoderConfig(printer).columns;
		let rule_width: number;
		let rule_font: 'a' | 'b';
		try {
			rule_width = resolveFontBColumns(printer, encoder_columns);
			rule_font = 'b';
		} catch {
			rule_width = encoder_columns;
			rule_font = 'a';
		}
		let xml = this.commanda_print.createCommandaXml(order_info.order.id, order_info.order.client_name || '', order_info.order.service_type, lines, rule_width, rule_font, table_name);
		this.printer_service.print(xml, printer, evt).then((result) => {
			if (result.success) {
				this.logReception('Orden #' + order_info.order.id + ' impresa en ' + (printer.name || 'USB') + ' (' + commanda.name + ')');
				this.markPrintedAndStatus(commanda, keys, `Impreso en ${printer.name || 'USB'}`);
				return;
			}
			if (isPreWriteUsbError(result.error)) {
				this.logReception('Orden #' + order_info.order.id + ' sin USB, impresa en navegador (' + commanda.name + ')');
				this.printViaBrowser(commanda, order_info, lines, keys, `USB no disponible (${result.message}), impreso en navegador`);
				return;
			}
			commanda.status_message = `Fallo USB en ${commanda.name}: ${result.message}. No se marco impreso, reintente.`;
			this.logReception('Orden #' + order_info.order.id + ' fallo USB en ' + commanda.name + ': ' + result.message);
			this.showError(commanda.status_message);
		}).finally(() => this.releasePrintingKeys(keys));
	}

	printViaBrowser(commanda: CCommanda, order_info: OrderInfo, lines: CommandaPrintLine[], keys: string[], message: string): void {
		try {
			let html = this.commanda_print.buildCommandaBrowserHtml(order_info.order.id, order_info.order.client_name, order_info.order.service_type, lines);
			printHtml(html, `Comanda ${commanda.name} Orden ${order_info.order.id}`);
			this.markPrintedAndStatus(commanda, keys, message);
		} catch (error: any) {
			commanda.status_message = 'No se pudo imprimir en navegador: ' + (error?.message || error);
			this.showError(commanda.status_message);
		}
	}

	markPrintedAndStatus(commanda: CCommanda, keys: string[], message: string): void {
		commanda.status_message = message;
		this.printer_service.markItemsPrinted(keys).catch((error) => {
			commanda.status_message = 'Impreso pero no se pudo registrar: ' + (error?.message || error);
		});
	}

	getActiveOrdersSearch(commanda: CCommanda): SearchObject<Order> {
		let today = new Date();
		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);
		let search: SearchObject<Order> = this.getEmptySearch();
		search.csv.status = ['ACTIVE', 'CLOSED'];
		search.limit = 99999;
		search.ge.system_activated = today;
		search.eq.store_id = commanda.store_id;
		if (commanda.order_display_preferences == 'COMMANDA_TYPE_ORDERS') {
			search.search_extra = { commanda_id: commanda.id };
		}
		return search;
	}

	getBaselineOrderSearch(commanda: CCommanda): SearchObject<Order> {
		let search = this.getActiveOrdersSearch(commanda);
		search.limit = 1;
		search.sort_order = ['id_DESC'];
		return search;
	}

	/**
	 * Startup baseline: mark EVERYTHING that exists today as printed
	 * WITHOUT printing, then real printing starts for new arrivals.
	 * Step 1 captures the highest order id (cutoff); step 2 marks all
	 * orders up to that cutoff. Orders created after the cutoff keep a
	 * higher id, stay unmarked, and print normally via socket/poll, so
	 * no ticket created during the baseline is ever swallowed.
	 */
	seedPrintedBaseline(): void {
		let checked = this.commanda_array.filter((commanda) => commanda.is_auto_print);
		if (checked.length === 0) {
			return;
		}
		this.last_order_timestamp = Date.now();
		this.logReception('Cargando ordenes existentes como base (no se imprimiran)...');
		checked.forEach((commanda) => this.seedCommandaBaseline(commanda));
	}

	seedCommandaBaseline(commanda: CCommanda): void {
		this.subs.sink = this.rest_order_info.search(this.getBaselineOrderSearch(commanda)).subscribe({
			next: (response) => {
				let order_info_array = response.data || [];
				if (order_info_array.length === 0) {
					this.logReception('Sin ordenes previas para ' + commanda.name + ', listo para imprimir');
					return;
				}
				let max_id = Math.max(...order_info_array.map((order_info) => order_info.order.id));
				let search = this.getActiveOrdersSearch(commanda);
				search.le.id = max_id;
				this.subs.sink = this.rest_order_info.search(search).subscribe({
					next: (all_response) => {
						let all_array = all_response.data || [];
						let all_keys: string[] = [];
						all_array.forEach((order_info) => {
							this.getMatchingItems(commanda, order_info).forEach((order_item_info) => {
								all_keys.push(this.printedKey(commanda.id, order_info.order.id, order_item_info.order_item.id));
							});
						});
						if (all_keys.length === 0) {
							this.logReception('Sin articulos previos para ' + commanda.name + ', listo para imprimir');
							return;
						}
						this.printer_service.markItemsPrinted(all_keys).then(() => {
							this.logReception(all_array.length + ' ordenes marcadas como base en ' + commanda.name + ' (' + all_keys.length + ' articulos, no impresos)');
						}).catch((error) => {
							commanda.status_message = 'No se pudo marcar la base: ' + (error?.message || error);
						});
						this.last_order_timestamp = Date.now();
					},
					error: (error) => {
						commanda.status_message = 'No se pudo cargar la base de ' + commanda.name;
						this.logReception('No se pudo cargar la base de ' + commanda.name);
						this.showError(error);
					}
				});
			},
			error: (error) => {
				commanda.status_message = 'No se pudo cargar la ultima orden base';
				this.logReception('No se pudo cargar la base de ' + commanda.name);
				this.showError(error);
			}
		});
	}

	/**
	 * Backup poll: if no socket order arrived in the last 30 seconds,
	 * fetch today's active orders so a missed socket message never loses
	 * a comanda. Already-printed items are skipped by autoPrintOrder,
	 * so a poll can never reprint.
	 */
	pollWhenQuiet(): void {
		if (this.is_polling) {
			return;
		}
		if (Date.now() - this.last_order_timestamp < 30000) {
			return;
		}
		let checked = this.commanda_array.filter((commanda) => commanda.is_auto_print);
		if (checked.length === 0) {
			return;
		}
		this.is_polling = true;
		this.logReception('Sin ordenes por 30s, buscando pendientes...');
		let pending = checked.length;
		checked.forEach((commanda) => {
			this.subs.sink = this.rest_order_info.search(this.getActiveOrdersSearch(commanda)).subscribe({
				next: (response) => {
					(response.data || []).forEach((order_info) => this.autoPrintOrder(commanda, order_info));
					pending -= 1;
					if (pending === 0) {
						this.is_polling = false;
						this.last_order_timestamp = Date.now();
					}
				},
				error: (error) => {
					commanda.status_message = 'No se pudieron cargar las ordenes';
					this.showError(error);
					pending -= 1;
					if (pending === 0) {
						this.is_polling = false;
					}
				}
			});
		});
	}

	testChecked(evt: Event): void {
		let checked = this.commanda_array.filter((commanda) => commanda.is_auto_print);
		if (checked.length === 0) {
			this.showWarning('Marca al menos una comanda para probar');
			return;
		}
		checked.forEach((commanda) => {
			let printer = this.printer_service.getComandaPrinter(commanda.id, this.printer_array);
			if (!printer) {
				commanda.status_message = 'Navegador: sin prueba USB';
				return;
			}
			commanda.status_message = `Probando ${printer.name || 'impresora'}...`;
			let xml = this.commanda_print.buildTestXml(printer.name, printer.model);
			this.printer_service.print(xml, printer, evt).then((result) => {
				if (result.success) {
					commanda.status_message = `Prueba OK en ${printer.name || 'USB'}`;
					this.showSuccess(commanda.status_message);
				} else {
					commanda.status_message = `Prueba fallo: ${result.message}`;
					this.showWarning(`Prueba fallo en ${commanda.name}: ${result.message}`);
				}
			});
		});
	}

	logReception(message: string): void {
		console.log('[print-commandas] ' + message);
		let entry: ReceptionLogEntry = {
			timestamp_display: new Date().toLocaleTimeString('es-MX', { hour12: false }),
			message
		};
		this.reception_log_array = [entry, ...this.reception_log_array].slice(0, 50);
	}

	clearReceptionLog(): void {
		this.reception_log_array = [];
	}

	releasePrintingKeys(keys: string[]): void {
		keys.forEach((key) => this.printing_key_set.delete(key));
	}

	playSound(): void {
		try {
			let audio = new Audio('/assets/notification.mp3');
			let playing = audio.play();
			if (playing && playing.catch) {
				playing.catch(() => {});
			}
		} catch {
			// Sound is best effort; a blocked Audio must never break printing.
		}
	}
}
