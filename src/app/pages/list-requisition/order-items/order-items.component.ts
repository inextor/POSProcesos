import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../modules/shared/base/base.component';
import { Observable, forkJoin, from, mergeMap, of } from 'rxjs';
import { Order } from '../../../modules/shared/RestModels';
import { OrderInfo, OrderItemInfo, OrderItemStructureInfo, StructuredOrderInfo } from '../../../modules/shared/Models';
import { Rest, RestResponse } from '../../../modules/shared/services/Rest';

interface COrder extends Order
{
	start_timestamp: Date | null;
	end_timestamp: Date | null;
}
@Component
({
	selector: 'app-order-items',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './order-items.component.html',
	styleUrl: './order-items.component.css'
})

export class OrderItemsComponent extends BaseComponent implements OnChanges
{

	@Input() start_timestamp: Date = new Date();
	@Input() end_timestamp: Date | null = null;

	rest_order_info:Rest<Order,OrderInfo> = this.rest.initRest('order_info');
	order_info_list:StructuredOrderInfo[] = [];

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
			}
		});
	}

	loadData(start_timestamp:Date | null = null, end_timestamp:Date | null = null): Observable<any[]>
	{
		if( start_timestamp === null )
			start_timestamp = new Date();

		if( end_timestamp === null )
		{
			end_timestamp = new Date();
			end_timestamp.setTime( start_timestamp.getTime() + 20006400000 );
		}

		return this.rest.getReportByPath('getProductionOrderItems', { start_timestamp , end_timestamp })
		.pipe
		(
			mergeMap((response:any[]) =>
			{
				console.log(response);

				let order_ids = response.map(obj => obj.order_id);
				let order_item_ids = response.map( obj => obj.order_item_id );

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
					//js_oi.structured_items = s_oi.structured_items.filter((order_item_info:OrderItemInfo) =>
					//j{
					//j	return response.order_item_ids.includes( order_item_info.order_item.id  )
					//j});

					result.push( s_oi );
				}

				return of( result );
			}),
		);
	}

	addToProduction(_t8: OrderItemStructureInfo)
	{

	}


	setAsReady(oii:OrderItemInfo)
	{
		this.rest.update('commandaSetOrderItemAsDismissed', { order_item_ids: [oii.order_item.id]}).
		subscribe
		({
			error: (error: any) => this.showError(error),
			next: (response) =>
			{
				oii.order_item.commanda_status = 'DISMISSED';
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
			}
		});
	}
}
