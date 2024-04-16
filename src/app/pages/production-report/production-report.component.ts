import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ItemInfo, Price, Production, User, User_extra_fields, Work_Log, Work_log_rules } from '../../modules/shared/RestModels';
import { Utils } from '../../modules/shared/Utils';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { CustomToTitlePipe } from '../../modules/shared/pipes/custom-to-title.pipe';

interface CUser_production_report
{
	user:User;
	total_hours:number;
	total_extra_hours:number;
	production_qty:number;
	cost:number;
	json_values:Record<string,any>;
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
  imports: [CommonModule, BaseComponent, FormsModule, CustomToTitlePipe],
  templateUrl: './production-report.component.html',
  styleUrl: './production-report.component.css'
})
export class ProductionReportComponent extends BaseComponent implements OnInit{

	rest_work_log:RestSimple<Work_Log> = this.rest.initRestSimple<Work_Log>('work_log',['id','user_id','workshift_id'],['store_id','working_area_id','workshift_id']);
	rest_production:RestSimple<Production> = this.rest.initRestSimple<Production>('production',['id','item_id','qty','merma_qty','date']);
	rest_item_info:Rest<ItemInfo, ItemInfo> = this.rest.initRestSimple('item_info');
	rest_item_prices:RestSimple<Price> = this.rest.initRestSimple('price');
	rest_user:RestSimple<User> = this.rest.initRestSimple('user');
	rest_work_log_rules:RestSimple<Work_log_rules> = this.rest.initRestSimple('work_log_rules');
	rest_user_extra_fields:RestSimple<User_extra_fields> = this.rest.initRestSimple('user_extra_fields');

	user_work_logs_list:Work_Log[] = [];
	Cuser_production_report_list:CUser_production_report[] = [];
	CItem_production_report_list:CItem_production_report[] = [];
	json_rules_list:Work_log_rules[] = [];
	user_extra_fields_list:User_extra_fields[] = [];

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
					}),
					work_log_rules: this.rest_work_log_rules.search({})
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
					work_log_rules: of(result.work_log_rules.data),
					extra_fields: users_ids.length > 0 ? this.rest_user_extra_fields.search({csv: { user_id: users_ids },limit: 999999}) : of(null),
					users: users_ids.length > 0 ? this.rest_user.search({csv: { id: users_ids },limit: 999999}) : of(null),
					items: item_ids.length > 0 ? this.rest_item_info.search({csv: { id: item_ids },limit: 999999}) : of(null),
				});
			})
		)
		.subscribe((result)=>
		{

			this.calculateTotals(result.production, result.items?.data ?? []);

			this.buildItemProductionReport( result.items?.data ?? [], result.production);
			
			this.json_rules_list = result.work_log_rules;

			this.user_extra_fields_list = result.extra_fields?.data ?? [];

			this.user_work_logs_list = result.work_log;

			this.buildUserProductionReport(result.users?.data ?? [], result.work_log, result.production, result.items?.data ?? [], this.payment_total);
			console.log('Cuser_production_report', this.Cuser_production_report_list);

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

		this.CItem_production_report_list = [];
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

			this.CItem_production_report_list.push({item: ii, cost, merma, production: produced, total_cost});
		});
		
		console.log('CItem_production_report', this.CItem_production_report_list);
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
			let total_payment = 0;

			user_work_logs.forEach((work_log)=>
			{
				total_hours += work_log.hours;
				total_extra_hours += work_log.extra_hours;
				if (work_log.total_payment)
				{
					total_payment += work_log.total_payment;
				}
			});

			//gettin the productions of this user
			let user_productions = productions.filter((production) => production.produced_by_user_id == user.id);

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

			let rules = this.json_rules_list.filter((rule)=>rule.store_id == user.store_id);

			//tmp obj with all the rules to be evaluated
			let props = {};
			rules.forEach((rules) =>
			{
				props = {...props, ...rules.json_rules};
			})

			let user_extra_fields = this.user_extra_fields_list.find((uef)=>uef.user_id == user.id)?.json_fields;
			//console.log('user_extra_fields', user_extra_fields);
			let production_json_values = 
			{
				total_hours,
				total_extra_hours,
				total_prod: payment_total,
				individual_prod: production_qty,
				individual_cost: cost
			};

			let json_values: Record<string, any> = {};

			if (work_logs.length != 0) {
				json_values = this.propEvaluator(props, { ...production_json_values}, { ...user_extra_fields});
			}

			//console.log('json_values', json_values); 
			if (total_payment == 0)
			{
				for (let key in json_values)
				{
					total_payment += json_values[key];
				}
			}
			
			this.Cuser_production_report_list.push({ user, total_hours, total_extra_hours, production_qty, cost, json_values, total_payment });
		});

	}

	propEvaluator(prop:Record<string,any>,production_values:Record<string,any>,user_values:Record<string,any>)
	{
		//console.log('propEvaluator Values', prop, production_values)
		let results = {};

		if (prop == null)
		{
			return {};
		}

		for(let key in prop)
		{
			let js2 = 'let production= '+JSON.stringify(production_values)+';let user= '+JSON.stringify(user_values)+';'+prop[key];
			//console.log('Eval is ', window.eval(js2 ));
			production_values[key] = window.eval( js2 );
			let value: Record<string, any> = {}; 
			value[key] = production_values[key];
			results = {...results, ...value};
			//console.log('key is',key, production_values[key] );
		}

		return results;
	}

	setValue(total:number, upr:CUser_production_report)
	{
		upr.total_payment = Math.round(total * 100)/100;
	}

	submit($event:Event)
	{
		//update the worklog of the users with the new values for the total_payment
		let work_log_list = this.user_work_logs_list.map((work_log)=>
		{
			let user_production = this.Cuser_production_report_list.find((upr)=>upr.user.id == work_log.user_id);
			if (user_production)
			{
				work_log.total_payment = user_production.total_payment;
			}
			return work_log;
		});
		
		this.subs.sink = this.rest_work_log.batchUpdate(work_log_list)
		.subscribe({
			next: (response)=>
			{
				this.showSuccess('Reporte guardado con éxito');
			},
			error: (error)=>
			{
				this.showError(error);
			}
		});
	}

}
