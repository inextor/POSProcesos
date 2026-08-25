import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../modules/shared/base/base.component';
import { Observable, forkJoin, from, mergeMap, of } from 'rxjs';
import { Item, Order, Production } from '../../../modules/shared/RestModels';
import { OrderInfo, OrderItemInfo, OrderItemStructureInfo, StructuredOrderInfo } from '../../../modules/shared/Models';
import { Rest, RestResponse, RestSimple } from '../../../modules/shared/services/Rest';
import { ModalComponent } from '../../../components/modal/modal.component';
import { GetEmpty } from '../../../modules/shared/GetEmpty';

interface COrder extends Order
{
	start_timestamp: Date | null;
	end_timestamp: Date | null;
}

interface SpecialOrderItemRow
{
	order_info: StructuredOrderInfo;
	order_item: OrderItemStructureInfo;
}
@Component
({
    selector: 'app-order-items',
    imports: [CommonModule, ModalComponent],
    templateUrl: './order-items.component.html',
    styleUrl: './order-items.component.css'
})

export class OrderItemsComponent extends BaseComponent implements OnChanges
{

	@Input() start_timestamp: string | number | Date | null = new Date();
	@Input() end_timestamp: string | number | Date | null = null;
	@Output() productionCreated = new EventEmitter<{production:Production, item:Item}>();

	//production_order_info y no order_info: order_info acota por la sucursal del
	//usuario y escondia las ordenes levantadas en otra sucursal que esta area si
	//tiene que producir.
	rest_order_info:Rest<Order,OrderInfo> = this.rest.initRest('production_order_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production');
	order_info_list:StructuredOrderInfo[] = [];
	special_order_item_rows:SpecialOrderItemRow[] = [];
	show_item_details = false;
	selected_item_details:OrderItemStructureInfo | null = null;

	ngOnInit(): void
	{

	}

	ngOnChanges(_changes: SimpleChanges): void
	{
		this.sink = this.loadData( this.start_timestamp, this.end_timestamp )
		.subscribe
		({
			error: (error: any) => this.showError(error),
			next: (response) =>
			{
				this.order_info_list	= response;
				this.refreshSpecialOrderItemRows();
			}
		});
	}

	loadData(start_timestamp:string | number | Date | null = null, end_timestamp:string | number | Date | null = null): Observable<any[]>
	{
		//coercion defensiva: los @Input pueden venir como Date o como string (del filtro de fechas del padre)
		let start:Date = start_timestamp ? new Date(start_timestamp) : new Date();
		//si no viene end, ventana corta de 3 dias (NO 231) para no arrastrar entregas de meses
		let end:Date = end_timestamp ? new Date(end_timestamp) : new Date(start.getTime() + 3*24*60*60*1000);

		let production_area_id = this.rest.user?.production_area_id ?? null;

		return this.rest.getReportByPath('getProductionOrderItems', { start_timestamp: start, end_timestamp: end, production_area_id })
		.pipe
		(
			mergeMap((response:any[]) =>
			{
				console.log(response);

				let order_ids = response.map(obj => Number(obj.order_id));
				let order_item_ids = response.map(obj => Number(obj.id));

				return forkJoin
				({
					order_info: order_ids.length ? this.rest_order_info.searchAll({ csv: { id: order_ids } })
					: of({tota:0, data: [] }),
					orders: of(response),
					order_item_ids: of(order_item_ids)
				});
			}),
			mergeMap((response) =>
			{
				response.order_info.data.map((oi) => this.rest.createStructuredItems(oi) );

				let result = [];

				for(let oi of response.order_info.data)
				{
					let s_oi = this.rest.createStructuredItems(oi);

					//js_oi.items = response.orders.filter((obj:any) => { return obj.order_id === oi.id; });
					s_oi.structured_items = s_oi.structured_items.filter((order_item_info:OrderItemInfo) =>
					{
						return response.order_item_ids.includes(order_item_info.order_item.id);
					});

					result.push( s_oi );
				}

				return of(result);
			}),
		);
	}

	refreshSpecialOrderItemRows()
	{
		this.special_order_item_rows = this.order_info_list
		.flatMap(order_info => order_info.structured_items.map(order_item => ({
			order_info,
			order_item
		})))
		.sort((a, b) =>
		{
			const a_ready = a.order_item.order_item.commanda_status == 'DISMISSED';
			const b_ready = b.order_item.order_item.commanda_status == 'DISMISSED';

			if( a_ready != b_ready )
				return a_ready ? 1 : -1;

			const order_comparison = Number(a.order_info.order.id) - Number(b.order_info.order.id);
			if( order_comparison != 0 )
				return order_comparison;

			return Number(a.order_item.order_item.id) - Number(b.order_item.order_item.id);
		});
	}

	addToProduction(_t8: OrderItemStructureInfo)
	{

	}

	showItemDetails(order_item:OrderItemStructureInfo)
	{
		this.selected_item_details = order_item;
		this.show_item_details = true;
	}


	setAsReady(order_info:StructuredOrderInfo, oii:OrderItemInfo)
	{
		let production = GetEmpty.production();
		production.item_id = oii.item.id;
		production.store_id = order_info.order.store_id;
		production.qty = oii.order_item.qty;
		production.qty_reported = oii.order_item.qty;
		production.produced_by_user_id = this.rest.user?.id ?? null;
		production.production_area_id = this.rest.user?.production_area_id ?? null;
		production.verified_by_user_id = null;
		production.control = (-oii.order_item.id).toString();

		this.is_loading = true;
		this.rest_production.search({
			eq: {
				control: production.control,
				item_id: production.item_id,
				store_id: production.store_id
			},
			limit: 1
		})
		.pipe(
			mergeMap(response => response.total > 0
				? of({production: response.data[0], created: false})
				: this.rest_production.create(production).pipe(
					mergeMap(created_production => of({production: created_production, created: true}))
				)),
			mergeMap(result => forkJoin({
				result: of(result),
				update: this.rest.update('commandaSetOrderItemAsDismissed', {
					order_item_ids: [oii.order_item.id]
				})
			}))
		)
		.subscribe
		({
			error: (error: any) =>
			{
				this.is_loading = false;
				this.showError(error);
			},
			next: (response) =>
			{
				this.is_loading = false;
				oii.order_item.commanda_status = 'DISMISSED';
				if( response.result.created )
				{
					this.productionCreated.emit({
						production: response.result.production,
						item: oii.item
					});
				}
				this.refreshSpecialOrderItemRows();
			}
		});
	}

	setAsPending(oii:OrderItemInfo)
	{
		this.rest.update('commandaSetOrderItemAsPending', { order_item_ids: [oii.order_item.id]}).
		subscribe
		({
			error: (error: any) => this.showError(error),
			next: (response) =>
			{
				oii.order_item.commanda_status = 'PENDING';
				this.refreshSpecialOrderItemRows();
			}
		});
	}
}
