import { Component, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { CodeReaderComponent, CodeValue } from '../../modules/shared/code-reader/code-reader.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { ItemInfo, ItemStockInfo } from '../../modules/shared/Models';
import { Batch_Record, Item, Serial, Stock_Alert, Stock_Record, Stocktake, Stocktake_Item, Store } from '../../modules/shared/RestModels';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';

interface CStockPerStore
{
	store_id: number;
	store_name: string;
	total: number;
}

interface StocktakeBatchRow
{
	batch: string;
	expiration_date: string | null;
	db_qty: number;
	real_qty: number;
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
	rest_stocktake_item: RestSimple<Stocktake_Item> = this.rest.initRestSimple('stocktake_item_info');
	rest_batch_record: RestSimple<Batch_Record> = this.rest.initRestSimple('batch_record');
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
	stocktake_batch_rows: StocktakeBatchRow[] = [];

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
			created_by_user_id: this.rest.user?.id,
			updated_by_user_id: this.rest.user?.id
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

	get stocktake_confirm_mode(): boolean
	{
		return this.rest.user_permission?.shipping_receive_type === 'VALIDATE';
	}

	requiresBatch(item: Item): boolean
	{
		return !!item && item.batch_option !== 'NONE';
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

		this.stocktake_batch_rows = [];

		if( this.item_info && this.requiresBatch(this.item_info.item) )
		{
			if( this.stocktake_confirm_mode )
			{
				this.loadCurrentBatches();
			}
			else
			{
				this.stocktake_batch_rows.push(this.newStocktakeBatchRow());
			}
		}

		this.show_stocktake_modal = true;
	}

	loadCurrentBatches()
	{
		let item_info = this.item_info;

		if( !item_info || !this.store_id )
		{
			this.stocktake_batch_rows.push(this.newStocktakeBatchRow());
			return;
		}

		this.subs.sink = this.rest_batch_record.search({
			eq: {
				item_id: item_info.item.id,
				store_id: this.store_id,
				is_current: 1
			},
			gt: { qty: 0 },
			limit: 9999,
			sort_order: ['expiration_date_ASC']
		}).subscribe({
			next: (response)=>
			{
				this.stocktake_batch_rows = response.data.map((br)=>
				{
					return {
						batch: br.batch || '',
						expiration_date: br.expiration_date,
						db_qty: br.qty,
						real_qty: 0
					};
				});

				if( this.stocktake_batch_rows.length == 0 )
				{
					this.stocktake_batch_rows.push(this.newStocktakeBatchRow());
				}
			},
			error: (error)=> this.showError(error)
		});
	}

	newStocktakeBatchRow(): StocktakeBatchRow
	{
		return {
			batch: '',
			expiration_date: null,
			db_qty: 0,
			real_qty: 0
		};
	}

	addStocktakeBatchRow()
	{
		this.stocktake_batch_rows.push(this.newStocktakeBatchRow());
	}

	removeStocktakeBatchRow(index: number)
	{
		this.stocktake_batch_rows.splice(index, 1);
	}

	getStocktakeBatchTotal(): number
	{
		return this.stocktake_batch_rows.reduce((sum, row)=> sum + (Number(row.real_qty) || 0), 0);
	}

	isStocktakeBatchValid(): boolean
	{
		if( !this.item_info )
			return false;

		let item = this.item_info.item;

		if( Math.abs(this.getStocktakeBatchTotal() - this.quantity) > 0.0001 )
			return false;

		const is_batch_only = item.batch_option === 'BATCH_ONLY';
		const is_exp_only = item.batch_option === 'EXPIRATION_ONLY';
		const is_both = item.batch_option === 'BATCH_AND_EXPIRATION';

		for( let row of this.stocktake_batch_rows )
		{
			if( (is_batch_only || is_both) && !(row.batch || '').trim() )
				return false;

			if( (is_exp_only || is_both) && !row.expiration_date )
				return false;
		}

		return true;
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

		if( this.requiresBatch(this.item_info.item) && !this.isStocktakeBatchValid() )
		{
			this.showWarning('Revisa los lotes: la suma de contado debe ser igual a la cantidad y los lotes/caducidades deben estar completos');
			return;
		}

		this.is_saving = true;

		let stocktake_id = this.selected_stocktake_id as number;
		let item_id = this.item_info.item.id;

		let payload: any = {
			stocktake_id,
			item_id,
			created_by_user_id: this.rest.user?.id ?? null,
			updated_by_user_id: this.rest.user?.id ?? null
		};

		if( this.requiresBatch(this.item_info.item) )
		{
			payload.batches = this.stocktake_batch_rows
				.filter((row)=> Number(row.real_qty) > 0)
				.map((row)=>
				{
					let batch = (row.batch || '').trim() || null;
					return {
						batch,
						expiration_date: row.expiration_date,
						db_qty: this.getBatchDbQty(batch, row.expiration_date),
						real_qty: Number(row.real_qty)
					};
				});
		}
		else
		{
			payload.real_qty = this.quantity;
		}

		this.subs.sink = this.rest_stocktake_item.create(payload).subscribe({
			next: ()=>
			{
				this.is_saving = false;
				this.show_stocktake_modal = false;
				this.stocktake_batch_rows = [];
				this.showSuccess('Cantidad registrada en la toma de inventario');
			},
			error: (error)=>
			{
				this.is_saving = false;
				this.showError(error);
			}
		});
	}

	getBatchDbQty(batch: string | null, expiration_date: string | null): number
	{
		let row = this.stocktake_batch_rows.find((r)=> r.batch === batch && r.expiration_date === expiration_date);
		return row ? row.db_qty : 0;
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
			created_by_user_id: this.rest.user?.id,
			updated_by_user_id: this.rest.user?.id
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
