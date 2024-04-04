import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Category, Item, Production, Requisition, Shipping, Store } from '../../modules/shared/RestModels';
import { RequisitionInfo, ShippingInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../modules/shared/Utils';


interface CItem
{
	item: Item;
	category: Category | null;
	required: number;
	shipped: number;
}

interface CRequisitionInfo extends RequisitionInfo
{
	shippings:ShippingInfo[];
	citems:CItem[];
	required:number;
	shipped:number;
	required_by_store:Store;
}

interface CRequisitionByStore
{
	store:Store;
	required:number;
	shipped:number;
	pending?:number;
}

@Component({
	selector: 'app-list-shipping',
	standalone: true,
	imports: [CommonModule,RouterModule,FormsModule, BaseComponent],
	templateUrl: './list-shipping.component.html',
	styleUrl: './list-shipping.component.css'
})

export class ListShippingComponent extends BaseComponent
{
	rest_requsition_info:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_shipping_info:Rest<Shipping,ShippingInfo> = this.rest.initRest('shipping_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);
	rest_stores:RestSimple<Store> = this.rest.initRestSimple('store',['id','name']);
	crequisition_info_list: CRequisitionInfo[] = []; //old
	crequisition_by_store_list: CRequisitionByStore[] = [];

	fecha_inicial: string | Date = '';
	fecha_final: string | Date = '';

	shipping_search = this.rest_shipping_info.getEmptySearch();
	requisition_search = this.rest_requsition_info.getEmptySearch();

	total_required = 0;
	total_shipped = 0;
	total_pending = 0;

	ngOnInit()
	{
		this.route.queryParamMap.pipe
		(
			mergeMap((paramMap)=>
			{
				this.path = 'list-shipping';
				this.is_loading = true;

				this.shipping_search.limit = 999999;
				this.shipping_search.eq.from_store_id = this.rest.user?.store_id;

				this.requisition_search.limit = 999999;
				this.requisition_search.eq.status = 'PENDING';
				this.requisition_search.eq.requested_to_store_id = this.rest.user?.store_id;

				if(paramMap.has('ge.date'))
				{
					this.shipping_search.ge.date = paramMap.get('ge.date') as string;
					let start = new Date(paramMap.get('ge.date') as string + 'T00:00:00');
					this.requisition_search.ge.required_by_timestamp = Utils.getUTCMysqlStringFromDate(start);
					this.fecha_inicial = paramMap.get('ge.date') as string;
				}
				else
				{
					let start = new Date();
					start.setHours(0, 0, 0, 0);
					this.fecha_inicial = start.toISOString().split('T')[0];
					this.shipping_search.ge.date = this.fecha_inicial;
					this.requisition_search.ge.required_by_timestamp = Utils.getUTCMysqlStringFromDate(start);
				}

				if(paramMap.has('le.date'))
				{
					this.shipping_search.le.date = paramMap.get('le.date') as string;
					let end = new Date(paramMap.get('le.date') as string + 'T23:59:59');
					this.requisition_search.le.required_by_timestamp = Utils.getUTCMysqlStringFromDate(end);
					this.fecha_final = paramMap.get('le.date') as string;
				}
				else
				{
					let end = new Date();
					this.fecha_final = end.toISOString().split('T')[0];
					end.setHours(23, 59, 59);
					this.shipping_search.le.date = this.fecha_final;
					this.requisition_search.le.required_by_timestamp = Utils.getUTCMysqlStringFromDate(end);
				}

				return forkJoin({
					requisitions: this.rest_requsition_info.search(this.requisition_search),
					shippings_info: this.rest_shipping_info.search( this.shipping_search )
				});
			}),
			mergeMap((responses)=>
			{
				let production_search = this.rest_production.getEmptySearch();
				let start = new Date();
				start.setHours( 0, 0, 0, 0 );
				production_search.ge.created = start;

				return forkJoin
				({
					shippings_info: of( responses.shippings_info ),
					production: this.rest_production.search(production_search),
					requsitions: of( responses.requisitions ),
					stores: this.rest_stores.search({limit:999999})
				})
			}),
			mergeMap((response)=>
			{
				let creqs:CRequisitionInfo[] = response.requsitions.data.map((ri)=>
				{
					let filter = (si:ShippingInfo)=>si.shipping.to_store_id == ri.required_by_store.id ;
					let shippings = response.shippings_info.data.filter( filter ); 

					let citems:CItem[] = ri.items.map((rii)=>
					{
						let required = rii.requisition_item.qty;
						let shipped = shippings.reduce((p, si) =>
						{
							let items = si.items.filter((x) => x.item?.id == rii.item.id);
							console.log('items', items);
							return p + items.reduce((prev_c, item) => prev_c + (item.shipping_item?.qty || 0), 0);
						}, 0);

						let productions = response.production.data.filter(p => p.item_id = rii.item.id);

						let produced = productions.reduce((p, c) => p + c.qty, 0);

						return {
							item: rii.item, category: rii.category, required, shipped, produced
						};
					});


					let required	= citems.reduce((p,citem)=>p+citem.required,0);
					//este valor se calcula en el siguiente paso, aqui solo se inicializa
					let shipped = 0;
					let required_by_store	= ri.required_by_store;

					return { ...ri, required_by_store, shippings, citems, required, shipped };
				});

				return forkJoin
				({
					creq : of(creqs),
					stores: of(response.stores.data),
					shippings_info: of(response.shippings_info.data)
				});
			})
		)
		.subscribe((response)=>
		{
			this.crequisition_info_list = response.creq;
			this.crequisition_by_store_list = response.stores.map((store)=>
			{
				let required = this.crequisition_info_list.reduce((p,creq)=>
				{
					if(creq.required_by_store.id == store.id)
					{
						return p + creq.required;
					}
					return p;
				},0);

				let required_shipped = this.crequisition_info_list.reduce((p,creq)=>
				{
					return p + creq.citems.reduce((p,citem)=>
					{
						if(creq.required_by_store.id == store.id)
						{
							return p + citem.shipped;
						}
						return p;
					},0);
				},0);

				let pending = required - required_shipped;
				let shippings = response.shippings_info.filter((si)=>
				{
					return si.shipping.to_store_id == store.id;
				});

				if (shippings.length == 0) {
					return { store, required, shipped: 0 };
				}

				let shipped = shippings
					.reduce((p, si) => {
						return p + si.items.reduce((p, si) => {
							return p + (si.shipping_item?.qty ?? 0);
						}, 0);
					}, 0);

				return { store, required, shipped, pending };
			});

			this.total_required = this.crequisition_by_store_list.reduce((p,c)=>p+c.required,0);
			this.total_shipped = this.crequisition_by_store_list.reduce((p,c)=>p+c.shipped,0);
			this.total_pending = this.crequisition_by_store_list.reduce((p,c)=>p+(c.pending ?? c.required),0);

		});
	}

	fechaInicialChange(fecha:string)
	{
		this.fecha_inicial = fecha;
		if( fecha )
		{
			this.shipping_search.ge.date = fecha;
		}
		else
		{
			this.shipping_search.ge.date = null;
		}
	}

	fechaFinalChange(fecha:string)
	{
		this.fecha_final = fecha;
		if( fecha )
		{
			this.shipping_search.le.date= fecha;
		}
		else
		{
			this.shipping_search.le.date = null;
		}
	}

}
