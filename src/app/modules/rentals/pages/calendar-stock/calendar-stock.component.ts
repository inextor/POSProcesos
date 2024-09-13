import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { Utils } from '../../../shared/Utils';
import { Observable, forkJoin, mergeMap, of } from 'rxjs';
import { Rest, SearchObject } from '../../../shared/services/Rest';
import { ItemInfo } from '../../../shared/Models';
import { Item } from '../../../shared/RestModels';
import { ModalComponent } from "../../../../components/modal/modal.component";
import { ItemNamePipe } from "../../../shared/pipes/item-name.pipe";
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from "../../../../components/loading/loading.component";

interface StockDate
{
	day: number;
	stock: number;
	date: Date | null;
	is_today: boolean;
	reserved: number;
	in_existence: number;
	bg_percent: number;
	tracked: number;
}

interface StockItemReponse
{
	item_id: number;
	available: number;
	in_existence: number;
	date: string;
	reserved: number;
	total_items_reserved: number;
}

interface ReserveItemByDate
{
	start: string;
	end: string;
	stock_item_id: number;
}

@Component
({
    selector: 'app-calendar-stock',
    standalone: true,
    templateUrl: './calendar-stock.component.html',
    styleUrl: './calendar-stock.component.css',
    imports: [CommonModule, ModalComponent, ItemNamePipe, FormsModule, LoadingComponent]
})

export class CalendarStockComponent extends BaseComponent implements OnInit
{
	dates:(StockDate)[][] = [];
	all_dates:StockDate[] = [];

	today = new Date();
	months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
	rest_reserve_items_by_date = this.rest.initRest<ReserveItemByDate,StockItemReponse>('reports/getReservedItemsByDate');
	rest_items = this.rest.initRest<Item,ItemInfo>('item_info');
	show_stock_modal: boolean = false;
	start_string:string = '';
	stock_items:ItemInfo[] = [];
    stock_item_id:number | '' = '';
    start_date: Date = new Date();

	ngOnInit()
	{
		this.path = '/rentals/calendar-stock';
		this.setTitle('Calendario de inventario');
		this.path = 'calendar-stock';


		this.subs.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap
			(
				(params) =>
				{
					this.is_loading = true;
					let search = this.rest_reserve_items_by_date.getEmptySearch();


					if( params.query.get('eq.stock_item_id') != null )
					{
						search.eq.stock_item_id = parseInt( params.query.get('eq.stock_item_id') as string);
						this.stock_item_id = parseInt( params.query.get('eq.stock_item_id') as string );
					}

					let start = params.query.get('eq.start');
					console.log('start:'+start);

					let start_date = new Date();
					start_date.setDate(1);
					start_date.setHours(0,0,0,0);

					if(start == null )
					{
						start = Utils.getLocalMysqlStringFromDate(start_date).substring(0,7);
					}
					else
					{
						//start+='-01 00:00:00';

						console.log('start:'+start);
					}

					this.start_string = start;
					search.eq.start = start+'-01 00:00:00';

					start_date = Utils.getDateFromLocalMysqlString( search.eq.start );
					this.start_date = Utils.getDateFromLocalMysqlString( this.start_string+'-01 00:00:00' );

					console.log('start_date:'+this.start_string);

					this.buildCalendar( start_date );

					let end_date = Utils.getEndOfMonth( start_date );
					end_date.setHours(23,59,59,999);
					search.eq.end = Utils.getLocalMysqlStringFromDate(end_date).substring(0,10);

					return forkJoin
					({
						reservations: this.rest_reserve_items_by_date.search(search),
						stock_items: this.getStockItems()
					});
				}
			)
		)
		.subscribe
		({
			next: (data) =>
			{
				this.is_loading = false;

				console.log('Stock items: '+data.stock_items);

				this.stock_items = data.stock_items;

				data.reservations.data.forEach(i=>
				{
					let date = Utils.getDateFromLocalMysqlString( i.date );
					let stock_date = this.all_dates.find(d=>d && Utils.areSameDay(d.date as Date,date));

					if( stock_date )
					{
						stock_date.stock = i.in_existence;
						stock_date.reserved = i.reserved;
						stock_date.in_existence = i.in_existence;
						stock_date.bg_percent = stock_date.in_existence ? stock_date.reserved/ stock_date.in_existence : 0
						console.log('stock_date:'+stock_date.bg_percent);
					}
				});
			},
			error: (err) =>
			{
				this.showError(err);
			},
		});

	}

	buildCalendar(start_month:Date)
	{
		let start_of_month = new Date( start_month.getTime() );
		start_of_month.setDate(1);
		start_of_month.setHours(9,0,0,0);
		let week_day = start_of_month.getDay();
		let end_of_month = Utils.getEndOfMonth( start_of_month ).getDate();
		let row_dates:StockDate[][] = [];

		this.all_dates = [];

		//Six Rows
		let day_num = 0;
		for (let i = 0; i < 6; i++)
		{
			let dates:StockDate[] = [];

			for (let j = 1; j <= 7; j++)
			{
				day_num = j + i*7 - week_day;
				let date = new Date( start_of_month.getTime() );
				date.setDate( day_num );

				//Print a cell with the day number in it. If it is today, highlight it.
				if (day_num > 0 && day_num <= end_of_month)
				{
					let is_today = Utils.areSameDay( this.today, date );

					let stock_date:StockDate = {
						day: day_num,
						stock: 0,
						date: date,
						is_today,
						reserved: 0,
						in_existence: 0,
						bg_percent: 1,
						tracked: Date.now() + Math.random(),
					};

					dates.push(stock_date);
					this.all_dates.push(stock_date);
				}
				else
				{
					dates.push({
						day: 0,
						stock: 0,
						date: null,
						is_today:false,
						reserved: 0,
						in_existence: 0,
						bg_percent: 0,
						tracked: Date.now() + Math.random(),
					})
				}
			}

			row_dates.push(dates);

			if (day_num >= end_of_month && i != 6)
				break;
		}
		this.dates = row_dates;
	}

	showStockForDay(stock_date: StockDate)
	{
		this.show_stock_modal = true;
	}

	dateChanged(date:Date)
	{

	}

	getStockItems():Observable<ItemInfo[]>
	{
		return this.rest_items.search
		({
			eq:{ for_reservation: 'YES', status: 'ACTIVE'}, limit: 999999 ,
		})
		.pipe
		(
			mergeMap((response) =>
			{
				let stock_item_ids = [];

				if( response.data.length == 0 )
				{
					return of({total:0, data:[]});
				}

				for(let item_info of response.data)
				{
					for(let e of item_info.exceptions)
					{
						if( e.stock_item_id )
						{
							if( stock_item_ids.indexOf(e.stock_item_id) == -1 )
							{
								console.log('Adding stock item id'+item_info.item.name +': '+ e.stock_item_id);
								stock_item_ids.push(e.stock_item_id);
							}
						}
					}
				}
				return this.rest_items.search({ csv: { id: stock_item_ids }, limit: 999999 });
			}),
			mergeMap((response) =>
			{
				return of(response.data);
			})
		)
	}

	onMonthChange(year_month:string)
	{

		let obj = {
			'eq.stock_item_id': this.stock_item_id,
			'eq.start': year_month
		};

		this.router.navigate(['/rentals/calendar-stock'],{queryParams: obj});

	}

	onStockItemChange(stock_item_id:string)
	{
		let obj = {
			'eq.stock_item_id': stock_item_id,
			'eq.start': this.start_string
		};

		this.router.navigate(['/rentals/calendar-stock'],{queryParams: obj});
	}
}
