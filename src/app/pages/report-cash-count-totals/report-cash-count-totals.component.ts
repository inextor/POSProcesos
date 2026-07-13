import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { forkJoin } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { Store, Currency_Rate } from '../../modules/shared/RestModels';
import { CashCountInfo, CashierCountInfo } from '../../modules/shared/Models';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest'
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
  selector: 'app-report-cash-count-totals',
  templateUrl: './report-cash-count-totals.component.html',
  styleUrls: ['./report-cash-count-totals.component.css'],
  imports: [CommonModule, FormsModule]
})
export class ReportCashCountTotalsComponent extends BaseComponent implements OnInit
{
	store_list: Store[] = [];
	rest_store:RestSimple<Store> = this.rest.initRest('store',['id','name','default_currency_id','created','updated']);
	rest_currency_rate:RestSimple<Currency_Rate> = this.rest.initRest('currency_rate',['id','currency_id','rate','store_id']);
	currency_rate_list:Currency_Rate[] = [];
	cash_count_search: SearchObject<any> = this.getEmptySearch();
	cash_count_list:CashCountInfo[] = [];
	cashier_list:{ user_id:number, user_name:string }[] = [];
	cashier_rows:CashierCountInfo[] = [];
	cashier_summary:{ user_id:number, user_name:string, concepts:{ concept:string, currency_id:string, total_amount:number }[], total_mxn:number, corte_url:string }[] = [];
	start_date:string = '';
	end_date:string = '';
	include_reference:string = '0';
	currency_id:string = '';
	totals_by_currency:{ currency_id:string, total_amount:number }[] = [];
	concept_totals:{ concept:string, currency_id:string, total_amount:number }[] = [];
	grand_total_mxn:number = 0;
	usd_rate_used:number = 0;
	gastos_rows:{ currency_id:string, total_gastos:number, total_movimientos:number }[] = [];
	gastos_total_mxn:number = 0;

	// Orden fijo de conceptos para el resumen tipo corte (forma de pago).
	readonly concept_order:string[] = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'Cheque'];

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map:ParamMap)=>
			{
				this.setTitle('Reporte de totales de conteo de efectivo');
				this.path = '/report-cash-count-totals';
				this.is_loading = true;
				let fields = ['initial_date', 'final_date', 'include_reference'];
				this.cash_count_search = this.getSearch(param_map, ['store_id', 'currency_id', 'created_by_user_id'], fields);

				if (this.cash_count_search.search_extra['include_reference'])
				{
					this.include_reference = this.cash_count_search.search_extra['include_reference'] as string;
				}
				this.cash_count_search.search_extra['include_reference'] = this.include_reference;

				this.currency_id = (this.cash_count_search.eq['currency_id'] as string) || '';
				
				let start:Date;
				let end:Date;

				if (this.cash_count_search.search_extra['initial_date'])
				{
					// La fecha viaja en la URL como UTC (search() usa getUTCMysqlStringFromDate);
					// hay que releerla como UTC, no con new Date() que la interpreta como local
					// (eso adelantaba las horas en cada Buscar).
					start = Utils.getDateFromUTCMysqlString(this.cash_count_search.search_extra['initial_date'] as string);
				}
				else
				{
					start = new Date();
					start.setHours(0,0,0,0);
				}
				this.cash_count_search.search_extra['initial_date'] = start;

				if (this.cash_count_search.search_extra['final_date'])
				{
					end = Utils.getDateFromUTCMysqlString(this.cash_count_search.search_extra['final_date'] as string);
				}
				else
				{
					end = new Date();
					end.setHours(23,59,59);
				}
				this.cash_count_search.search_extra['final_date'] = end;

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				let store_search = this.rest_store.search({limit:999999, eq:{status:'ACTIVE'}});
				let currency_rate_search = this.rest_currency_rate.search({limit:999999});
				let cash_count_search = this.rest.getReportByPath('getCashCountTotals',
				{
					initial_date: this.cash_count_search.search_extra['initial_date'],
					final_date: this.cash_count_search.search_extra['final_date'],
					store_id: this.cash_count_search.eq['store_id'],
					currency_id: this.cash_count_search.eq['currency_id'],
					created_by_user_id: this.cash_count_search.eq['created_by_user_id'],
					include_reference: this.include_reference
				});

				return forkJoin([store_search,currency_rate_search,cash_count_search]);
			}))
		.subscribe
		({
			next: (response)=>
			{
				this.store_list = response[0].data;
				this.currency_rate_list = response[1].data;
				this.cash_count_list = response[2].data;
				this.cashier_list = response[2].cashiers || [];
				this.cashier_rows = response[2].by_cashier || [];
				this.gastos_rows = response[2].gastos || [];
				this.calculateTotals();
				this.calculateCashierSummary();
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.is_loading = false;
				this.showError(error);
			}
		})
	}

	getTranslatedType(type: string)
	{
		switch (type)
		{
			case 'BILL': return 'Billete';
			case 'COIN': return 'Moneda';
			case 'CREDIT_CARD': return 'Tarjeta de crédito';
			case 'DEBIT_CARD': return 'Tarjeta de débito';
			case 'CHECK': return 'Cheque';
			case 'TRANSFER': return 'Transferencia';
			default: return type;
		}
	}

	// Agrupa los 'type' del corte en conceptos de forma de pago (tipo MACHOTE).
	getConceptForType(type: string): string
	{
		switch (type)
		{
			case 'BILL':
			case 'COIN': return 'Efectivo';
			case 'CREDIT_CARD': return 'Tarjeta de crédito';
			case 'DEBIT_CARD': return 'Tarjeta de débito';
			case 'TRANSFER': return 'Transferencia';
			case 'CHECK': return 'Cheque';
			default: return type;
		}
	}

	// Convierte un acumulado {concepto|moneda: monto} en una lista ordenada por concept_order.
	private buildConceptTotals(by_concept: { [key:string]: number }): { concept:string, currency_id:string, total_amount:number }[]
	{
		return Object.keys(by_concept)
			.map((key) => {
				let [concept, currency_id] = key.split('|');
				return { concept, currency_id, total_amount: by_concept[key] };
			})
			.sort((a, b) => {
				let ia = this.concept_order.indexOf(a.concept);
				let ib = this.concept_order.indexOf(b.concept);
				if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
				return a.currency_id.localeCompare(b.currency_id);
			});
	}

	calculateTotals()
	{
		let by_currency: { [key:string]: number } = {};
		let by_concept: { [key:string]: number } = {};

		for (let c of this.cash_count_list)
		{
			let amount = Number(c.total_amount) || 0;
			by_currency[c.currency_id] = (by_currency[c.currency_id] || 0) + amount;

			// Resumen por concepto (forma de pago), separado por moneda.
			let concept = this.getConceptForType(c.type);
			let key = concept + '|' + c.currency_id;
			by_concept[key] = (by_concept[key] || 0) + amount;
		}

		this.totals_by_currency = Object.keys(by_currency).map((currency_id) => ({
			currency_id,
			total_amount: by_currency[currency_id]
		}));

		this.concept_totals = this.buildConceptTotals(by_concept);

		// Total general convertido a MXN: se toma tal cual lo que ya está en MXN
		// y las demás monedas se convierten con su tipo de cambio (rate = MXN por 1 unidad).
		this.usd_rate_used = this.getUsdRate();
		this.grand_total_mxn = 0;

		for (let currency_id of Object.keys(by_currency))
		{
			if (currency_id === 'MXN')
			{
				this.grand_total_mxn += by_currency[currency_id];
			}
			else
			{
				let rate = this.getRateForCurrency(currency_id);
				this.grand_total_mxn += by_currency[currency_id] * rate;
			}
		}

		// Total de gastos/retiros en MXN (convierte otras monedas con su tipo de cambio).
		this.gastos_total_mxn = this.gastos_rows.reduce((acc, g) =>
		{
			let amount = Number(g.total_gastos) || 0;
			let rate = g.currency_id === 'MXN' ? 1 : this.getRateForCurrency(g.currency_id);
			return acc + amount * rate;
		}, 0);
	}

	calculateCashierSummary()
	{
		let by_user: { [user_id:number]: { user_name:string, by_concept:{ [key:string]:number } } } = {};

		for (let c of this.cashier_rows)
		{
			if (!by_user[c.user_id])
			{
				by_user[c.user_id] = { user_name: c.user_name, by_concept: {} };
			}

			let concept = this.getConceptForType(c.type);
			let key = concept + '|' + c.currency_id;
			let amount = Number(c.total_amount) || 0;
			by_user[c.user_id].by_concept[key] = (by_user[c.user_id].by_concept[key] || 0) + amount;
		}

		this.cashier_summary = Object.keys(by_user).map((user_id_str) =>
		{
			let user_id = Number(user_id_str);
			let entry = by_user[user_id];

			let concepts = this.buildConceptTotals(entry.by_concept);

			let total_mxn = concepts.reduce((acc, c) =>
			{
				let rate = c.currency_id === 'MXN' ? 1 : this.getRateForCurrency(c.currency_id);
				return acc + c.total_amount * rate;
			}, 0);

			return { user_id, user_name: entry.user_name, concepts, total_mxn, corte_url: this.getCorteListUrl(user_id) };
		})
		.sort((a, b) => a.user_name.localeCompare(b.user_name));
	}

	getRateForCurrency(currency_id: string): number
	{
		let store_id = this.cash_count_search.eq['store_id'];

		// Con sucursal seleccionada, usa su tipo de cambio; si no, el promedio de las tiendas.
		let rates = this.currency_rate_list.filter((r) =>
			r.currency_id === currency_id && (!store_id || r.store_id == store_id)
		);

		if (!rates.length)
		{
			rates = this.currency_rate_list.filter((r) => r.currency_id === currency_id);
		}

		if (!rates.length) return 0;

		let sum = rates.reduce((acc, r) => acc + Number(r.rate), 0);
		return sum / rates.length;
	}

	getUsdRate(): number
	{
		return this.getRateForCurrency('USD');
	}

	performSearch() {
		// El select "Mostrar" está enlazado a include_reference (propiedad suelta),
		// hay que volcarlo a search_extra para que viaje en la URL/búsqueda.
		this.cash_count_search.search_extra['include_reference'] = this.include_reference;
		super.search(this.cash_count_search);
	}

	// URL al listado de cortes de esa cajera en el POS (otro front, hash routing),
	// filtrado por el mismo rango de fechas del reporte. Puede abarcar varios cortes.
	getCorteListUrl(user_id: number): string
	{
		let url = `${this.rest.getExternalAppUrl()}/#/list-cash-close/${user_id}`;

		let params: string[] = [];
		let start = this.cash_count_search.search_extra['initial_date'];
		let end = this.cash_count_search.search_extra['final_date'];

		if (start instanceof Date)
		{
			params.push('ge.created=' + encodeURIComponent(Utils.getUTCMysqlStringFromDate(start)));
		}
		if (end instanceof Date)
		{
			params.push('le.created=' + encodeURIComponent(Utils.getUTCMysqlStringFromDate(end)));
		}

		if (params.length)
		{
			url += '?' + params.join('&');
		}

		return url;
	}

}

