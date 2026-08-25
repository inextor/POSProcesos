import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { CommonModule } from '@angular/common';
import { Item, Price, Production, Production_Area, User, User_Extra_Fields, Work_Log, Work_Log_Rules } from '../../modules/shared/RestModels';
import { Utils } from '../../modules/shared/Utils';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { CustomToTitlePipe } from '../../modules/shared/pipes/custom-to-title.pipe';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ItemInfo } from '../../modules/shared/Models';

interface CUser_production_report
{
	user:User;
	//Una fila por usuario y por DIA: el pago se guarda en work_log, que es una fila
	//por dia, asi que agregar el rango en una sola fila obligaria a inventar un
	//criterio de reparto al momento de guardar.
	date:string;
	work_log_array:Work_Log[];
	total_hours:number;
	total_extra_hours:number;
	production_qty:number;
	cost:number;
	json_values:Record<string,any>;
	total_payment:number;
	//El dia ya tenia pago guardado: se respeta y no se recalcula.
	is_paid:boolean;
	//Precalculados para la plantilla: el subtotal del usuario en todo el rango se
	//pinta solo en su ultima fila.
	is_last_of_user:boolean;
	user_subtotal:number;
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
    selector: 'app-save-production-payment',
    imports: [CommonModule, FormsModule, CustomToTitlePipe, LoadingComponent],
    templateUrl: './save-production-payment.component.html',
    styleUrl: './save-production-payment.component.css'
})
export class SaveProductionPaymentComponent extends BaseComponent implements OnInit{
	rest_work_log:RestSimple<Work_Log> = this.rest.initRestSimple<Work_Log>('work_log',['id','user_id','workshift_id'],['store_id','working_area_id','workshift_id']);
	rest_production:RestSimple<Production> = this.rest.initRestSimple<Production>('production',['id','item_id','qty','merma_qty','date']);
	rest_item_info:Rest<Item, ItemInfo> = this.rest.initRest('item_info');
	rest_item_prices:RestSimple<Price> = this.rest.initRestSimple('price');
	rest_user:RestSimple<User> = this.rest.initRestSimple('user');
	rest_work_log_rules:RestSimple<Work_Log_Rules> = this.rest.initRestSimple('work_log_rules');
	rest_user_extra_fields:RestSimple<User_Extra_Fields> = this.rest.initRestSimple('user_extra_fields');
	rest_production_area:RestSimple<Production_Area> = this.rest.initRestSimple('production_area');

	production_area_list:Production_Area[] = [];
	production_area_id:number | null = null;
	//El filtro de area solo se le muestra a quien no esta asignado a ninguna (perfil de oficina):
	//el que si tiene area asignada siempre ve la suya y no deberia poder cambiarla.
	show_production_area_filter:boolean = false;

	Cuser_production_report_list:CUser_production_report[] = [];
	CItem_production_report_list:CItem_production_report[] = [];
	json_rules_list:Work_Log_Rules[] = [];
	user_extra_fields_list:User_Extra_Fields[] = [];

	search_work_log_obj:SearchObject<Work_Log> = this.getEmptySearch();
	start_date:string = '';
	end_date:string = '';
	//Con mas de un dia la tabla muestra la columna de fecha y los subtotales por usuario.
	is_range:boolean = false;

	items_total:number = 0;
	merma_total:number = 0;
	production_total:number = 0;
	cost_total:number = 0;
	payment_total:number = 0;

	//Suma de la columna "Total Pago": es exactamente lo que submit() guarda en work_log.total_payment,
	//por eso es un getter y no un campo (refleja tambien las ediciones manuales del input).
	get total_to_pay():number
	{
		return this.Cuser_production_report_list.reduce((total, upr) => total + (upr.total_payment || 0), 0);
	}

	ngOnInit(): void {

		this.route.queryParamMap
		.pipe
		(
			mergeMap((params)=>
			{
				this.path = 'save-production-payment';
				this.is_loading = true;

				//Por default el rango es el dia de hoy, asi la pantalla se ve igual que
				//cuando el filtro era de un solo dia.
				let today = Utils.getMysqlStringFromDate(new Date()).split(' ')[0];

				this.start_date = params.has('ge.date')
					? (params.get('ge.date') as string).split(' ')[0]
					: today;

				this.end_date = params.has('le.date')
					? (params.get('le.date') as string).split(' ')[0]
					: this.start_date;

				//Un rango invertido no traeria nada y se ve como si la pantalla fallara.
				if( this.end_date < this.start_date )
				{
					this.end_date = this.start_date;
				}

				this.is_range = this.start_date != this.end_date;

				this.search_work_log_obj.ge.date = this.start_date;
				this.search_work_log_obj.le.date = this.end_date;

				let user = this.rest.user as User;
				let permission = this.rest.user_permission;

				this.show_production_area_filter = !user.production_area_id
					&& !!( permission.add_payroll || permission.pay_commissions );

				if( user.production_area_id )
				{
					//Usuario de produccion: siempre su area, sin importar lo que traiga la URL
					this.production_area_id = user.production_area_id;
				}
				else
				{
					let param_area = params.get('search_extra.production_area_id');
					this.production_area_id = param_area && param_area !== 'null' ? parseInt( param_area ) : null;
				}

				this.search_work_log_obj.search_extra = { production_area_id: this.production_area_id };

				let start = new Date(this.start_date + ' 00:00:00');
				let end = new Date(this.end_date + ' 23:59:59');

				let search_production_obj:SearchObject<Production> = this.getEmptySearch();
				search_production_obj.eq.production_area_id = this.production_area_id;
				search_production_obj.eq.status = 'ACTIVE';
				search_production_obj.ge.created = start;
				search_production_obj.le.created = end;
				search_production_obj.nn = ['verified_by_user_id'];
				//getEmptySearch deja limit en page_size (50). Aqui se suman totales del dia,
				//no se pagina: con el limite por default el total se quedaba corto.
				search_production_obj.limit = 999999;

				this.search_work_log_obj.limit = 999999;

				//Sin area no se consulta nada: eq ignora los null, asi que la busqueda traeria
				//la produccion de TODAS las areas mezclada, y esta pantalla guarda pagos.
				let empty_production = of({ total: 0, data: [] as Production[] });
				let empty_work_log = of({ total: 0, data: [] as Work_Log[] });

				return forkJoin({
					production: this.production_area_id ? this.rest_production.search(search_production_obj) : empty_production,
					work_log: this.production_area_id ? this.rest_work_log.search(this.search_work_log_obj) : empty_work_log,
					work_log_rules: this.rest_work_log_rules.search({}),
					production_area: this.show_production_area_filter
						? this.rest_production_area.search({ eq: { status: 'ACTIVE' }, limit: 9999, sort_order: ['name_ASC'] })
						: of(null)
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
					production_area: of(result.production_area?.data ?? []),
					extra_fields: users_ids.length > 0 ? this.rest_user_extra_fields.search({csv: { user_id: users_ids },limit: 999999}) : of(null),
					users: users_ids.length > 0 ? this.rest_user.search({csv: { id: users_ids },limit: 999999}) : of(null),
					items: item_ids.length > 0 ? this.rest_item_info.search({csv: { id: item_ids },limit: 999999}) : of(null),
				});
			})
		)
		.subscribe((result)=>
		{
			this.is_loading = false;

			this.production_area_list = result.production_area;

			let item_array = result.items?.data ?? [];

			this.json_rules_list = result.work_log_rules;

			this.user_extra_fields_list = result.extra_fields?.data ?? [];

			this.calculateTotals(result.production, item_array);

			this.buildItemProductionReport( item_array, result.production);

			this.buildUserProductionReport(result.users?.data ?? [], result.work_log, result.production, item_array);
		});
	}

	calculateTotals(productions:Production[], ItemInfo:ItemInfo[])
	{
		//Se reinician: son acumuladores y esta funcion corre en cada busqueda. Sin esto
		//los totales se iban sumando a los de la busqueda anterior.
		this.payment_total = 0;
		this.merma_total = 0;
		this.production_total = 0;

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
	}

	//Se agrupa por dia y las reglas se evaluan un dia a la vez, igual que cuando el filtro
	//era de una sola fecha. Evaluarlas sobre todo el rango cambiaria lo que significan:
	//un minimo garantizado por dia se volveria un minimo por semana, y un total_users
	//sacado del rango repartiria entre mas gente de la que trabajo cada dia.
	//Se agrupa por dia y las reglas se evaluan un dia a la vez, igual que cuando el filtro
	//era de una sola fecha. Evaluarlas sobre todo el rango cambiaria lo que significan:
	//un minimo garantizado por dia se volveria un minimo por semana, y un total_users
	//sacado del rango repartiria entre mas gente de la que trabajo cada dia.
	buildUserProductionReport(users:User[], work_logs:Work_Log[], productions:Production[], items:ItemInfo[])
	{
		this.Cuser_production_report_list = [];

		//Map en vez de items.find() adentro de los ciclos: la busqueda corria por cada
		//produccion, de cada usuario, de cada dia. Con un rango largo se nota.
		let item_by_id = new Map<number,ItemInfo>();
		items.forEach((ii)=> item_by_id.set( ii.item.id, ii ) );

		//Las reglas del AREA no dependen del usuario ni del dia, se resuelven una sola vez.
		//Esta es la dimension con la que trabaja toda esta pantalla (la produccion, los
		//usuarios listados y total_users salen del area).
		let area_rule_array = this.json_rules_list
			.filter((rule)=> rule.production_area_id != null && rule.production_area_id == this.production_area_id);

		let work_log_by_date = new Map<string,Work_Log[]>();
		work_logs.forEach((work_log)=>
		{
			let date = this.getWorkLogDate( work_log );
			let day_array = work_log_by_date.get( date ) ?? [];
			day_array.push( work_log );
			work_log_by_date.set( date, day_array );
		});

		let production_by_date = new Map<string,Production[]>();
		productions.forEach((production)=>
		{
			let date = this.getProductionDate( production );
			let day_array = production_by_date.get( date ) ?? [];
			day_array.push( production );
			production_by_date.set( date, day_array );
		});

		let date_array = Array.from( work_log_by_date.keys() ).sort();

		date_array.forEach((date)=>
		{
			let day_work_log_array = work_log_by_date.get( date ) as Work_Log[];
			let day_production_array = production_by_date.get( date ) ?? [];

			//Se agrupa una vez por usuario en lugar de filtrar la lista completa del dia
			//por cada persona.
			let day_work_log_by_user = new Map<number,Work_Log[]>();
			day_work_log_array.forEach((work_log)=>
			{
				let user_array = day_work_log_by_user.get( work_log.user_id ) ?? [];
				user_array.push( work_log );
				day_work_log_by_user.set( work_log.user_id, user_array );
			});

			let day_production_by_user = new Map<number,Production[]>();
			day_production_array.forEach((production)=>
			{
				//Si produced_by_user_id viene NULL, se atribuye a created_by_user_id (mismo fallback que el backend: production.php:124)
				let user_id = production.produced_by_user_id ?? production.created_by_user_id;
				let user_array = day_production_by_user.get( user_id ) ?? [];
				user_array.push( production );
				day_production_by_user.set( user_id, user_array );
			});

			let day_user_array = users.filter((user)=> day_work_log_by_user.has( user.id ) );

			//Los totales que ven las reglas tienen que ser de ESE dia, no del rango completo.
			let day_payment_total = 0;
			let day_merma_total = 0;

			day_production_array.forEach((production)=>
			{
				let item = item_by_id.get( production.item_id );

				if( item )
				{
					day_payment_total += production.qty * item.item.reference_price;
				}

				day_merma_total += production.merma_qty;
			});

			day_user_array.forEach((user)=>
			{
				this.Cuser_production_report_list.push
				(
					this.getUserDayReport
					(
						user,
						date,
						day_user_array.length,
						day_work_log_by_user.get( user.id ) ?? [],
						day_production_by_user.get( user.id ) ?? [],
						item_by_id,
						area_rule_array,
						day_payment_total,
						day_merma_total
					)
				);
			});
		});

		this.sortUserProductionReport();
		this.refreshUserSubtotals();
	}

	getUserDayReport
	(
		user:User,
		date:string,
		total_users:number,
		user_work_log_array:Work_Log[],
		user_production_array:Production[],
		item_by_id:Map<number,ItemInfo>,
		area_rule_array:Work_Log_Rules[],
		day_payment_total:number,
		day_merma_total:number
	):CUser_production_report
	{
		let total_hours = 0;
		let total_extra_hours = 0;

		//Un usuario puede tener varias checadas el mismo dia
		user_work_log_array.forEach((work_log)=>
		{
			total_hours += work_log.hours;
			total_extra_hours += work_log.extra_hours;
		});

		let cost = 0;
		let production_qty = 0;
		let merma_qty = 0;

		user_production_array.forEach((production)=>
		{
			let item = item_by_id.get( production.item_id );

			if( item )
			{
				cost += production.qty * item.item.reference_price;
			}

			production_qty += production.qty;
			merma_qty += production.merma_qty;
		});

		//Solo si el area no tiene regla propia se cae al esquema viejo por sucursal, para no dejar
		//sin pago a nadie durante la migracion. Es excluyente a proposito: si se acumularan, un
		//usuario con regla de area Y regla de su sucursal cobraria las dos. Cuando todas las reglas
		//tengan area, esta segunda rama se puede borrar.
		let rules = area_rule_array.length
			? area_rule_array
			: this.json_rules_list.filter((rule)=> rule.production_area_id == null && rule.store_id == user.store_id);

		//tmp obj with all the rules to be evaluated
		let props = {};
		rules.forEach((rules) =>
		{
			props = {...props, ...rules.json_rules};
		})

		let user_extra_fields = this.user_extra_fields_list.find((uef)=>uef.user_id == user.id)?.json_fields;

		let production_json_values =
		{
			total_hours,
			total_extra_hours,
			total_users,
			total_prod: day_payment_total,
			total_merma: day_merma_total,
			individual_prod: production_qty,
			individual_cost: cost,
			individual_merma: merma_qty
		};

		let json_values: Record<string, any> = {};

		if( user_work_log_array.length != 0 )
		{
			json_values = this.propEvaluator(props, { ...production_json_values}, { ...user_extra_fields});
		}

		user_work_log_array.forEach((work_log)=>
		{
			work_log.json_values = json_values;
		});

		//Lo que dictan las reglas hoy, que es lo que se muestra en las columnas de json_values
		let calculated_payment = 0;
		for (let key in json_values)
		{
			calculated_payment += json_values[key];
		}

		//El input arranca con lo YA GUARDADO si existe: antes se sobreescribia siempre con el
		//calculo, asi que cualquier ajuste manual se perdia al recargar (y si ese dia no habia
		//produccion validada, el monto capturado se veia como 0 aunque estuviera en la base).
		//Se suma sobre las checadas del MISMO dia, nunca sobre todo el rango.
		let saved_payment = user_work_log_array.reduce((total, work_log) => total + (work_log.total_payment || 0), 0);
		let is_paid = saved_payment > 0;
		let total_payment = is_paid ? saved_payment : calculated_payment;

		return {
			user,
			date,
			work_log_array: user_work_log_array,
			total_hours,
			total_extra_hours,
			production_qty,
			cost,
			json_values,
			total_payment,
			is_paid,
			is_last_of_user: false,
			user_subtotal: 0
		};
	}

	getWorkLogDate(work_log:Work_Log):string
	{
		//work_log.date es columna DATE y Rest no la convierte, llega como string
		return (''+work_log.date).substring(0,10);
	}

	getProductionDate(production:Production):string
	{
		//created si llega como Date (Rest convierte created/updated/timestamp). Se agrupa por
		//el dia LOCAL, que es el mismo criterio con el que se arma la ventana que va al backend.
		return Utils.getLocalMysqlStringFromDate( new Date( production.created ) ).split(' ')[0];
	}

	sortUserProductionReport()
	{
		this.Cuser_production_report_list.sort((a, b)=>
		{
			let by_name = a.user.name.localeCompare( b.user.name );

			if( by_name != 0 )
				return by_name;

			return a.date.localeCompare( b.date );
		});
	}

	//Vive aparte porque tambien corre cuando editan un monto a mano.
	refreshUserSubtotals()
	{
		let subtotal_by_user = new Map<number,number>();

		this.Cuser_production_report_list.forEach((upr)=>
		{
			let subtotal = subtotal_by_user.get( upr.user.id ) ?? 0;
			subtotal_by_user.set( upr.user.id, subtotal + (upr.total_payment || 0) );
		});

		this.Cuser_production_report_list.forEach((upr, index)=>
		{
			let next = this.Cuser_production_report_list[index+1];
			upr.is_last_of_user = !next || next.user.id != upr.user.id;
			upr.user_subtotal = subtotal_by_user.get( upr.user.id ) ?? 0;
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

	performSearch()
	{
		//Un rango invertido no traeria nada, se corrige antes de navegar.
		if( this.end_date < this.start_date )
		{
			this.end_date = this.start_date;
		}

		this.search_work_log_obj.ge.date = this.start_date;
		this.search_work_log_obj.le.date = this.end_date;
		this.search_work_log_obj.search_extra = { production_area_id: this.production_area_id };
		this.search( this.search_work_log_obj );
	}

	setValue(total:number, upr:CUser_production_report)
	{
		upr.total_payment = Math.round(total * 100)/100;
		this.refreshUserSubtotals();
	}

	submit($event:Event)
	{
		//Cada work_log recibe el monto de SU dia. Antes se le escribia el mismo total a
		//todas las filas del usuario, asi que con un rango de una semana cada uno de los
		//7 registros se llevaba el total completo.
		let work_log_array:Work_Log[] = [];

		this.Cuser_production_report_list.forEach((upr)=>
		{
			upr.work_log_array.forEach((work_log, index)=>
			{
				//El pago es del dia, no de la checada: se asienta en la primera y las
				//demas van en cero para que no se duplique cuando hubo varias entradas.
				work_log.total_payment = index == 0 ? upr.total_payment : 0;
				work_log_array.push( work_log );
			});
		});

		this.is_loading = true;

		this.subs.sink = this.rest_work_log.batchUpdate(work_log_array)
		.subscribe({
			next: (response)=>
			{
				this.showSuccess('Registro guardado con éxito');
			},
			error: (error)=>
			{
				this.showError(error);
			}
		});
	}
}
