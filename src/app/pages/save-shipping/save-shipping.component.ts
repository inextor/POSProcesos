import { Component, Pipe } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Item, ItemInfo, ItemStockInfo, Production, Requisition, Requisition_Item, Serial, SerialInfo, SerialItemInfo, Shipping, Stock_Record, Store } from '../../modules/shared/RestModels';
import { RequisitionInfo, RequisitionItemInfo, ShippingInfo, ShippingItemInfo } from '../../modules/shared/Models';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { forkJoin, from, mergeMap, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { SearchItemsComponent } from "../../components/search-items/search-items.component";
import { Utils } from '../../modules/shared/Utils';

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
		imports: [CommonModule, RouterModule, FormsModule, SearchItemsComponent]
})
export class SaveShippingComponent extends BaseComponent
{
	//PENDIENTE: REFACTORIZAR

	rest_requisition_info:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_shipping_info:Rest<Shipping,ShippingInfo> = this.rest.initRest('shipping_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);
	rest_store:Rest<Store,Store> = this.rest.initRest('store');
	rest_item_stock:Rest<Item, ItemStockInfo> = this.rest.initRest('stock_by_item');
	rest_serial_info:Rest<Serial,SerialInfo> = this.rest.initRest('serial_info');
	rest_category:Rest<Category,Category> = this.rest.initRest('category');
	crequisition_info: CRequisitionInfo | null = null;
	to_store:Store | null = null;
	from_store:Store | null = null;

	requisition_info:RequisitionInfo | null = null;
	item_list:ItemStockInfo[] = [];
	serial_search:string = '';
	qty_by_item_id:Record<number,number> = {};
	fecha_requisitions:string = '';

	serial_list:SerialItemInfo[] = [];
	tmp_serial_list: SerialItemInfo[] = [];
	show_serial_numbers: boolean = false;
	shipping_info:ShippingInfo = GetEmpty.shipping_info();
	
	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.subscribe( params =>
		{
			this.is_loading = true;
			let to_store_id = parseInt(params.get('store_id') || '');
			let from_store_id = Number(this.rest.user?.store_id || '');
			//se usara un segundo parametro para obtener informacion del envio (en caso de que ya haya sido creado)
			let shipping_id = params.has('shipping_id') ? parseInt(params.get('shipping_id') ?? '') : null;
			
			let start = new Date();
			let end = new Date();
			start.setHours(0,0,0,0);
			end.setHours(23,59,59);

			this.fecha_requisitions = Utils.getLocalMysqlStringFromDate(start).split(' ')[0];

			let empty:ShippingInfo = {
				shipping: {
					from_store_id: from_store_id,
					to_store_id: to_store_id,
				},
				items: [],
			};

			//obteniendo informacion de tienda, categorias (para construir los CItems), y las requisiciones_info
			//las requisiciones seran las que sean requeridas a la tienda del usuario y requeridas por la tienda de los parametros
			//traer tambien las producciones, solo que tendremos que traer los de los items de las requisiciones
			this.subs.sink = forkJoin
			({
				shipping_info: shipping_id != 0 ? this.rest_shipping_info.get(shipping_id) : of( empty ),
				to_store : this.rest_store.get(to_store_id),
				from_store: this.rest_store.get(from_store_id),
				category: this.rest_category.search({limit:99999,sort_order:['name_ASC']}),
				requisitions: this.rest_requisition_info.search({eq:{required_by_store_id: to_store_id, requested_to_store_id: from_store_id, status: 'PENDING'}, ge:{required_by_timestamp:Utils.getUTCMysqlStringFromDate(start)}, le: {required_by_timestamp: Utils.getUTCMysqlStringFromDate(end)} ,limit:9999})
			})
			.pipe
			(
				//las requisitions ya tienen todas las requisition_items de todas las requisiciones
				//ahora hay que traer las producciones, asi que haremos un un arreglo de ids de los items de las requisiciones
				mergeMap((response)=>
				{
					let ids:number[] = []
					//comprobar que existan requisiciones, recordando que podemos hacer envios sin requisiciones
					if( response.requisitions.total != 0 )
					{
						ids = response.requisitions.data.map((r)=>r.items.map((ri)=>ri.item.id)).flat();
					}
					//tambien necesitamos el stock de los items en la sucursal de produccion
					//podemos sacarlo con los mismos ids
					//por lo pronto no se adjuntara la cantidad de enviados, o se podria, pero habria mucha inconsistencia de datos si hay mas personas trabajando en el
					//tendran que ser todos los enviados previamente, despues de todo esto es solo para tener una nocion, no tendra nada que ver en el shipping_item
					return forkJoin
					({
						shipping_info: of( response.shipping_info ),
						to_store: of( response.to_store),
						from_store: of( response.from_store ),
						category: of( response.category ),
						shippings: ids.length > 0 ? this.rest_shipping_info.search({ csv:{ids}, eq:{from_store_id: Number(response.from_store.id), to_store_id: Number(response.to_store.id), date: this.fecha_requisitions },limit:9999}) : of( null ),
						requisitions: ids.length > 0 ? of( response.requisitions ) : of( null ),
						production: ids.length > 0 ? this.rest_production.search({csv:{id:ids}}) : of( null ),
						item_stock: ids.length > 0 ? this.rest_item_stock.search({search_extra:{store_id: this.rest.user?.store_id as number},csv:{id:ids}}) : of( null ),
					})
				}),
				mergeMap((response)=>
				{
					//se empieza a construir el crquisition info si es que se encontraron requisiciones
					if( response.requisitions )
					{
						let requisitions_info_list = response.requisitions.data;

						//obtener en un solo arreglo todos los requisition_items
						let tmp_ri = requisitions_info_list?.map((r)=>r.items).flat();
						//let ri = requisitions_info_list?.map((r)=>r.items).flat();

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

						//se construye el crquisition_info
						this.initializeCRequisitionInfo(ri, shippings, item_stock_list, productions_list, response.to_store);
						console.log('requisitions found')
					}

					return forkJoin
					({
						category: of( response.category ),
						to_store: of( response.to_store ),
						from_store: of( response.from_store ),
						shipping_info: of( response.shipping_info ),
					});
				})
			)
			.subscribe
			({
				next: (responses)=>
				{
					this.to_store = responses.to_store;
					this.from_store = responses.from_store;

					this.shipping_info = responses?.shipping_info ?? GetEmpty.shipping_info();

					console.log('shipping_info', this.shipping_info);
					this.is_loading = false;
				},
				error: (error)=>
				{
					this.showError(error);
					this.is_loading = false;
				}
			});
		});
	}

	initializeCRequisitionInfo(requisition_items_info:RequisitionInfo['items'], shipping_info_list:ShippingInfo[] = [], item_stock_info_list:ItemStockInfo[] = [], production_list:Production[] = [], required_by_store:Store)
	{

		// let filtered_items = requisition_items_info?.reduce((p, c)=>
		// {
		//	let index = p.findIndex((x)=>x.item.id == c.item.id);
		//	if( index == -1 )
		//	{
		//		p.push(c);
		//	}
		//	else
		//	{
		//		p[index].requisition_item.qty += c.requisition_item.qty;
		//	}
		//	return p;
		// }, [] as RequisitionItemInfo[]);

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
	}

	//vuelve a buscar las requisiciones para volver a inicializar el crequisition_info
	onFechaRequisitionsChange(fecha: string)
	{
		let start = new Date(fecha + 'T00:00:00');
		let end = new Date(fecha + 'T23:59:59');
		
		//solving null for to_store
		let to_store_id = this.to_store?.id || 0;

		this.subs.sink = forkJoin({
			requisitions: this.rest_requisition_info.search({eq:{required_by_store_id: to_store_id, requested_to_store_id: this.from_store?.id, status: 'PENDING'}, ge:{required_by_timestamp:Utils.getUTCMysqlStringFromDate(start)}, le: {required_by_timestamp: Utils.getUTCMysqlStringFromDate(end)} ,limit:9999})
		}).pipe
		(
			mergeMap((response)=>
			{
				let ids:number[] = []
			
				if( response.requisitions.total != 0 )
				{
					ids = response.requisitions.data.map((r)=>r.items.map((ri)=>ri.item.id)).flat();
				}

				return forkJoin
				({
					shippings: ids.length > 0 ? this.rest_shipping_info.search({ csv:{ids}, eq:{from_store_id: Number(this.from_store?.id), to_store_id: Number(this.to_store?.id), date: this.fecha_requisitions },limit:9999}) : of( null ),
					requisitions: ids.length > 0 ? of( response.requisitions ) : of( null ),
					production: ids.length > 0 ? this.rest_production.search({csv:{id:ids}}) : of( null ),
					item_stock: ids.length > 0 ? this.rest_item_stock.search({search_extra:{store_id: this.rest.user?.store_id as number},csv:{id:ids}}) : of( null ),
				})
			})

		).subscribe({
			next: (response)=>
			{
				this.is_loading = false;
				
				if( response.requisitions && this.to_store )
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

					this.initializeCRequisitionInfo(ri, shippings, item_stock_list, productions_list, this.to_store);
					console.log('requisitions found')
				}
				else
				{
					this.crequisition_info = null;
				}
			},
			error: (error)=>
			{
				this.showError(error);
				this.is_loading = false;
			}
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
