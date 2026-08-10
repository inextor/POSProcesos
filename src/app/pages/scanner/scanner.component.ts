import { Component, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mergeMap } from 'rxjs/operators';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { CodeReaderComponent, CodeValue } from '../../modules/shared/code-reader/code-reader.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { ItemInfo, ItemStockInfo } from '../../modules/shared/Models';
import { Item, Serial, Stock_Alert, Stock_Record, Stocktake, Stocktake_Item, Stocktake_Scan, Store } from '../../modules/shared/RestModels';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';

interface CStockPerStore
{
	store_id: number;
	store_name: string;
	total: number;
}

@Component({
	selector: 'app-scanner',
	standalone: true,
	imports: [CommonModule, FormsModule, CodeReaderComponent, ModalComponent],
	templateUrl: './scanner.component.html',
	styleUrl: './scanner.component.css'
})
export class ScannerComponent extends BaseComponent
{
	rest_item_info: Rest<Item, ItemInfo> = this.rest.initRest('item_info');
	rest_stock: Rest<Item, ItemStockInfo> = this.rest.initRest('stock_by_item');
	rest_stock_record: RestSimple<Stock_Record> = this.rest.initRestSimple('stock_record');
	rest_stocktake: RestSimple<Stocktake> = this.rest.initRestSimple('stocktake');
	rest_stocktake_scan: RestSimple<Stocktake_Scan> = this.rest.initRestSimple('stocktake_scan');
	rest_stocktake_item: RestSimple<Stocktake_Item> = this.rest.initRestSimple('stocktake_item');
	rest_stock_alert: RestSimple<Stock_Alert> = this.rest.initRestSimple('stock_alert');
	rest_serial: RestSimple<Serial> = this.rest.initRestSimple('serial');
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name']);

	scanned_code: string = '';
	manual_code: string = '';
	item_info: ItemInfo | null = null;
	stock_info: ItemStockInfo | null = null;
	not_found: boolean = false;

	store_id: number | null = null;
	store_list: Store[] = [];
	can_choose_store: boolean = false;

	quantity: number = 1;
	is_saving: boolean = false;

	active_stocktakes: Stocktake[] = [];
	selected_stocktake_id: number | null = null;
	show_stocktake_modal: boolean = false;

	stock_per_store: CStockPerStore[] = [];
	show_stock_modal: boolean = false;

	stock_alert: Stock_Alert | null = null;
	alert_min: number | null = null;
	alert_max: number | null = null;
	show_alert_modal: boolean = false;

	serial_input: string = '';

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit()
	{
		this.setTitle('Escáner de Códigos');
		this.path = '/scanner';

		this.store_id = this.rest.user?.store_id ?? null;
		this.can_choose_store = this.rest.user_permission.global_add_stock > 0;

		if( this.can_choose_store )
		{
			this.subs.sink = this.rest_store.getAll().subscribe({
				next: (response)=> { this.store_list = response.data; },
				error: (error)=> this.showError(error)
			});
		}

		this.loadActiveStocktakes();
	}

	get current_stock(): number
	{
		if( this.stock_info )
		{
			if( this.store_id != null )
			{
				let record = this.stock_info.records.find((sr)=> sr.store_id == this.store_id);
				if( record )
					return record.qty;
			}

			if( typeof this.stock_info.total === 'number' )
				return this.stock_info.total;
		}

		return 0;
	}

	loadActiveStocktakes()
	{
		this.subs.sink = this.rest_stocktake.search({
			eq: { status: 'ACTIVE' },
			limit: 9999,
			sort_order: ['created_DESC']
		}).subscribe({
			next: (response)=>
			{
				this.active_stocktakes = response.data;

				if( this.store_id != null && this.rest.user_permission.view_global_stocktake <= 0 )
				{
					this.active_stocktakes = this.active_stocktakes.filter((s)=> s.store_id == this.store_id);
				}
			},
			error: (error)=> this.showError(error)
		});
	}

	onStoreChange(store_id: number | null)
	{
		this.store_id = store_id;
		this.item_info = null;
		this.stock_info = null;
		this.stock_alert = null;
	}

	onCodeDetected(codes: CodeValue[])
	{
		if( !codes.length )
			return;

		this.lookupItem(codes[0].rawValue.trim());
	}

	manualSubmit()
	{
		if( this.manual_code.trim() )
		{
			this.lookupItem(this.manual_code.trim());
			this.manual_code = '';
		}
	}

	resetItem()
	{
		this.item_info = null;
		this.stock_info = null;
		this.not_found = false;
		this.scanned_code = '';
		this.stock_alert = null;
	}

	lookupItem(code: string)
	{
		if( !code )
			return;

		this.scanned_code = code;
		this.item_info = null;
		this.stock_info = null;
		this.stock_alert = null;
		this.not_found = false;
		this.quantity = 1;

		this.subs.sink = this.rest_item_info.search({
			search_extra: { category_name: code, status: 'ACTIVE' }
		} as any).subscribe({
			next: (response)=>
			{
				let matches = response.data;
				let item_info = matches.find((ii)=> ii.item.code && ii.item.code.toLowerCase() == code.toLowerCase())
					|| matches.find((ii)=> ii.item.name && ii.item.name.toLowerCase() == code.toLowerCase())
					|| (matches.length == 1 ? matches[0] : undefined);

				if( item_info )
				{
					this.item_info = item_info;
					this.loadStockInfo(item_info);
				}
				else
				{
					this.not_found = true;
				}
			},
			error: (error)=> this.showError(error)
		});
	}

	loadStockInfo(item_info: ItemInfo)
	{
		this.subs.sink = this.rest_stock.get(item_info.item.id).subscribe({
			next: (stock_info)=>
			{
				this.stock_info = stock_info;
				this.loadStockAlert();
			},
			error: (error)=> this.showError(error)
		});
	}

	addStock()
	{
		this.createMovement('POSITIVE', 'Agregado desde escáner');
	}

	removeStock()
	{
		this.createMovement('NEGATIVE', 'Eliminado desde escáner');
	}

	createMovement(movement_type: 'POSITIVE' | 'NEGATIVE', description: string)
	{
		if( !this.item_info || !this.store_id )
		{
			this.showWarning('Selecciona una sucursal');
			return;
		}

		if( this.quantity <= 0 )
		{
			this.showWarning('La cantidad debe ser mayor a cero');
			return;
		}

		let current_qty = this.current_stock;

		if( movement_type == 'NEGATIVE' && this.quantity > current_qty && !this.rest.preferences?.stock_negative_values_allowed )
		{
			this.showWarning('No hay suficiente stock para eliminar');
			return;
		}

		let new_qty = movement_type == 'POSITIVE' ? current_qty + this.quantity : current_qty - this.quantity;

		let stock_record: Partial<Stock_Record> = {
			store_id: this.store_id,
			item_id: this.item_info.item.id,
			movement_type,
			movement_qty: this.quantity,
			previous_qty: current_qty,
			qty: new_qty,
			description,
			created_by_user_id: this.rest.user?.id ?? null,
			updated_by_user_id: this.rest.user?.id ?? null
		};

		this.is_saving = true;
		this.subs.sink = this.rest_stock_record.create(stock_record).subscribe({
			next: ()=>
			{
				this.is_saving = false;
				this.showSuccess(movement_type == 'POSITIVE' ? 'Stock agregado correctamente' : 'Stock eliminado correctamente');
				this.loadStockInfo(this.item_info as ItemInfo);
			},
			error: (error)=>
			{
				this.is_saving = false;
				this.showError(error);
			}
		});
	}

	openStocktakeModal()
	{
		if( this.active_stocktakes.length == 0 )
		{
			this.showWarning('No hay tomas de inventario activas para esta sucursal');
			return;
		}

		this.selected_stocktake_id = this.active_stocktakes.some((s)=> s.id == this.selected_stocktake_id)
			? this.selected_stocktake_id
			: this.active_stocktakes[0].id;

		this.show_stocktake_modal = true;
	}

	onStocktakeChange(stocktake_id: number | null)
	{
		this.selected_stocktake_id = stocktake_id;
	}

	doStockTake()
	{
		if( !this.item_info || !this.selected_stocktake_id )
		{
			this.showWarning('Selecciona una toma de inventario');
			return;
		}

		if( this.quantity <= 0 )
		{
			this.showWarning('La cantidad debe ser mayor a cero');
			return;
		}

		this.is_saving = true;

		let scan: Partial<Stocktake_Scan> = {
			stocktake_id: this.selected_stocktake_id,
			item_id: this.item_info.item.id,
			qty: this.quantity,
			pallet_id: null,
			box_id: null,
			box_content_id: null,
			created_by_user_id: this.rest.user?.id ?? null,
			updated_by_user_id: this.rest.user?.id ?? null
		};

		this.subs.sink = this.rest_stocktake_scan.create(scan).pipe(
			mergeMap(()=> this.upsertStocktakeItem(this.selected_stocktake_id as number, this.quantity))
		).subscribe({
			next: ()=>
			{
				this.is_saving = false;
				this.show_stocktake_modal = false;
				this.showSuccess('Cantidad registrada en la toma de inventario');
			},
			error: (error)=>
			{
				this.is_saving = false;
				this.showError(error);
			}
		});
	}

	upsertStocktakeItem(stocktake_id: number, counted_qty: number)
	{
		return this.rest_stocktake_item.search({
			eq: { stocktake_id, item_id: (this.item_info as ItemInfo).item.id },
			limit: 1
		}).pipe(
			mergeMap((response)=>
			{
				let existing = response.data[0];

				if( existing )
				{
					existing.real_qty += counted_qty;
					existing.updated_by_user_id = this.rest.user?.id ?? null;
					return this.rest_stocktake_item.update(existing);
				}

				let stocktake_item: Partial<Stocktake_Item> = {
					stocktake_id,
					item_id: (this.item_info as ItemInfo).item.id,
					box_id: null,
					box_content_id: null,
					pallet_id: null,
					db_qty: this.current_stock,
					real_qty: counted_qty,
					created_by_user_id: this.rest.user?.id ?? null,
					updated_by_user_id: this.rest.user?.id ?? null
				};

				return this.rest_stocktake_item.create(stocktake_item);
			})
		);
	}

	viewMovements()
	{
		if( !this.item_info )
			return;

		this.router.navigate(['/item-movement-report'], {
			queryParams: {
				'eq.item_id': this.item_info.item.id,
				'eq.store_id': this.store_id ?? undefined
			}
		});
	}

	showStockInAllStores()
	{
		if( !this.stock_info )
			return;

		let by_store: Record<number, number> = {};

		for(let sr of this.stock_info.records)
		{
			by_store[sr.store_id] = sr.qty;
		}

		this.stock_per_store = Object.keys(by_store).map((k)=>
		{
			let store_id = parseInt(k);
			let store = this.store_list.find((s)=> s.id == store_id);
			return {
				store_id,
				store_name: store?.name || ('Sucursal #' + store_id),
				total: by_store[store_id]
			};
		});

		this.show_stock_modal = true;
	}

	loadStockAlert()
	{
		if( !this.item_info || !this.store_id )
		{
			this.stock_alert = null;
			this.alert_min = null;
			this.alert_max = null;
			return;
		}

		this.subs.sink = this.rest_stock_alert.search({
			eq: { item_id: this.item_info.item.id, store_id: this.store_id },
			limit: 1
		}).subscribe({
			next: (response)=>
			{
				this.stock_alert = response.data[0] || null;
				this.alert_min = this.stock_alert?.min ?? null;
				this.alert_max = this.stock_alert?.max ?? null;
			},
			error: (error)=> this.showError(error)
		});
	}

	saveStockAlert()
	{
		if( !this.item_info || !this.store_id )
		{
			this.showWarning('Selecciona una sucursal');
			return;
		}

		this.is_saving = true;

		let payload: Partial<Stock_Alert> = {
			item_id: this.item_info.item.id,
			store_id: this.store_id,
			min: this.alert_min,
			max: this.alert_max,
			created_by_user_id: this.rest.user?.id ?? null,
			updated_by_user_id: this.rest.user?.id ?? null
		};

		let obs = this.stock_alert
			? this.rest_stock_alert.update({ ...payload, id: this.stock_alert.id })
			: this.rest_stock_alert.create(payload);

		this.subs.sink = obs.subscribe({
			next: ()=>
			{
				this.is_saving = false;
				this.show_alert_modal = false;
				this.showSuccess('Alerta de stock guardada');
				this.loadStockAlert();
			},
			error: (error)=>
			{
				this.is_saving = false;
				this.showError(error);
			}
		});
	}

	addSerial()
	{
		if( !this.item_info || !this.store_id || !this.serial_input.trim() )
		{
			this.showWarning('Ingresa un número de serie');
			return;
		}

		this.is_saving = true;

		let serial: Partial<Serial> = {
			serial_number: this.serial_input.trim(),
			item_id: this.item_info.item.id,
			store_id: this.store_id,
			available_status: 'AVAILABLE',
			status: 'ACTIVE',
			additional_data: null,
			description: null,
			last_order_id: null,
			last_reservation_id: null,
			created_by_user_id: this.rest.user?.id ?? null,
			updated_by_user_id: this.rest.user?.id ?? null
		};

		this.subs.sink = this.rest_serial.create(serial).subscribe({
			next: ()=>
			{
				this.is_saving = false;
				this.serial_input = '';
				this.showSuccess('Serial agregado');
			},
			error: (error)=>
			{
				this.is_saving = false;
				this.showError(error);
			}
		});
	}
}
