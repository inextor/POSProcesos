import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { Category, Item, Production, Requisition, Shipping, Store } from '../../modules/shared/RestModels';
import { RequisitionInfo, ShippingInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';


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

@Component({
	selector: 'app-list-shipping',
	standalone: true,
	imports: [CommonModule,RouterModule,FormsModule],
	templateUrl: './list-shipping.component.html',
	styleUrl: './list-shipping.component.css'
})

export class ListShippingComponent extends BaseComponent
{
	rest_requsition_info:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_shipping_info:Rest<Shipping,ShippingInfo> = this.rest.initRest('shipping_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);
	crequisition_info_list: CRequisitionInfo[] = [];

	ngOnInit()
	{
		this.route.queryParamMap.pipe
		(
			mergeMap((param_map)=>
			{
				return this.rest_requsition_info.search( param_map );
			}),
			mergeMap((rest_resonse)=>
			{
				let requisition_ids = rest_resonse.data.reduce((p,c)=>
				{
					p.push(c.requisition.id)
					return p;
				},[] as Array<number>);

				let production_search = this.rest_production.getEmptySearch();
				let start = new Date();
				start.setHours( 0, 0, 0, 0 );
				production_search.ge.created = start;

				return forkJoin
				({
					shippings: this.rest_shipping_info.search
					({
						csv:{ id:requisition_ids},
						limit: 999999
					}),
					production: this.rest_production.search(production_search),
					requsitions: of( rest_resonse )
				})
			}),
			mergeMap((response)=>
			{
				let creqs:CRequisitionInfo[] = response.requsitions.data.map((ri)=>
				{
					let filter = (si:ShippingInfo)=>si.shipping.requisition_id == ri.requisition.id ;
					let shippings = response.shippings.data.filter( filter );

					let citems:CItem[] = ri.items.map((rii)=>
					{
						let required = rii.requisition_item.qty;
						let shipped = shippings.reduce((p,si)=>
						{
							let items = si.items.filter((x)=>x.item.id == rii.item.id);
							return p+items.reduce((prev_c,item)=>prev_c+item.shipping_item.qty,0);
						},0);

						let productions = response.production.data.filter(p=>p.item_id = rii.item.id);

						let produced = productions.reduce((p,c)=>p+c.qty,0);

						return {
							item: rii.item, category: rii.category, required, shipped, produced
						};
					});

					let required	= citems.reduce((p,citem)=>p+citem.required,0);
					let shipped		= citems.reduce((p,citem)=>p+citem.shipped,0);
					let required_by_store	= ri.required_by_store;

					return { ...ri, required_by_store, shippings, citems, required, shipped };
				});

				return of( creqs );
			})
		)
		.subscribe((response)=>
		{
			this.crequisition_info_list = response;
		});
	}
}
