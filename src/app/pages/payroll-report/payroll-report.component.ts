import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Payroll, Payroll_Concept, Payroll_Concept_Value, User, Work_Log } from '../../modules/shared/RestModels';
import { forkJoin, mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface CPayroll_Concept_Value extends Payroll_Concept_Value
{
	payroll_concept_name:string;
	type:string;
}

interface CWork_Log extends Work_Log
{
	day_name:string;
}

interface CPayrollInfo
{
	payroll:Payroll;
	work_logs:CWork_Log[];
	payroll_concept_values:CPayroll_Concept_Value[];
}

@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [CommonModule, BaseComponent, FormsModule, ShortDatePipe],
  templateUrl: './payroll-report.component.html',
  styleUrl: './payroll-report.component.css'
})
export class PayrollReportComponent extends BaseComponent implements OnInit {

	rest_work_log: RestSimple<Work_Log> = this.rest.initRestSimple<Work_Log>('work_log');
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_payroll_concept:RestSimple<Payroll_Concept> = this.rest.initRestSimple<Payroll_Concept>('payroll_concept');
	rest_payroll:RestSimple<Payroll> = this.rest.initRestSimple<Payroll>('payroll');
	rest_payroll_concept_value:RestSimple<Payroll_Concept_Value> = this.rest.initRestSimple<Payroll_Concept_Value>('payroll_concept_value');

	search_work_log_obj:SearchObject<Work_Log> = this.getEmptySearch();
	start_date:string = '';
	end_date:string = '';
	user_id:number | null = null;

	payroll_concept_list:Payroll_Concept[] = [];
	payroll_info:CPayrollInfo = GetEmpty.payroll_info();
	users_list:User[] = [];

	days_list:string[] = [
		'Lunes',
		'Martes',
		'Miercoles',
		'Jueves',
		'Viernes',
		'Sabado',
		'Domingo'
	];

	ngOnInit(): void {
		this.route.queryParamMap
		.pipe
		(
			mergeMap((params)=>
			{
				this.is_loading = true;
				let payroll_id;

				if ( params.has('id') )
				{
					payroll_id = parseInt(params.get('id') as string);
					this.path = 'edit-payroll';
				}
				else
				{
					this.path = 'create-payroll';
				}
				return forkJoin({
					users: this.rest_user.search({
						eq: { store_id: this.rest.user?.store_id, status: "ACTIVE" }
					}),
					payroll_concepts: this.rest_payroll_concept.search({limit:9999}),
					payroll: payroll_id ? this.rest_payroll.get({eq:{id: payroll_id}}) : of(null)
				})
			}),
			mergeMap((result)=>
			{
				console.log('result',result);
			
				return forkJoin({
					users: of(result.users),
					payroll_concepts: of(result.payroll_concepts),
					payroll: of(result.payroll),
					work_log: result.payroll ? this.rest_work_log.search({ge:{date: result.payroll.start_date}, le:{date: result.payroll.end_date}, eq:{user_id: result.payroll.user_id}}) : of(null),
					payroll_concept_values: result.payroll ? this.rest_payroll_concept_value.search({eq:{payroll_id: result.payroll.id}}) : of(null)
					
				})
			})
		)
		.subscribe((responses)=>
		{	
			let user = this.rest.user as User;

			this.users_list = responses.users.data;
			this.payroll_concept_list = responses.payroll_concepts.data;

			let work_log_list = responses.work_log ? responses.work_log.data : null;
			let payroll = responses.payroll ? responses.payroll : null;
			let payroll_concept_values = responses.payroll_concept_values ? responses.payroll_concept_values.data : null;
			
			if( payroll && work_log_list && payroll_concept_values)
			{
				this.user_id = payroll.user_id;
				this.start_date = payroll.start_date;
				this.end_date = payroll.end_date;
				this.payroll_info = 
				{
					payroll: payroll,
					work_logs: this.mapWorkLogs(work_log_list),
					payroll_concept_values: this.mapPayrollConceptValues(payroll_concept_values)
				}

				this.calculatePayrollTotal();
			}
			else
			{
				this.start_date = new Date().toISOString().split('T')[0];
				this.end_date = new Date().toISOString().split('T')[0];

				//build the payroll_concept_values
				let tmp_payroll_concept_values:Payroll_Concept_Value[] = [];
				this.payroll_concept_list.forEach((payroll_concept)=>
				{
					let payroll_concept_value = payroll_concept_values?.find((pcv)=>pcv.payroll_concept_id == payroll_concept.id);
					if (payroll_concept_value) 
					{
						tmp_payroll_concept_values.push(payroll_concept_value);
					}
					else
					{
						tmp_payroll_concept_values.push({
							id:0,
							payroll_id: 0,
							payroll_concept_id: payroll_concept.id,
							value: parseInt(payroll_concept.formula) ?? 0 //esto se debe cambiar para cuando se empiecen a usar formulas 
						});
					}
				});

				this.payroll_info =
				{
					payroll: {
						id:0,
						user_id: 0,
						store_id: user.store_id, //en teoria deben de ser de la misma tienda
						created_by_user_id: user.id,
						updated_by_user_id: user.id,
						start_date: this.start_date,
						end_date: this.end_date,
						subtotal:0,
						total:0,
						paid_status:"PENDING" as const,
						status:"ACTIVE" as const,
						created: new Date(),
						updated: new Date()
					},
					work_logs: [],
					payroll_concept_values: this.mapPayrollConceptValues(tmp_payroll_concept_values)
				}
			}

			console.log('work_log_list',work_log_list);
			console.log('payroll',payroll);
			console.log('payroll_concept_values',payroll_concept_values);
			console.log('payroll_info',this.payroll_info);

		});
	}

	searchWorkLogs()
	{
		//also, update the payroll_info.payroll with the user data
		let user = this.users_list.find((user)=>user.id == this.user_id);
		if (user)
		{
			this.payroll_info.payroll.user_id = user.id;
			this.payroll_info.payroll.store_id = user.store_id;
		}
		else
		{
			this.showError('No se encontro el usuario seleccionado');
			return;
		}
		console.log('payroll_info',this.payroll_info)
		if( this.user_id == null || this.start_date == '' || this.end_date == '')
		{
			this.showError('Es necesario seleccionar un usuario y un rango de fechas');
			return;
		}

		this.subs.sink = forkJoin({
			work_logs: this.rest_work_log.search({ge:{date: this.start_date}, le:{date: this.end_date}, eq:{user_id: this.user_id}})
		})
		.subscribe((responses)=>
		{
			if( responses.work_logs.data.length == 0 )
			{
				this.showError('No se encontraron registros de asistencia');
				return;
			}
			this.payroll_info.work_logs = this.mapWorkLogs(responses.work_logs.data);

			this.calculatePayrollTotal();
			console.log('payroll_info after search',this.payroll_info);	
		});
	}

	mapWorkLogs(work_logs:Work_Log[])
	{
		return work_logs.map((work_log)=>
		{
			let day = new Date(work_log.date).getDay();
			return {
				...work_log,
				day_name: this.days_list[day]
			}
		});
	}

	mapPayrollConceptValues(payroll_concept_values:Payroll_Concept_Value[])
	{
		return payroll_concept_values.map((payroll_concept_value)=>
		{
			let payroll_concept = this.payroll_concept_list.find((payroll_concept)=>payroll_concept.id == payroll_concept_value.payroll_concept_id);
			return {
				...payroll_concept_value,
				payroll_concept_name: payroll_concept?.name ?? '',
				type: payroll_concept?.type ?? ''
			}
		});
	}


	calculatePayrollTotal()
	{	
		//calculate subtotal
		this.payroll_info.payroll.subtotal = 0;

		this.payroll_info.work_logs.forEach((work_log) => {
			this.payroll_info.payroll.subtotal += work_log.total_payment;
		});

		this.payroll_info.payroll.total = this.payroll_info.payroll.subtotal;

		this.payroll_info.payroll_concept_values.forEach((payroll_concept_value)=>
		{	
			let payroll_concept = this.payroll_concept_list.find((payroll_concept)=>payroll_concept.id == payroll_concept_value.payroll_concept_id);

			if (payroll_concept) 
			{
				if (payroll_concept.type == "DEDUCTION") {
					this.payroll_info.payroll.total -= payroll_concept_value.value;
				}
				else
				{
					this.payroll_info.payroll.total += payroll_concept_value.value;
				}
			}
		});
		console.log('new total', this.payroll_info.payroll.total);
	}

	savePayroll(event:Event)
	{
		console.log(this.payroll_info);
		//PENDING
		this.showSuccess('Payroll saved');
	}
}
