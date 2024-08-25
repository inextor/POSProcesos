import { Component, Pipe } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Item,  Production, Requisition, Requisition_Item, Serial, SerialInfo,Shipping, Stock_Record, Store } from '../../modules/shared/RestModels';
import { ItemInfo, ItemStockInfo, RequisitionInfo, RequisitionItemInfo, ShippingInfo, ShippingItemInfo, SerialItemInfo } from '../../modules/shared/Models';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { filter, forkJoin, from, mergeMap, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { SearchItemsComponent } from "../../components/search-items/search-items.component";
import { Utils } from '../../modules/shared/Utils';
import { LoadingComponent } from '../../components/loading/loading.component';

interface CItem
{
	item_info: ItemInfo;
	category: Category | null;
	required: number;
	shipped: number;
	to_ship_qty:number;
	stock: number;
	display: boolean;
}

interface CRequisitionInfo extends RequisitionInfo
{
	shippings:ShippingInfo[];
	citems:CItem[];
	required:number;
	shipped:number;
	required_by_store:Store;
}

@Component({
		selector: 'app-save-shipping',
		standalone: true,
		templateUrl: './save-shipping.component.html',
		styleUrl: './save-shipping.component.css',
		imports: [CommonModule, RouterModule, FormsModule, SearchItemsComponent, LoadingComponent]
})
export class SaveShippingComponent extends BaseComponent
{
	//PENDING TO TEST

	rest_requisition_info:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_shipping_info:Rest<Shipping,ShippingInfo> = this.rest.initRest('shipping_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);
	rest_store:Rest<Store,Store> = this.rest.initRest('store');
	rest_item_stock:Rest<Item, ItemStockInfo> = this.rest.initRest('stock_by_item');
	rest_serial_info:Rest<Serial,SerialInfo> = this.rest.initRest('serial_info');

	crequisition_info: CRequisitionInfo | null = null;
	requisition_info:RequisitionInfo | null = null;
	item_list:ItemStockInfo[] = [];
	store_list:Store[] = [];

	to_store_id:number | null = 0;
	from_store_id:number = 0;
	fecha_requisitions:string = '';
	shipping_info:ShippingInfo = GetEmpty.shipping_info();

	serial_search:string = '';
	qty_by_item_id:Record<number,number> = {};
	serial_list:SerialItemInfo[] = [];
	tmp_serial_list: SerialItemInfo[] = [];
	show_serial_numbers: boolean = false;

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((params)=>
			{

				this.is_loading = true;
				this.to_store_id = parseInt(params.get('store_id') as string) || null;
				this.from_store_id = parseInt(this.rest.user?.store_id?.toString() || '');
				let shipping_id = params.has('id') ? parseInt(params.get('id') ?? '') : null;
				console.log('shipping_id', shipping_id);
				console.log('to_store_id', this.to_store_id);
				console.log('from_store_id', this.from_store_id);

				let start = new Date();
				let end = new Date();
				start.setHours(0,0,0,0);
				end.setHours(23,59,59);

				this.fecha_requisitions = Utils.getLocalMysqlStringFromDate(start).split(' ')[0];

				let empty:ShippingInfo = {
					shipping: {
						from_store_id: this.from_store_id,
						to_store_id: this.to_store_id,
						date: Utils.getLocalMysqlStringFromDate(start).split(' ')[0],
					},
					items: [],
				};

				let shipping_info_obs = shipping_id
					? this.rest_shipping_info.get(shipping_id)
					: of(empty);

				if (!this.to_store_id)
				{
					return forkJoin
					({
						shipping_info: of( empty ),
						stores: this.rest_store.search({limit:99999}),
					})
				}

				return forkJoin
				({
					stores: this.rest_store.search({limit:99999}),
					shipping_info: shipping_info_obs,
				})
			})
		)
		.subscribe
		({
			next: (responses)=>
			{
				this.shipping_info = responses.shipping_info;
				this.store_list = responses.stores.data;
				if ( this.to_store_id)
				{
					this.requisitionSearch(new Event(''), this.fecha_requisitions, this.to_store_id);
				}
				this.is_loading = false;
			},
			error: (error)=>
			{
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	initializeCRequisitionInfo(requisition_items_info:RequisitionInfo['items'], shipping_info_list:ShippingInfo[] = [], item_stock_info_list:ItemStockInfo[] = [], production_list:Production[] = [], required_by_store:Store)
	{
		let citems:CItem[] = requisition_items_info?.map((rii)=>
		{
			let item_stock_info = item_stock_info_list?.find((x)=>x.item.id == rii.item.id);

			let item_info:ItemInfo = {
                item: rii.item,
                category: rii.category,
                price: item_stock_info?.price || undefined,
                prices: item_stock_info?.prices || [],
                records: item_stock_info?.records || [],
                stock_record: item_stock_info?.stock_record || undefined,
                options: item_stock_info?.options || [],
                exceptions: item_stock_info?.exceptions || [],
                display_category: item_stock_info?.display_category || false,
                serials: item_stock_info?.serials || [],
                item_options: []
            };

			let required = rii.requisition_item.qty;
			let shipped = shipping_info_list?.reduce((p, si) => {
				let items = si.items.filter((x) => x.item?.id == rii.item.id);
				return p + items.reduce((prev_c, item) => prev_c + (item.shipping_item?.qty ?? 0), 0);
			}, 0);

			let productions = production_list?.filter(p => p.item_id = rii.item.id);

			let produced = productions?.reduce((p, c) => p + c.qty, 0);
			let to_ship_qty = 0;
			let stock = item_stock_info_list?.find((x) => x.item.id == rii.item.id)?.total || 0;

			return {
				item_info, category: rii.category, required, shipped, produced, to_ship_qty, stock: stock, display: true
			};
		});

		//se filtran los citems que hayan sido completados
		citems = citems.filter((citem)=>citem.required > citem.shipped);

		let required	= citems.reduce((p,citem)=>p+citem.required,0);
		let shipped		= citems.reduce((p,citem)=>p+citem.shipped,0);

		this.crequisition_info = {
			...this.requisition_info!,
			required_by_store,
			shippings: shipping_info_list,
			citems: citems,
			required: required,
			shipped: shipped
		};
		console.log('crequisition_info', this.crequisition_info);

		//removin those items that have no stock
		this.crequisition_info.citems = this.crequisition_info.citems.filter((citem)=>citem.stock > 0);
	}

	//vuelve a buscar las requisiciones para volver a inicializar el crequisition_info
	requisitionSearch(evt:Event,fecha: string,to_store_id: number | null)
	{
		if( !to_store_id  || !this.from_store_id)
		{
			this.crequisition_info = null;
			return;
		}

		let store = this.store_list.find((s)=>s.id == to_store_id);
		if( !store )
		{
			this.crequisition_info = null;
			this.showError('No se encontro la tienda');
			return;
		}

		this.is_loading = true;
		this.showWarning('Buscando requisiciones...');

		let start = new Date(fecha + 'T00:00:00');
		let end = new Date(fecha + 'T23:59:59');

		this.subs.sink = forkJoin
		({
			item: this.rest_item_stock.search({search_extra:{store_id: this.from_store_id},limit:9999}),
		})
		.pipe
		(
			mergeMap((response)=>
			{
				let ids:number[] = response.item.data.map((i)=>i.item.id);

				let search_requisition:SearchObject<Requisition> = this.getEmptySearch();
				search_requisition.eq.required_by_store_id = to_store_id;
				search_requisition.eq.approved_status = 'APPROVED';
				search_requisition.ge.required_by_timestamp = Utils.getUTCMysqlStringFromDate(start);
				search_requisition.le.required_by_timestamp = Utils.getUTCMysqlStringFromDate(end);
				search_requisition.limit = 9999;

				return forkJoin
				({
					requisitions: ids.length > 0 ? this.rest_requisition_info.search(search_requisition) : of( null ),
					shippings: ids.length > 0 ? this.rest_shipping_info.search({ csv:{ids}, eq:{from_store_id: Number(this.from_store_id), to_store_id: Number(this.to_store_id), date: this.fecha_requisitions },limit:9999}) : of( null ),
					production: ids.length > 0 ? this.rest_production.search({csv:{ids}, limit: 999999}) : of( null ),
					item_stock: ids.length > 0 ? of(response.item) : of( null ),
				})
			})
		)
		.subscribe({
			next: (response)=>
			{
				if( response.requisitions && this.to_store_id )
				{
					let requisitions_info_list = response.requisitions.data;

					let tmp_ri = requisitions_info_list?.map((r)=>r.items).flat();

					let ri_by_item_id = new Map();
					let ri = tmp_ri.filter((ri:RequisitionItemInfo)=>{
						if(ri_by_item_id.has( ri.item.id ) )
						{
							let ri2 = ri_by_item_id.get( ri.requisition_item.item_id );
							ri2.requisition_item.qty += ri.requisition_item.qty;
							return false;
						}
						ri_by_item_id.set(ri.requisition_item.item_id, ri );
						return true;
					});

					let shippings = response.shippings?.data;
					let item_stock_list = response.item_stock?.data;
					let productions_list = response.production?.data;

					//double check??
					if( !store )
					{
						this.showError('No se encontro la tienda');
						return;
					}

					this.initializeCRequisitionInfo(ri, shippings, item_stock_list, productions_list, store);
				}
				else
				{
					this.crequisition_info = null;
				}
				this.is_loading = false;
			},
			error: (error)=>
			{
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	onFromStoreChange(store_id:number)
	{
		if ( store_id )
		{
			//solo se actualiza la tienda de origen de envio
			this.shipping_info.shipping.from_store_id = store_id;
			//las requisiciones se buscan por la tienda de destino
			this.requisitionSearch(new Event(''), this.fecha_requisitions, this.to_store_id);
		}
	}

	onToStoreChange(store_id:number)
	{
		if ( store_id )
		{
			this.shipping_info.shipping.to_store_id = store_id;
			this.requisitionSearch(new Event(''), this.fecha_requisitions, store_id);
		}
	}

	updateValues()
	{
		let counter:Record<number,number> = {};

		this.shipping_info.items.forEach((sii: Partial<ShippingItemInfo>) =>
		{
			if (sii.shipping_item?.item_id)
			{
				if (!(sii.shipping_item.item_id in counter))
				{
					counter[sii.shipping_item.item_id] = 0;
				}
				counter[sii.shipping_item.item_id] = sii.shipping_item.qty ?? 0;
			}
		});

		for(let i in counter)
		{
			this.qty_by_item_id[ i ] = counter[ i ];

		}
	}

	addShippingItem(item_info:ItemInfo, qty:number = 1)
	{
		let shipping_item = this.shipping_info.items.find(i=>i.item?.id == item_info.item.id);

		if( shipping_item !== undefined )
		{
			this.showError('El producto ya esta en la lista');
			return;
		}

		this.subs.sink = this.rest_item_stock.get( item_info.item.id )
		.subscribe((item_stock_info)=>
		{
			this.item_list.push(item_stock_info);

			let available:number = item_info.records.reduce((p,stock_record:Stock_Record)=>
			{
				if( stock_record.store_id == this.from_store_id )
					return stock_record.qty;
				return p;
			},0);

			this.shipping_info.items.push
			({
				item: item_stock_info.item,
				category:item_stock_info.category,
				shipping_item: { item_id: item_stock_info.item.id, qty,serial_number:'' },
				available: available
			});

		})
	}

	removeItem(si:Partial<ShippingItemInfo>)
	{
		let index:number = this.shipping_info.items.findIndex(i=>si==i)

		if( index > -1 )
		{
			this.shipping_info.items.splice(index,1);
		}
	}

	saveShipping(_evt:Event)
	{
		_evt.preventDefault();
		this.is_loading = true;

		let insufficient_stock:boolean = false;

		this.shipping_info?.items.forEach((citem)=>
		{
			if( citem.shipping_item?.qty && citem.shipping_item.qty > (citem.available ?? 0) )
			{
				this.showError('La cantidad a enviar no puede ser mayor al stock o menor a 0 (' + citem.item?.name + ')' );
				insufficient_stock = true;
				return;
			}
		})

		if( insufficient_stock )
		{
			return;
		}

		this.confirmation.showConfirmAlert(this.shipping_info,'Confirmar envío', '¿Desea confirmar el envío?')
		.pipe(filter((response)=>response.accepted))
		.subscribe((response)=>
		{
			if( this.shipping_info.shipping?.id	)
			{
				this.shipping_info.shipping.received_by_user_id = this.rest.user?.id;
				this.subs.sink	= this.rest_shipping_info.update( this.shipping_info )
				.subscribe({
					next: (response) =>
					{
						this.router.navigate(['/list-shipping']);
						this.showSuccess('El envío se actualizo exitosamente');
					},
					error: (error)=>
					{
						this.showError(error)
					}
				});
			}
			else
			{
				this.shipping_info.shipping.created_by_user_id = this.rest.user?.id;
				this.shipping_info.shipping.updated = new Date();
				this.shipping_info.shipping.updated_by_user_id = this.rest.user?.id;
				this.shipping_info.shipping.received_by_user_id = this.rest.user?.id;
				this.shipping_info.shipping.from_store_id = this.from_store_id;
				this.shipping_info.shipping.to_store_id = this.to_store_id;
				console.log('shipping_info', this.shipping_info);
				this.subs.sink	= this.rest_shipping_info.create( this.shipping_info )
				.pipe
				(
					mergeMap((response)=>
					{
						return this.rest.update('markShippingAsSent',{shipping_id:response.shipping.id});
					})
				)
				.subscribe({
					next: (response)=>
					{
						this.showSuccess('El envío se guardo exitosamente');
						this.router.navigate(['/list-shipping']);
					},
					error: (error)=>
					{
						this.showError(error)
					}
				});
			}
		});

		this.is_loading = false;
	}

	onItemSelected(item_info:ItemInfo):void
	{
		if( item_info.item.has_serial_number == 'NO' )
		{
			this.addShippingItem(item_info);
			return;
		}

		if( !this.from_store_id && !this.to_store_id )
		{
			this.showError('Selecciona ambas sucursales antes de agregar productos');
			return
		}

		let search_obj:SearchObject<Serial> =	this.getEmptySearch();


		search_obj.eq.item_id = item_info.item.id;
		search_obj.eq.store_id = this.from_store_id;
		search_obj.eq.status = 'ACTIVE';
		search_obj.limit = 99999999;

		this.subs.sink = this.rest_serial_info.search( search_obj )
		.subscribe((response)=>
		{
			this.serial_list = response.data.map((si)=>
			{
				return {
					serial_info: si,
					item_info: item_info
				};
			});
			this.tmp_serial_list = this.serial_list;

			this.show_serial_numbers = true;
		});
	}

	addRequired(evt: MouseEvent)
	{
		if( !this.crequisition_info )
		{
			this.showError('No hay requisiciones para agregar');
			return;
		}

		if( this.crequisition_info.citems.length == 0 )
		{
			this.showError('No hay productos por agregar');
			return;
		}

		for(let cri of this.crequisition_info.citems)
		{

			if( cri.stock == 0 )
			{
				this.showError('No hay stock de ' + cri.item_info.item.name);
				continue;
			}

			let faltante = cri.required - cri.shipped;
			let qty = faltante > cri.stock ? cri.stock : faltante;

			this.addShippingItem(cri.item_info, qty )
		}
	}
}
