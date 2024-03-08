import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Item, ItemInfo, ItemStockInfo, Production, Requisition, Serial, SerialInfo, SerialItemInfo, Shipping, Stock_Record, Store } from '../../modules/shared/RestModels';
import { RequisitionInfo, ShippingInfo, ShippingItemInfo } from '../../modules/shared/Models';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { SearchItemsComponent } from "../../components/search-items/search-items.component";

interface CItem
{
	item_info: ItemInfo;
	category: Category | null;
	required: number;
	shipped: number;
	to_ship_qty:number;
	stock: number;
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
    imports: [CommonModule, RouterModule, FormsModule, SearchItemsComponent]
})
export class SaveShippingComponent extends BaseComponent
{

	rest_requisition_info:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_shipping_info:Rest<Shipping,ShippingInfo> = this.rest.initRest('shipping_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);
	rest_store:Rest<Store,Store> = this.rest.initRest('store');
	rest_item_stock:Rest<Item, ItemStockInfo> = this.rest.initRest('stock_by_item');
	rest_serial_info:Rest<Serial,SerialInfo> = this.rest.initRest('serial_info');
	rest_category:Rest<Category,Category> = this.rest.initRest('category');
	crequisition_info: CRequisitionInfo | null = null;

	from_store_name:string | null = null;
	to_store_name:string | null = null;
	from_store_id:number | string = '';
	to_store_id:number | string = '';
	store_list:Store[] = [];
	category_dictionary:Record<number,Category> = {};
	requisition_info:RequisitionInfo | null = null;
	item_list:ItemStockInfo[] = [];
	serial_search:string = '';
	qty_by_item_id:Record<number,number> = {};

	serial_list:SerialItemInfo[] = [];
	tmp_serial_list: SerialItemInfo[] = [];
	show_serial_numbers: boolean = false;
	shipping_info:ShippingInfo = GetEmpty.shipping_info();
	//WARNING: PENDIENTE REESTRUCTURAR EL FLUJO Y MODELO DE ENVIOS PARA EL CORRECTO FUNCIONAMIENTO DE ESTE COMPONENTE

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.subscribe( params =>
		{
			//this.company = this.rest.getCompanyFromSession();
			this.is_loading = true;

			let empty:ShippingInfo = {
				shipping: {
					from_store_id: this.rest.user?.store_id || null,
					to_store_id: null,
				},
				items: [],
			};
			//obteniendo envio en caso de edicion
			this.subs.sink = forkJoin
			({
				shipping_info : params.has('requisition_id') ? this.rest_shipping_info.get( params.get('requisition_id')): of( this.shipping_info ),
				store : this.rest_store.search({limit:9999}),
				category: this.rest_category.search({limit:99999,sort_order:['name_ASC']})
			})
			.pipe
			(
				//obteniendo requisicion, asignando valores a envio en caso de nuevo envio
				mergeMap((response)=>
				{
					console.log('response shipping_info',response.shipping_info);
					this.from_store_id = '';
					this.to_store_id = '';

					//let requisition_id = params.has('requisition_id') ? parseInt(params.get('requisition_id') ?? '') : 0;
					let requisition_id = response.shipping_info.shipping?.requisition_id;
					console.log('requisition id',requisition_id);
					//si no hay requisicion, no se hace nada
					//en teoria siempre deberia haber requisicion desde este sistema?

					if( response.shipping_info.shipping?.requisition_id )
						requisition_id = response.shipping_info.shipping?.requisition_id;

					response.shipping_info.shipping.requisition_id = requisition_id;
					response.shipping_info.shipping.date = new Date().toISOString().split('T')[0];

					//se obtienen los envios para conocer el total de lo enviado por cada item (ya que pueden ser varios envio desde una sola requisicion)
					//se obtienen las producciones para conocer el total producido por cada item
					return forkJoin
					({
						shipping_info: of( response.shipping_info ),
						store: of( response.store),
						category: of( response.category ),
						requisition: requisition_id ? this.rest_requisition_info.get(requisition_id) : of( null ),
						shippings: this.rest_shipping_info.search({eq:{requisition_id},limit:9999}),
						production: this.rest_production.search
						({
							ge:{created:new Date()},
							limit:9999
						})
					})
				}),
				mergeMap((response)=>
				{

					let ids = response.requisition?.items.map((rii)=>rii.item.id) || [];
					//esto es solo para agregar el stock de los items en la sucursal de produccion
					return forkJoin
					({
						shipping_info: of( response.shipping_info ),
						store: of( response.store),
						category: of( response.category ),
						requisition: of( response.requisition ),
						shippings: of( response.shippings ),
						production: of( response.production ),
						item_stock: this.rest_item_stock.search
						({
							search_extra: { store_id: this.rest.user?.store_id as number},
							csv: { id: ids }
						})
					})
				}),
				mergeMap((response)=>
				{
					//se empieza a construir el crquisition info

					let ri = response.requisition;
					let shippings = response.shippings.data;
					let item_stock_list = response.item_stock.data;
					let productions_list = response.production.data;

					if( ri == null )
					{
						this.showError('No se encontro la requisicion');
						return of( null );
					}
					//items de la requisicion
					let citems:CItem[] = ri.items.map((rii)=>
					{ 
						let item_stock_info = item_stock_list.find((x)=>x.item.id == rii.item.id);
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

						};

						let required = rii.requisition_item.qty;
						let shipped = shippings.reduce((p, si) => {
							let items = si.items.filter((x) => x.item?.id == rii.item.id);
							return p + items.reduce((prev_c, item) => prev_c + (item.shipping_item?.qty ?? 0), 0);
						}, 0);

						let productions = productions_list.filter(p => p.item_id = rii.item.id);

						let produced = productions.reduce((p, c) => p + c.qty, 0);
						let to_ship_qty = 0;
						let stock = item_stock_list.find((x) => x.item.id == rii.item.id)?.total || 0;

						return {
							item_info, category: rii.category, required, shipped, produced, to_ship_qty, stock: stock
						};
					});
					//se obtiene el total requerido y enviado
					let required	= citems.reduce((p,citem)=>p+citem.required,0);
					let shipped		= citems.reduce((p,citem)=>p+citem.shipped,0);
					let required_by_store	= ri.required_by_store;

					return forkJoin
					({
						category: of( response.category ),
						store: of( response.store ),
						shipping_info: of( response.shipping_info ),
						requisition: of( ri ),
						shippings: of( shippings ),
						citems: of( citems ),
						required: of( required ),
						shipped: of( shipped ),
						required_by_store: of( required_by_store )
					});
				})
			)
			.subscribe
			({
				next: (responses)=>
				{
					if( responses == null )
					{
						this.showError('No se encontro la requisicion');
						return;
					}
						
					this.is_loading = false;
					responses?.category.data.forEach(c=>this.category_dictionary[c.id]=c);
					this.store_list = responses?.store.data ?? [];
					this.shipping_info = responses?.shipping_info ?? GetEmpty.shipping_info(); ;

					this.requisition_info = responses?.requisition ?? null;

					this.to_store_name = this.requisition_info?.required_by_store.name || null;
					this.from_store_name = this.store_list.find((s) => s.id == this.rest.user?.store_id)?.name || null;

					this.from_store_id = this.shipping_info.shipping.from_store_id || '';
					this.to_store_id = this.shipping_info.shipping.to_store_id || '';

					if (!this.from_store_id) {
						this.from_store_id = this.requisition_info?.requisition?.requested_to_store_id || '';
						this.shipping_info.shipping.from_store_id = this.requisition_info?.requisition.requested_to_store_id || null;
					}

					if(!this.to_store_id)
					{
						this.to_store_id = this.requisition_info?.requisition.required_by_store_id || '';
						this.shipping_info.shipping.to_store_id = this.requisition_info?.requisition.required_by_store_id || null;
					}

					//x
					this.requisition_info = responses?.requisition ?? null;

					this.crequisition_info = {
						...responses?.requisition,
						required_by_store: responses?.required_by_store,
						shippings: responses?.shippings,
						citems: responses?.citems,
						required: responses?.required,
						shipped: responses?.shipped
					};

					console.log('shipping_info', this.shipping_info);
				},
				error: (error)=> 
				{
					this.showError(error);
					this.is_loading = false;
				}
			});
		});
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
				if( stock_record.store_id == this.shipping_info.shipping.from_store_id )
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

	saveShipping(_evt:any)
	{
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

		this.is_loading = true;

		if( this.shipping_info.shipping?.id	)
		{
			this.shipping_info.shipping.received_by_user_id = this.rest.user?.id;
			this.subs.sink	= this.rest_shipping_info.update( this.shipping_info )
			.subscribe({
				next: (response) =>
				{
					this.is_loading = false;
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
			this.subs.sink	= this.rest_shipping_info.create( this.shipping_info )
			.subscribe({
				next: (response)=>
				{
					this.is_loading = false;
					this.showSuccess('El traspaso se guardo exitosamente');
					this.router.navigate(['/list-shipping']);
				},
				error: (error)=>
				{
					this.showError(error)
				}
			});
		}
	}

	onItemSelected(item_info:ItemInfo):void
	{
		if( item_info.item.has_serial_number == 'NO' )
		{
			this.addShippingItem(item_info);
			return;
		}

		if( !this.shipping_info.shipping.from_store_id )
		{
			this.showError('Por favor selecciona la sucursal origen para poder enviar Articulos con numeros de serie');
			return
		}

		let search_obj:SearchObject<Serial> =	this.getEmptySearch();


		search_obj.eq.item_id = item_info.item.id;
		search_obj.eq.store_id = this.shipping_info.shipping.from_store_id;
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
}
