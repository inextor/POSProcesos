import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Item, Production, Requisition, Shipping, Store } from '../../modules/shared/RestModels';
import { RequisitionInfo, ShippingInfo } from '../../modules/shared/Models';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GetEmpty } from '../../modules/shared/GetEmpty';

interface CItem
{
	item: Item;
	category: Category | null;
	required: number;
	shipped: number;
	to_ship_qty:number;
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
	imports: [CommonModule,RouterModule,FormsModule],
	templateUrl: './save-shipping.component.html',
	styleUrl: './save-shipping.component.css'
})
export class SaveShippingComponent extends BaseComponent
{

	rest_requisition_info:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_shipping_info:Rest<Shipping,ShippingInfo> = this.rest.initRest('shipping_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);
	rest_store:Rest<Store,Store> = this.rest.initRest('store');
	crequisition_info: CRequisitionInfo | null = null;

	shipping_guide:string = '';
	shipping_company:string = '';
	shipping_date:string = '';
	shipping_from_store:Store | null = null;
	shipping_to_store:Store | null = null;

	ngOnInit()
	{	
		this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				return this.rest_requisition_info.get( param_map.get('requisition_id' ) )
			}),
			mergeMap((requisition)=>
			{
				console.log('Req	is ', requisition);
				this.shipping_to_store = requisition.required_by_store;
				let production_search = this.rest_production.getEmptySearch();
				let start = new Date();
				start.setHours( 0, 0, 0, 0 );
				production_search.ge.created = start;
				this.shipping_date = start.toISOString().split('T')[0];
				return forkJoin
				({
					shippings: this.rest_shipping_info.search
					({
						eq:{ requisition_id: requisition.requisition.id },
						limit: 999999
					}),
					production: this.rest_production.search(production_search),
					requsition: of( requisition ),
					stores: this.rest_store.search
					({
						limit: 999999
					})
				})
			}),
			mergeMap((response)=>
			{
				let ri = response.requsition;
				let shippings = response.shippings.data;
				this.shipping_from_store = response.stores.data.find((s)=>s.id == this.rest.user?.store_id) || null;

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
					let to_ship_qty = 0;

					return {
						item: rii.item, category: rii.category, required, shipped, produced, to_ship_qty
					};
				});

				let required	= citems.reduce((p,citem)=>p+citem.required,0);
				let shipped		= citems.reduce((p,citem)=>p+citem.shipped,0);
				let required_by_store	= ri.required_by_store;

				return of( { ...ri, required_by_store, shippings, citems, required, shipped } );
			})
		)
		.subscribe((response)=>
		{
			this.crequisition_info = response;
		});
	}

	onSubmit(evt:Event)
	{
		evt.stopPropagation();
		evt.preventDefault();

		if( this.crequisition_info == null )
		{
			return;
		}

		this.rest_shipping_info.create
		({
			shipping: {
				requisition_id: this.crequisition_info.requisition.id,
				to_store_id: this.crequisition_info.requisition.required_by_store_id
			},
			items: this.crequisition_info.citems.map((citem)=>
			{
				return{ item_id: citem.item.id, qty: citem.to_ship_qty }
			})
		})
		.subscribe((response)=>
		{
			this.showSuccess('Se guardo correctamente toooooo');
		});
	}

	saveShipping(evt:Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		if( this.crequisition_info == null )
			return;

		let shipping_info:ShippingInfo = GetEmpty.shipping_info();
		shipping_info.shipping.to_store_id = this.crequisition_info.requisition.required_by_store_id;
		shipping_info.shipping.shipping_guide = this.shipping_guide;
		shipping_info.shipping.shipping_company = this.shipping_company;
		shipping_info.shipping.requisition_id = this.crequisition_info.requisition.id;
		shipping_info.shipping.date = this.shipping_date;
		shipping_info.shipping.from_store_id = this.shipping_from_store?.id || 0;
		shipping_info.shipping.created_by_user_id = this.rest.user?.id || 0;

		shipping_info.items = this.crequisition_info.citems.map((cri)=>{
			return {
				item: cri.item,
				category: cri.category,
				shipping_item: {
					item_id: cri.item.id,
					qty: cri.to_ship_qty,
					box_id: null,
					created:new Date(),
					id:0,
					pallet_id: null,
					received_qty: 0,
					requisition_item_id: null,
					serial_number:null,
					shipping_id: 0,
					shrinkage_qty: 0,
					updated:new Date()
				}
			};
		})

		this.subs.sink = this.rest_shipping_info.create( shipping_info ).subscribe
		({
			next:(response)=>
			{
				this.showSuccess('El envio se creo exitosamente');
				this.is_loading = false;
				//navegar a list-shipping
				this.router.navigate(['/list-shipping']);
				return response;
			},
			error:(error)=>
			{
				this.showError(error);
			}
		});
	}
}
