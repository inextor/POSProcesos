import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of, retry } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ReservationInfo,OrderInfo, ReservationItemInfo, OrderItemInfo, ItemInfo } from '../../modules/shared/Models';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { Item, Order, Period, Price_Type, Reservation, Store, User } from '../../modules/shared/RestModels';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../components/loading/loading.component';
import { Utils } from '../../modules/shared/Utils';
import { OrderBuilder } from '../../modules/shared/OrderBuilder';


type PeriodType = 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'BY_HOUR' | 'ONCE_ONLY';

interface CItem
{
	reservation_item_info:ReservationItemInfo;
	qty:number; //Quantity phisical things
	qty_period: number; //In hours,Days,Weeks, Months
	price:number;
	period:string; //
	total:number; //Total to be paid
	item_info:ItemInfo;
	start:Date;
	end:Date;
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
	rest_item:Rest<Item,ItemInfo> = this.rest.initRest('item_info');

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
					periods: this.rest_period.search
					({
						eq:{reservation_id}, limit:1,sort_order:['id_DESC']
					})
				})
			}),
			mergeMap((response)=>
			{
				let items_map_func = (x:ReservationItemInfo)=>
				{
					return x.item.id;
				};

				let items_id = response.reservation_info.items.map(items_map_func);

				return forkJoin
				({
					price_type: of(response.price_type),
					store: of(response.store),
					periods: of(response.periods),
					reservation_info: of( response.reservation_info ),
					items: this.rest_item.search
					({
						csv:{id:items_id},limit:items_id.length
					})
				});
			}),
			mergeMap((response)=>
			{
				this.reservation_info = response.reservation_info;
				this.price_type_list = response.price_type.data;
				this.store_list = response.store.data;

				console.log('Price type is ', this.price_type_list);

				let store = this.store_list.find(x=>x.id == this.reservation_info.reservation.store_id) as Store;

				if( this.price_type_list.length == 0 )
				{
					throw new Error('No hay tipos de precio registrados');
				}

				let last_period = response.periods.data.length ? response.periods.data[0] : null;
				let start = last_period ? new Date(last_period.end_timestamp) : null;
				if(start)
				{
					start.setSeconds(start.getSeconds()+1);
				}

				//for(let ri of this.reservation_info.items)
				//{
				//	let citem = this.getCItem(ri, start, response.items.data);
				//}

				this.custom_items = this.reservation_info.items.map(x=>this.getCItem(x, start, response.items.data));

				return of(true);
			})
		)
		.subscribe
		({
			next:(response)=>
			{
				this.is_loading = false;
			}
			,error:(error)=>
			{
				this.showError(error);
			}
		});
	}


	/*
	getStartPeriod(store_id:number):Date
	{
		let start = this.getLastPeriodEnd(store_id);

		if( start )
		{
			start.setSeconds(start.getSeconds()+1);
		}

		return start;
	}
	*/


	getCItem(reservation_item_info:ReservationItemInfo,start:Date|null, item_info_list:ItemInfo[]):CItem
	{

	//	order_item.unitary_price = reservation_item_info.reservation_item.price;

		let item_info = item_info_list.find(x=>x.item.id == reservation_item_info.item.id) as ItemInfo;

		if( !item_info )
		{
			console.log('No encontrado el articulo ', reservation_item_info.item.id);
			throw new Error('No encontrado el articulo #' + reservation_item_info.item.id);
		}
		//let order_item_info:OrderItemInfo =
		//{
		//	order_item,
		//	created: new Date(),
		//	order_item_exceptions: [],
		//	serials_string: '',
		//	commanda_type_id: 0,
		//	item: reservation_item_info.item,
		//	category: reservation_item_info.category,
		//	category_zero: 0,
		//	price: undefined,
		//	prices: [],
		//	options: [],
		//	exceptions: [],
		//	item_options: [],
		//	records: [],
		//	serials: []
		//};

		let period_type ={
			'MONTHLY':'Meses',
			'WEEKLY':'Semanas',
			'DAILY':'Dias',
			'BY_HOUR':'Horas',
			'ONCE_ONLY':'Unico'
		};

		const period	= period_type[ reservation_item_info.reservation_item.period_type ]
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
		let citem:CItem =
		{
			reservation_item_info,
			item_info,
			qty,
			period,
			qty_period,
			total ,
			price,
			start: start_period,
			end
		};

		return citem;
	}

	getQtyByPeriod(start:Date, end:Date, period:PeriodType):number
	{
		switch(period)
		{
			case 'MONTHLY':
				return Math.round( this.getMonthsQty(start, end) );
			case 'WEEKLY':
				return Math.round( this.getDaysBetweenDates(start, end)/7);
			case 'DAILY':
				return Math.round( this.getDaysBetweenDates(start, end) );
			case 'BY_HOUR':
				return Math.round( this.getHoursDifference(start, end));
			case 'ONCE_ONLY':
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


	getPriceType():Price_Type
	{
		let price_type = this.price_type_list[0];

		if( this.price_type_list.length > 1 && this.reservation_info?.user?.price_type_id )
		{
			let p = this.price_type_list.find(pt=>pt.id == this.reservation_info.user?.price_type_id);

			if( p )
			{
				price_type = price_type;
			}
		}
		return price_type;
	}

	save(evt:Event):void
	{
		evt.preventDefault();

		let store = this.store_list.find(x=>x.id == this.reservation_info.reservation.store_id) as Store
		console.log('Store is ', store);
		let price_type = this.getPriceType();
		let order_builder = new OrderBuilder(this.rest, price_type, store, this.rest.user as User);
		order_builder.user_client = this.reservation_info.user;

		let user = this.rest.user as User;
		let starts:Date[] = [];

		for(let citem of this.custom_items)
		{
			let ri = citem.reservation_item_info;
			let note = ''+citem.qty+'X'+citem.qty_period+' '+citem.period;

			ri.reservation_item.note = ((ri.reservation_item.note || '')+' '+note).trim();

			let order_item_info = order_builder.addItemInfoWithPriceNumber
			(
				citem.item_info, //ItemInfo
				citem.qty*citem.qty_period, //Qty
				citem.price, //Price number,
				this.reservation_info.reservation.currency_id, //currency_id MXN
				citem.reservation_item_info.reservation_item.note ||'', //note
				ri.reservation_item.tax_included //'YES' OR 'NO
			);

			order_item_info.order_item.reservation_item_id = ri.reservation_item.id
			starts.push(citem.start );
		}

		starts.push( new Date() );
		let start = starts.sort().shift() as Date; //WTF start always has something Because of the previous push

		let period:Period = {
            id: 0,
            created: new Date(),
            created_by_user_id: 0,
            end_timestamp: new Date(),
            minutes_offset: 0,
            note: null,
            reservation_id: 0,
            start_timestamp: start,
            status: 'ACTIVE',
            updated: new Date(),
            updated_by_user_id: user.id,
        };


		order_builder.updateOrderTotal();
		order_builder.period = period;

		let order_info = order_builder.order_info;
		order_info.order.client_user_id = this.reservation_info.reservation.user_id;

		console.log('Items has', order_info.items);

		this.subs.sink = this
			.rest_order_info
			.create( order_info )
			.pipe
			(
				mergeMap((order_info:OrderInfo)=>
				{
					return forkJoin
					({
						order_info: of(order_info),
						update: this.rest.update('closeOrder',{order_id:order_info.order.id})
					})
				})
				,mergeMap((response)=>
				{
					this.showWarning('Corte de Reservación agregado');
					let request = { reservation_id: this.reservation_info.reservation.id };
					return this.rest.reservationUpdates('closeReservation', request ).pipe
					(
						retry(3),
						mergeMap(()=>of(response.order_info)),
					)
				})
			)
			.subscribe
			({
				next:(order_info)=>
				{
					this.showSuccess('Reservación cerrada con exito');
					let f = ()=>
					{
						console.log('Redirecting to ', window.location.protocol+window.location.hostname+'/#/view-order/'+order_info.order.id);
						window.location.href = window.location.protocol+"//"+window.location.hostname+'/#/view-order/'+order_info.order.id;
					};

					setTimeout( f, 700);
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
