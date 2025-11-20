import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Cash_Close, Fund, Order, Payment, User } from '../../modules/shared/RestModels';
import { RestResponse, RestSimple, Rest } from '../../modules/shared/services/Rest';
import { forkJoin } from 'rxjs';
import { OrderInfo, PaymentInfo } from '../../modules/shared/Models';
interface CPayment extends Payment
{
	hades?:1|null
}
interface COrder extends Order
{
	hades?:1|null
}

interface FundInfo {
	fund: Fund;
	user: User | null;
}



@Component({
	selector: 'app-list-cash-close-detail',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './list-cash-close-detail.component.html',
	styleUrl: './list-cash-close-detail.component.css'
})
export class ListCashCloseDetailComponent extends BaseComponent implements OnInit {
	cash_close_id: number = 0;
	cash_close: Cash_Close | null = null;
	fund_list: Fund[] = [];
	payment_info_list: PaymentInfo[] = [];
	order_list: OrderInfo[] = [];

	rest_cash_close: RestSimple<Cash_Close> = this.rest.initRestSimple<Cash_Close>('cash_close');
	rest_fund: RestSimple<Fund> = this.rest.initRestSimple<Fund>('fund');
	rest_payment_info: Rest<CPayment, PaymentInfo> = this.rest.initRest<CPayment, PaymentInfo>('payment_info');
	rest_order_info: Rest<COrder, OrderInfo> = this.rest.initRest<COrder, OrderInfo>('order_info');
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');

	total_funds: number = 0;
	total_income_payments: number = 0;
	total_expense_payments: number = 0;
	total_orders: number = 0;
	income_payments_count: number = 0;
	expense_payments_count: number = 0;
	ordenes_con_pagos: OrderInfo[] = [];

	total_pagos_de_ordenes: number = 0;
	total_otros_pagos: number = 0;
	total_movimientos_internos: number = 0;
	total_ingresos_efectivo: number = 0;
	total_ingresos_transferencia: number = 0;
	total_egresos_efectivo: number = 0;
	total_egresos_transferencia: number = 0;


	ngOnInit(): void {
		this.sink = this.route.paramMap.subscribe(params => {
			const id = params.get('id');
			if (id) {
				this.cash_close_id = parseInt(id);
				this.loadData();
			}
		});
	}

	loadData(): void {
		this.is_loading = true;

		console.log('Cargando detalle del corte de caja, id: ', this.cash_close_id);

		this.sink = this.rest_cash_close.get( this.cash_close_id ).subscribe({
			next: (response: Cash_Close) => {

				console.log('Respuesta del corte de caja: ', response);

				this.cash_close = response;

				this.loadPeriodData();

			},
			error: error => {
				console.error('Error al cargar el corte de caja: ', error);
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	loadPeriodData(): void {
		if (!this.cash_close) {
			return;
		}

		console.log('Cargando datos del periodo, corte: ', this.cash_close);

		const since = this.cash_close.since;
		const created = this.cash_close.created;
		

		const funds$ = this.rest_fund.search(
			{
				eq: {created_by_user_id: this.cash_close!.created_by_user_id },
				ge: { cashier_hour: since },
				le: { cashier_hour: created },
				limit: 9999	
			}
		);

		const payments$ = this.rest_payment_info.search(
			{
				eq: { status: 'ACTIVE', created_by_user_id: this.cash_close!.created_by_user_id, hades:1 },
				ge: { created: since },
				le: { created: created },
				limit: 9999
			}
		);

		const orders$ = this.rest_order_info.search(
			{
				eq: { status: 'CLOSED' , cashier_user_id: this.cash_close!.created_by_user_id },
				ge: { closed_timestamp: since },
				le: { closed_timestamp: created },
				limit: 9999
			}
		);

		this.sink = forkJoin({
			funds: funds$,
			payments: payments$,
			orders: orders$
		}).subscribe({
			next: (results) => {

				console.log('DATOS DEL CORTE CARGADOOOOOS');

				this.fund_list = results.funds.data || [];
				this.payment_info_list = results.payments.data || [];
				this.order_list = results.orders.data || [];

				let order_ids = this.getIds(this.payment_info_list);

				this.getOrderIdsList(order_ids);
				
				this.is_loading = false;
			},
			error: error => {

				console.error('Error al cargar los datos del periodo: ');
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	getOrderIdsList(order_ids:number[])
	{

		this.rest_order_info.search({eq:{hades:1},csv: {id: order_ids }, limit: 9999 })

		.subscribe({
			next: (response: RestResponse<OrderInfo>) => {
				this.ordenes_con_pagos = response.data || [];

				this.calculateTotals();
			},
			error: error => {
				this.showError(error);
			}
		});
	}


	getIds(payment_info_list: PaymentInfo[]): number[]
	{
		let id_ordenes =  [];

			for (let payment_info of this.payment_info_list)
				{

					for( let bm of payment_info.movements) 
					{
						for(let bmo of bm.bank_movement_orders)
						{
							id_ordenes.push(bmo.order_id);
						}
					}
				}

		return id_ordenes;
	}

	calculateTotals(): void {
		this.total_funds = 0 //this.fund_list.reduce((sum, item) => sum + item.fund.amount, 0);

		const income_payments = this.payment_info_list.filter(p => p.payment.type === 'income');
		const expense_payments = this.payment_info_list.filter(p => p.payment.type === 'expense');

		this.income_payments_count = income_payments.length;
		this.expense_payments_count = expense_payments.length;

		this.total_income_payments = income_payments
			.reduce((sum, item) => sum + item.payment.payment_amount, 0);

		this.total_expense_payments = expense_payments
			.reduce((sum, item) => sum + item.payment.payment_amount, 0);

		let sum_ingresos = 0;
		let sum_egresos = 0;
		let	total_pagos_de_ordenes: number = 0;
		let	total_otros_pagos: number = 0;
		let	total_movimientos_internos: number = 0;
		let	total_ingresos_efectivo: number = 0;
		let	total_ingresos_transferencia: number = 0;
		let total_egresos_efectivo: number = 0;
		let total_egresos_transferencia: number = 0;

		for(let payment_info of this.payment_info_list)
		{

			if( payment_info.payment.type == 'income' )
			{
				for( let bm of payment_info.movements) 
				{
					if(bm.bank_movement.transaction_type == 'CASH')
					{
						if(bm.bank_movement.currency_id == 'MXN')
						{
							console.log('Ingreso en efectivo MXN: ', bm.bank_movement.total);
						}
						else
						{
							console.log('Ingreso en efectivo otra moneda: ', bm.bank_movement.total);
						}

						console.log("Registramos ingreso en efectivo: ", bm.bank_movement.total * bm.bank_movement.exchange_rate);

						total_ingresos_efectivo += bm.bank_movement.total * bm.bank_movement.exchange_rate;
					}
					else
					{
						total_ingresos_transferencia += bm.bank_movement.total * bm.bank_movement.exchange_rate;
					}

					let total = bm.bank_movement.total * bm.bank_movement.exchange_rate;

					sum_ingresos += total;
				}
			}
			else
			{
				for( let bm of payment_info.movements) 
				{
					if(bm.bank_movement.transaction_type == 'CASH')
					{
						total_egresos_efectivo += bm.bank_movement.total * bm.bank_movement.exchange_rate;
					}
					else
					{
						total_egresos_transferencia += bm.bank_movement.total * bm.bank_movement.exchange_rate;
					}

					let total = bm.bank_movement.total * bm.bank_movement.exchange_rate;

					sum_egresos += total;
				}
			}
		}

		this.total_income_payments = sum_ingresos;
		this.total_expense_payments = sum_egresos;
		this.total_pagos_de_ordenes = total_pagos_de_ordenes;
		this.total_otros_pagos = total_otros_pagos;
		this.total_movimientos_internos = total_movimientos_internos;
		this.total_ingresos_efectivo = total_ingresos_efectivo;
		this.total_ingresos_transferencia = total_ingresos_transferencia;
		this.total_egresos_efectivo = total_egresos_efectivo;
		this.total_egresos_transferencia = total_egresos_transferencia;

		this.total_orders = this.order_list.reduce((sum, item) => sum + item.order.total, 0);
		// getUserName(user: User | null): string {
		// 	if (!user) return 'N/A';
		// 	return user.name || 'Sin nombre';
		// }
		}
	}

