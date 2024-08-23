import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, merge, mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ReservationInfo,OrderInfo, ReservationItemInfo, OrderItemInfo } from '../../modules/shared/Models';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { ItemInfo, Order, Order_Item, Period, Price_Type, Reservation, Store } from '../../modules/shared/RestModels';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../components/loading/loading.component';

interface CItem
{
	reservation_item_info:ReservationItemInfo;
	order_item_info:OrderItemInfo;
}


@Component({
	selector: 'app-save-period',
	standalone: true,
	imports: [CommonModule,FormsModule,LoadingComponent ],
	templateUrl: './save-period.component.html',
	styleUrl: './save-period.component.css'
})
export class SavePeriodComponent extends BaseComponent implements OnInit
{
	reservation_info = GetEmpty.reservation_info();
	rest_reservation_info:Rest<Reservation, ReservationInfo> = this.rest.initRest('reservation_info');
	rest_price_type: RestSimple<Price_Type> = this.rest.initRestSimple('price_type');
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store');

	order_info:OrderInfo | null= null;
	price_type_list: Price_Type[] = [];
	store_list: Store[] = [];
	custom_items:CItem[] = [];
    rest_order_info: Rest<Order, OrderInfo> = this.rest.initRest('order_info');
	rest_period: RestSimple<Period> = this.rest.initRestSimple('period');
    prev_period: Period | null = null;

	ngOnInit():void
	{
		this.setTitle('Agregar Corte de Reservación');
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((params) =>
			{
				let reservation_id = parseInt( params.get('id') as string );
				return forkJoin
				({
					reservation_info:this.rest_reservation_info.get(params.get('id')),
					price_type: this.rest_price_type.search({limit:999999}),
					store: this.rest_store.search({limit:999999}),
					periods: this.rest_period.search({eq:{reservation_id}, limit:1,sort_order:['id_DESC']})
				})
			})
		)
		.subscribe
		({
			next:(response)=>
			{

				this.reservation_info = response.reservation_info;
				this.price_type_list = response.price_type.data;
				this.store_list = response.store.data;
				let store = this.store_list.find(x=>x.id == this.reservation_info.reservation.store_id) as Store;
				let price_type = this.price_type_list.find(x=>x.id == this.reservation_info.reservation.price_type_id) as Price_Type;
				this.order_info = GetEmpty.order_info(this.rest, store, price_type);
				this.prev_period = response.periods.data.length ?  response.periods.data[0] : null;

				this.is_loading = false;
			}
			,error:(error)=>
			{
				this.showError(error);
			}
		});
	}


	getCItem(reservation_item_info:ReservationItemInfo):CItem
	{
		let order_item:Order_Item = GetEmpty.order_item(reservation_item_info.item);
		order_item.unitary_price = reservation_item_info.reservation_item.price;

		let order_item_info:OrderItemInfo =
		{
			order_item,
			created: new Date(),
			order_item_exceptions: [],
			serials_string: '',
			commanda_type_id: 0,
			item: reservation_item_info.item,
			category: reservation_item_info.category,
			category_zero: 0,
			price: null,
			prices: [],
			options: [],
			exceptions: []
		};

		setOrderItemPrice(order_item, reservation_item_info.reservation_item);

		let hours = reservation_item_info.reservation_it

		order_item.qty = reservation_item_info.qty*;

		return { reservation_item_info, order_item_info };
	}
	save(evt:Event):void
	{
		evt.preventDefault();

		this.rest_order_info.create(this.order_info).subscribe
		({
			next:(order_info:OrderInfo)=>
			{
				this.showWarning('Corte de Reservación agregado');

				window.location.href = '/#/easy-pos/'+order_info.order.id;
			}
			,error:(error:any)=>
			{
				this.showError(error);
			}
		});
	}
}
