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

	fecha_inicial: string = '';
	fecha_final: string = '';

	shipping_search = this.rest_shipping_info.getEmptySearch();

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

				let date = new Date();

				if(paramMap.has('ge.date'))
				{
					this.shipping_search.ge.date = paramMap.get('ge.date') as string;
					this.fecha_inicial = paramMap.get('ge.date') as string;
				}
				else
				{
					this.fecha_inicial = Utils.getLocalMysqlStringFromDate(date).split(' ')[0];
					this.shipping_search.ge.date = this.fecha_inicial;
				}

				if(paramMap.has('le.date'))
				{
					this.shipping_search.le.date = paramMap.get('le.date') as string;
					this.fecha_final = paramMap.get('le.date') as string;
				}
				else
				{
					this.fecha_final = Utils.getLocalMysqlStringFromDate(date).split(' ')[0];
					this.shipping_search.le.date = this.fecha_final;
				}

				
				return forkJoin({
					requisitions: this.rest_requsition_info.search({ le: { date: this.fecha_final }, ge: { date: this.fecha_inicial }, eq: {status : 'PENDING'} }),
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
					let filter = (si:ShippingInfo)=>si.shipping.requisition_id == ri.requisition.id ;
					let shippings = response.shippings_info.data.filter( filter ); 

					let citems:CItem[] = ri.items.map((rii)=>
					{
						let required = rii.requisition_item.qty;
						// let shipped = shippings.reduce((p, si) =>
						// {
						// 	//console.log('FOOO',si.items);
						// 	let items = si.items.filter((x) => x.item?.id == rii.item.id);
						// 	return p + items.reduce((prev_c, item) => prev_c + (item.shipping_item?.qty || 0), 0);
						// }, 0);

						let shipped =  0;
						let productions = response.production.data.filter(p => p.item_id = rii.item.id);

						let produced = productions.reduce((p, c) => p + c.qty, 0);

						return {
							item: rii.item, category: rii.category, required, shipped, produced
						};
					});


					let required	= citems.reduce((p,citem)=>p+citem.required,0);
					//let shipped	= citems.reduce((p,citem)=>p+citem.shipped,0);
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

				//de shippings_info, obtener los ids de los shippings que coincidan en to_store_id con el store.id
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

				return { store, required, shipped };
			});

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
