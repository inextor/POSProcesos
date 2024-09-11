import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { Utils } from '../../../shared/Utils';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Rest } from '../../../shared/services/Rest';
import { ItemInfo } from '../../../shared/Models';
import { Item } from '../../../shared/RestModels';

interface StockDate
{
	day: number;
	stock: number;
	date: Date;
	is_today: boolean;
	reserved: number;
	in_existence: number;
	bg_percent: number;
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
	imports: [CommonModule],
	templateUrl: './calendar-stock.component.html',
	styleUrl: './calendar-stock.component.css'
})

export class CalendarStockComponent extends BaseComponent implements OnInit
{
	dates:(StockDate|null)[][] = [];
	all_dates:StockDate[] = [];

	today = new Date();
	months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
	rest_reserve_items_by_date = this.rest.initRest<ReserveItemByDate,StockItemReponse>('reports/getReservedItemsByDate');
	rest_items = this.rest.initRest<Item,ItemInfo>('item_info');

	ngOnInit()
	{
		this.setTitle('Calendario de inventario');
		this.path = 'calendar-stock';

		this.subs.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap
			(
				(params) =>
				{
					let search = this.rest_reserve_items_by_date.getEmptySearch();

					let start_date = new Date();
					start_date.setDate(1);
					start_date.setHours(0,0,0,0);

					if( search.eq.start )
					{
						start_date = Utils.getDateFromLocalMysqlString( search.eq.start );
					}
					else
					{
						search.eq.start = Utils.getLocalMysqlStringFromDate(start_date).substring(0,10);
					}

					this.buildCalendar( start_date );
					let end_date = Utils.getEndOfMonth( start_date );
					end_date.setHours(23,59,59,999);
					search.eq.end = Utils.getLocalMysqlStringFromDate(end_date).substring(0,10);

					return this.rest_reserve_items_by_date.search(search);
				}
			),
			mergeMap
			(
				(response) =>
				{
					let item_search = this.rest_items.getEmptySearch();
					item_search.csv['item_id'] = response.data.map(i=>i.item_id);

					return forkJoin
					({
						stock_items: of( response ),
						items: this.rest_items.search(item_search)
					})
				}
			)
		).subscribe
		({
			next: (data) =>
			{
				this.is_loading = false;
				data.stock_items.data.forEach(i=>
				{
					let date = Utils.getDateFromLocalMysqlString( i.date );
					let stock_date = this.all_dates.find(d=>Utils.areSameDay(d.date,date));

					if( stock_date )
					{
						stock_date.stock = i.in_existence;
						stock_date.reserved = i.reserved;
						stock_date.in_existence = i.in_existence;
						stock_date.bg_percent = stock_date.in_existence ? stock_date.reserved/ stock_date.in_existence : 0
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
		let row_dates:(StockDate|null)[][] = [];

		//Six Rows
		let day_num = 0;
		for (let i = 0; i < 6; i++)
		{
			let dates:(StockDate|null)[] = [];

			for (let j = 1; j <= 7; j++)
			{
				day_num = j + i*7 - week_day;
				let date = new Date( start_of_month.getTime() );
				date.setDate( day_num );

				//Print a cell with the day number in it.  If it is today, highlight it.
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
						bg_percent: 1
					};

					dates.push(stock_date);
					this.all_dates.push(stock_date);
				}
				else
				{
					dates.push( null )
				}
			}

			row_dates.push(dates);

			if (day_num >= end_of_month && i != 6)
				break;
		}
		this.dates = row_dates;
	}
}
