import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ReservationInfo,OrderInfo, ReservationItemInfo, OrderItemInfo } from '../../modules/shared/Models';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { Order, Order_Item, Period, Price_Type, Reservation, Store } from '../../modules/shared/RestModels';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../components/loading/loading.component';
import { Utils } from '../../modules/shared/Utils';


type PeriodType = 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'BY_HOUR' | 'ONLY_ONCE';

interface CItem
{
	reservation_item_info:ReservationItemInfo;
	qty:number; //Quantity phisical things
	qty_period: number; //In hours,Days,Weeks, Months
	price:number;
	period:string; //
	total:number; //Total to be paid
	//order_item_info:OrderItemInfo;
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
				let reservation_id = parseInt( params.get('reservation_id') as string);

				console.log('TF Reservation is ', reservation_id );

				return forkJoin
				({
					reservation_info:this.rest_reservation_info.get(reservation_id),
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

				let last_period = response.periods.data.length ? response.periods.data[0] : null;
				let start = last_period ? new Date(last_period.end_timestamp) : null;
				if(start)
				{
					start.setSeconds(start.getSeconds()+1);
				}

				this.custom_items = this.reservation_info.items.map(x=>this.getCItem(x, start));
				this.is_loading = false;
			}
			,error:(error)=>
			{
				this.showError(error);
			}
		});
	}


	getCItem(reservation_item_info:ReservationItemInfo,start:Date|null):CItem
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
            price: undefined,
            prices: [],
            options: [],
            exceptions: [],
            item_options: [],
            records: [],
            serials: []
        };

		let period_type ={
			'MONTHLY':'Meses',
			'WEEKLY':'Semanas',
			'DAILY':'Dias',
			'BY_HOUR':'Horas',
			'ONLY_ONCE':'1'
		};

		let period	= period_type[ reservation_item_info.reservation_item.period_type ]
		let qty = reservation_item_info.reservation_item.qty;
		let end = new Date();

		let start_period = start || Utils.getDateFromLocalMysqlString(reservation_item_info.reservation_item.start);

		let qty_period = this.getQtyByPeriod
		(
				start_period,
				end,
				reservation_item_info.reservation_item.period_type
		)

		let price = reservation_item_info.reservation_item.price
		let total = qty*qty_period * price;
		//order_item_info
		return { reservation_item_info, qty, period, qty_period, total , price };
	}

	getQtyByPeriod(start:Date, end:Date, period:PeriodType):number
	{
		switch(period)
		{
			case 'MONTHLY':
				return this.getMonthsQty(start, end);
			case 'WEEKLY':
				return this.getDaysBetweenDates(start, end)/7;
			case 'DAILY':
				return this.getDaysBetweenDates(start, end);
			case 'BY_HOUR':
				return this.getHoursDifference(start, end);
			case 'ONLY_ONCE':
		}
		return 1;
	}

	getMonthlyQty(start:Date, end:Date):number
	{
		let qty = 0;

		let start_date = new Date(start);
		let end_date = new Date(end);

		start_date.setHours(0, 0, 0, 0);

		while(start_date <= end_date)
		{
			qty++;
			start_date.setMonth(start_date.getMonth()+1);
		}

		return qty;
	}

	getMonthsQty(start_date:Date, end_date:Date):number
	{
		const start_year = start_date.getFullYear();
		const start_month = start_date.getMonth(); // 0-based (january is 0)
		const end_year = end_date.getFullYear();
		const end_month = end_date.getMonth(); // 0-based (January is 0)

		const year_diff = end_year - start_year;
		const month_diff = end_month - start_month;

		return year_diff * 12 + month_diff;
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

	getDaysBetweenDates(start:Date, end:Date):number
	{
		let start_date = new Date(start);
		let end_date = new Date(end);

		// Ignore time by setting hours, minutes, and seconds to 0
		start_date.setHours(0, 0, 0, 0);
		end_date.setHours(0, 0, 0, 0);

		// Calculate the difference in milliseconds
		const milliseconds_difference = end_date.getTime() - start_date.getTime();

		// Convert milliseconds to days (1 day = 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
		const days_difference = milliseconds_difference / (24 * 60 * 60 * 1000);

		// Round up to the nearest integer to handle cases where the difference is close to a full day
		return Math.ceil(days_difference);
	}

	getHoursDifference(start:Date, end:Date):number
	{
		let start_date = new Date(start<end?end:start);
		let end_date = new Date(end<start?start:end);

		let milliseconds_difference = end_date.getTime() - start_date.getTime();
		let hours_difference = milliseconds_difference / (60 * 60 * 1000);

		return hours_difference;
	}
	updatePrice(ri: CItem)
	{
		ri.total = ri.qty * ri.qty_period* ri.price;
	}
}
