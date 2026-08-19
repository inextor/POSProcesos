import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { SubSink } from 'subsink';
import { ItemInfoService } from '../../modules/shared/services/item-info.service';
import { RestService } from '../../modules/shared/services/rest.service';
import { ItemInfo } from '../../modules/shared/Models';
import { Batch_Record, Stock_Record, Store, Attribute, Item_Attribute } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { ModalComponent } from '../../components/modal/modal.component';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface CStockRow
{
	store_id:number;
	store_name:string;
	qty:number;
	expanded?:boolean;
	batch_records?:Batch_Record[];
	batch_search?:string;
	batch_loading?:boolean;
	search_subject?:Subject<string>;
}

@Component({
	selector: 'app-item-info',
	standalone: true,
	imports: [CommonModule, FormsModule, ModalComponent, LoadingComponent, ShortDatePipe],
	templateUrl: './item-info.component.html',
	styleUrl: './item-info.component.css'
})
export class ItemInfoComponent implements OnDestroy
{
	active_section:string = 'VARIABLES';
	subs:SubSink = new SubSink();

	rest_batch_record:RestSimple<Batch_Record> = this.rest.initRestSimple<Batch_Record>('batch_record');
	rest_store:RestSimple<Store> = this.rest.initRestSimple<Store>('store', ['id', 'name']);
	rest_attribute:RestSimple<Attribute> = this.rest.initRestSimple<Attribute>('attribute');

	store_dictionary:Record<number,string> = {};
	stock_row_map:Record<number,CStockRow> = {};
	private stock_row_map_item_id:number | null = null;
	attribute_dictionary:Record<number,string> = {};

	availability_type_dic:Record<string,string> = {
		'ON_STOCK': 'En inventario',
		'BY_ORDER': 'Bajo pedido',
		'ALWAYS': 'Siempre'
	};

	applicable_tax_dic:Record<string,string> = {
		'DEFAULT': 'Predeterminado',
		'EXEMPT': 'Exento',
		'PERCENT': 'Porcentaje'
	};

	batch_option_dic:Record<string,string> = {
		'NONE': 'Sin lotes',
		'BATCH_ONLY': 'Solo lote',
		'EXPIRATION_ONLY': 'Solo vencimiento',
		'BATCH_AND_EXPIRATION': 'Lote y vencimiento'
	};

	return_action_dic:Record<string,string> = {
		'RETURN_TO_STOCK': 'Regresar a inventario',
		'ADD_TO_MERMA': 'Agregar a merma',
		'TRANSFORM_INTO_ITEM': 'Transformar a producto'
	};

	commission_type_dic:Record<string,string> = {
		'NONE': 'Sin comisión',
		'AMOUNT': 'Monto',
		'PERCENT': 'Porcentaje',
		'RULE_PERCENT': 'Regla de porcentaje'
	};

	yes_no_dic:Record<string,string> = {
		'YES': 'Si',
		'NO': 'No'
	};

	constructor(public item_info_service:ItemInfoService, public rest:RestService)
	{
		this.subs.sink = this.rest_attribute.search({ limit: 9999 }).subscribe({
			next:(response)=>
			{
				response.data.forEach((attribute:Attribute)=>
				{
					this.attribute_dictionary[ attribute.id ] = attribute.name;
				});
			},
			error:()=>{}
		});

		this.subs.sink = this.rest_store.getAll().subscribe({
			next:(response)=>
			{
				response.data.forEach((store:Store)=>
				{
					if( store.id != null )
					{
						this.store_dictionary[ store.id ] = store.name || (''+store.id);
					}
				});
			},
			error:()=>{}
		});
	}

	ngOnDestroy()
	{
		this.subs.unsubscribe();
	}

	get item_info():ItemInfo | null
	{
		return this.item_info_service.item_info;
	}

	showSection(section:string)
	{
		this.active_section = section;
	}

	getItemAttributes():{name:string,value:string}[]
	{
		let attributes = this.item_info?.attributes || [];

		return attributes
			.map((a:Item_Attribute)=>({
				name: this.attribute_dictionary[ a.attribute_id ] || ('Atributo '+a.attribute_id),
				value: a.value
			}))
			.filter(a=>a.value != null && ''+a.value != '');
	}

	getStockRows():CStockRow[]
	{
		let item_info = this.item_info;

		if( !item_info )
		{
			return [];
		}

		let item_id = item_info.item.id;

		if( this.stock_row_map_item_id != item_id )
		{
			this.stock_row_map = {};
			this.stock_row_map_item_id = item_id;
		}

		let last_by_store:Record<number, Stock_Record> = {};

		for(let record of item_info.records)
		{
			let store_id = record.store_id;

			if( record.is_current == 1 || !last_by_store[ store_id ] )
			{
				last_by_store[ store_id ] = record;
			}
		}

		let rows:CStockRow[] = [];

		for(let store_id in last_by_store)
		{
			let record = last_by_store[ store_id ];

			let row = this.stock_row_map[ record.store_id ];

			if( !row )
			{
				row = {
					store_id: record.store_id,
					store_name: this.store_dictionary[ record.store_id ] || ('Sucursal '+record.store_id),
					qty: record.qty
				};
				this.stock_row_map[ record.store_id ] = row;
			}
			else
			{
				row.store_name = this.store_dictionary[ record.store_id ] || ('Sucursal '+record.store_id);
				row.qty = record.qty;
			}

			rows.push( row );
		}

		return rows;
	}

	requiresBatch(item_info:ItemInfo):boolean
	{
		return item_info.item.batch_option !== 'NONE';
	}

	loadBatches(row:CStockRow)
	{
		let item_info = this.item_info;

		if( !item_info )
		{
			return;
		}

		row.expanded = true;
		row.batch_loading = true;

		this.subs.sink = this.rest_batch_record.search({
			eq: {
				item_id: item_info.item.id,
				store_id: row.store_id,
				is_current: 1
			},
			gt: {qty: 0},
			limit: 50,
			sort_order: ['expiration_date_ASC']
		}).subscribe({
			next:(response)=>
			{
				row.batch_records = this.sortBatchesByExpiration( response.data );
				row.batch_loading = false;
			},
			error:(error)=>
			{
				row.batch_records = [];
				row.batch_loading = false;
				this.rest.showError( error );
			}
		});
	}

	toggleBatchRows(row:CStockRow)
	{
		if( row.expanded )
		{
			row.expanded = false;
			return;
		}

		this.loadBatches( row );
	}

	onBatchSearch(row:CStockRow, term:string)
	{
		row.batch_search = term;

		if( !row.search_subject )
		{
			row.search_subject = new Subject<string>();
			row.expanded = true;

			this.subs.sink = row.search_subject.pipe(
				debounceTime(300),
				switchMap((search_term:string)=>
				{
					let item_info = this.item_info;

					if( !item_info )
					{
						return of({total:0,data:[]});
					}

					row.batch_loading = true;

					let lk:Partial<Batch_Record> = {};

					let clean = (search_term || '').trim();

					if( clean )
					{
						lk.batch = clean;
						lk.expiration_date = clean;
					}

					return this.rest_batch_record.search({
						eq: {
							item_id: item_info.item.id,
							store_id: row.store_id,
							is_current: 1
						},
						gt: {qty: 0},
						lk: lk,
						limit: 50,
						sort_order: ['expiration_date_ASC']
					});
				})
			).subscribe({
				next:(response)=>
				{
					row.batch_records = this.sortBatchesByExpiration( response.data );
					row.batch_loading = false;
				},
				error:(error)=>
				{
					row.batch_records = [];
					row.batch_loading = false;
					this.rest.showError( error );
				}
			});
		}

		row.search_subject.next( term );
	}

	clearBatchSearch(row:CStockRow)
	{
		row.batch_search = '';
		row.search_subject?.next( '' );
	}

	sortBatchesByExpiration(batches:Batch_Record[]):Batch_Record[]
	{
		const SIN_CADUCIDAD = '9999-12-31';

		return batches.sort((a,b)=>
			(a.expiration_date || SIN_CADUCIDAD).localeCompare(b.expiration_date || SIN_CADUCIDAD)
			|| a.id - b.id
		);
	}

	close()
	{
		this.item_info_service.close();
	}
}
