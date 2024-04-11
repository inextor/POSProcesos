import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ItemInfo, Price, Production, User, Work_Log } from '../../modules/shared/RestModels';
import { Utils } from '../../modules/shared/Utils';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';

interface CUser_production_report
{
	user:User;
	total_hours:number;
	total_extra_hours:number;
	production_qty:number;
	cost:number;
	total_payment:number;
}

interface CItem_production_report
{
	item:ItemInfo;
	cost:number;
	merma:number;
	production:number;
	total_cost:number;
}

@Component({
  selector: 'app-production-report',
  standalone: true,
  imports: [CommonModule, BaseComponent, FormsModule],
  templateUrl: './production-report.component.html',
  styleUrl: './production-report.component.css'
})
export class ProductionReportComponent extends BaseComponent implements OnInit{

	rest_work_log:RestSimple<Work_Log> = this.rest.initRestSimple<Work_Log>('work_log',['id','user_id','workshift_id'],['store_id','working_area_id','workshift_id']);
	rest_production:RestSimple<Production> = this.rest.initRestSimple<Production>('production',['id','item_id','qty','merma_qty','date']);
	rest_item_info:Rest<ItemInfo, ItemInfo> = this.rest.initRestSimple('item_info');
	rest_item_prices:RestSimple<Price> = this.rest.initRestSimple('price');
	rest_user:RestSimple<User> = this.rest.initRestSimple('user');

	Cuser_production_report:CUser_production_report[] = [];
	CItem_production_report:CItem_production_report[] = [];

	search_prod_obj:SearchObject<Production> = this.getEmptySearch();
	start_date:string = '';
	end_date:string = '';

	items_total:number = 0;
	merma_total:number = 0;
	production_total:number = 0;
	cost_total:number = 0;
	payment_total:number = 0;

	ngOnInit(): void {

		this.route.queryParamMap
		.pipe
		(
			mergeMap((params)=>
			{	
				this.path = 'production-report';
				this.is_loading = true;

				let start = new Date();
				let end = new Date();

				if ( !params.has('ge.created') )
				{
					start.setHours(0,0,0,0);
					this.search_prod_obj.ge.created = start;
				}
				else
				{
					this.search_prod_obj.ge.created = Utils.getDateFromMysqlString(params.get('ge.created') as string) as Date;
				}
				this.start_date = Utils.getLocalMysqlStringFromDate(this.search_prod_obj.ge.created as Date);

				if ( !params.has('le.created'))
				{
					end.setHours(23,59,59);
					this.search_prod_obj.le.created = end;
				}
				else
				{
					this.search_prod_obj.le.created = Utils.getDateFromMysqlString(params.get('le.created') as string) as Date;
				}
				this.end_date = Utils.getLocalMysqlStringFromDate(this.search_prod_obj.le.created as Date);

				let user = this.rest.user as User;

				this.search_prod_obj.eq.store_id = user.store_id as number;
				this.search_prod_obj.eq.status = 'ACTIVE';
				this.search_prod_obj.nn = ['verified_by_user_id'] ;

				return forkJoin({
					production: this.rest_production.search(this.search_prod_obj),
					work_log: this.rest_work_log.search
					({
						ge: { date: Utils.getMysqlStringFromDate(this.search_prod_obj.ge.created).split(' ')[0]},
						le: { date: Utils.getMysqlStringFromDate(this.search_prod_obj.le.created).split(' ')[0]},
						search_extra: { store_id: user.store_id }
					})
				}); 
			}),
			mergeMap((result)=>
			{
				let item_ids = result.production.data.map((production) => production.item_id);
				let users_ids = result.work_log.data.map((work_log) => work_log.user_id);

				return forkJoin
				({
					production: of(result.production.data),
					work_log: of(result.work_log.data),
					users: users_ids.length > 0 ? this.rest_user.search({csv: { id: users_ids },limit: 999999}) : of(null),
					items: item_ids.length > 0 ? this.rest_item_info.search({csv: { id: item_ids },limit: 999999}) : of(null),
				});
			})
		)
		.subscribe((result)=>
		{

			this.calculateTotals(result.production, result.items?.data ?? []);

			this.buildItemProductionReport( result.items?.data ?? [], result.production);

			this.buildUserProductionReport(result.users?.data ?? [], result.work_log, result.production, result.items?.data ?? [], this.payment_total);
			console.log('Cuser_production_report', this.Cuser_production_report);
		});
	}

	calculateTotals(productions:Production[], ItemInfo:ItemInfo[])
	{
		//gettin the total of items
		this.items_total = ItemInfo.length ?? 0;

		productions.forEach((production)=>
		{
			let item = ItemInfo.find((ii)=>ii.item.id == production.item_id);
			if (item)
			{
				this.payment_total += production.qty * item.item.reference_price;
			}
			//getting the total of merma
			this.merma_total += production.merma_qty;
			this.production_total += production.qty;
		});

		this.cost_total = this.payment_total;
		
	}

	buildItemProductionReport(items:ItemInfo[], productions:Production[])
	{

		this.CItem_production_report = [];
		items.forEach((ii)=>
		{
			let item_productions = productions.filter((production)=>production.item_id == ii.item.id);
			let cost = ii.item.reference_price;
			let merma = 0;
			let produced = 0;
			let total_cost = 0;

			item_productions.forEach((production)=>
			{
				produced += production.qty;
				merma += production.merma_qty;
				total_cost += production.qty * ii.item.reference_price;
			});

			this.CItem_production_report.push({item: ii, cost, merma, production: produced, total_cost});
		});
		
		console.log('CItem_production_report', this.CItem_production_report);
	}

	buildUserProductionReport(users:User[], work_logs:Work_Log[], productions:Production[], items:ItemInfo[], payment_total:number)
	{
		users.forEach((user)=>
		{
			//primero encontrar todos los work_logs de este usuario (ya que pueden ser varios en el mismo dia)
			let user_work_logs = work_logs.filter((work_log)=>work_log.user_id == user.id);
			//variables para el total de horas y total de porcentaje de pago
			let total_hours = 0;
			let total_extra_hours = 0;

			user_work_logs.forEach((work_log)=>
			{
				total_hours += work_log.hours;
				total_extra_hours += work_log.extra_hours;
			});

			//gettin the productions of this user
			let user_productions = productions.filter((production) => production.produced_by_user_id == user.id);

			let total_payment = 0;
			let cost = 0;
			let production_qty = 0;
			user_productions.forEach((production)=>
			{
				let item = items.find((ii)=>ii.item.id == production.item_id);
				if (item)
				{
					cost += production.qty * item.item.reference_price;
				}
				production_qty += production.qty;
			});

			this.Cuser_production_report.push({user, total_hours, total_extra_hours, production_qty, cost, total_payment});

		});

	}

}
