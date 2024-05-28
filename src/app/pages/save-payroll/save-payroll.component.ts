import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Payroll, Payroll_Concept, Payroll_Concept_Value, User, Work_Log } from '../../modules/shared/RestModels';
import { forkJoin, mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { Utils } from '../../modules/shared/Utils';
import { RouterModule } from '@angular/router';

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
  selector: 'app-save-payroll',
  standalone: true,
  imports: [CommonModule, BaseComponent, RouterModule , FormsModule, ShortDatePipe],
  templateUrl: './save-payroll.component.html',
  styleUrl: './save-payroll.component.css'
})
export class SavePayrollComponent extends BaseComponent implements OnInit {

	rest_work_log: RestSimple<Work_Log> = this.rest.initRestSimple<Work_Log>('work_log');
	rest_user: RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_payroll_concept:RestSimple<Payroll_Concept> = this.rest.initRestSimple<Payroll_Concept>('payroll_concept');
	rest_payroll:RestSimple<Payroll> = this.rest.initRestSimple<Payroll>('payroll');
	rest_payroll_concept_value:RestSimple<Payroll_Concept_Value> = this.rest.initRestSimple<Payroll_Concept_Value>('payroll_concept_value');

	search_work_log_obj:SearchObject<Work_Log> = this.getEmptySearch();
	start_date:string = '';
	end_date:string = '';
	user_id:number | null = null;
	selected_user:User | null = null;

	payroll_concept_list:Payroll_Concept[] = [];
	payroll_info:CPayrollInfo = GetEmpty.payroll_info();
	users_list:User[] = [];
	selected_payroll_concept_id:number | null = null;

	days_list:string[] = [
		'Lunes',
		'Martes',
		'Miercoles',
		'Jueves',
		'Viernes',
		'Sabado',
		'Domingo'
	];

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.is_loading = true;
				let payroll_id;

				if ( param_map.has('id') )
				{
					payroll_id = parseInt(param_map.get('id') as string);
					this.path = 'edit-payroll';
				}
				else
				{
					this.path = 'create-payroll';
				}

				return forkJoin
				({
					users: this.rest_user.search
					({
						eq: { store_id: this.rest.user?.store_id, status: "ACTIVE" }
					}),
					payroll_concepts: this.rest_payroll_concept.search({limit:9999}),
					payroll: payroll_id ? this.rest_payroll.get(payroll_id) : of(null)
				})
			}),
			mergeMap((result)=>
			{
				return forkJoin
				({
					users: of(result.users),
					payroll_concepts: of(result.payroll_concepts),
					payroll: of(result.payroll),
					work_log: result.payroll ? this.rest_work_log.search({ge:{date: result.payroll.start_date}, le:{date: result.payroll.end_date}, eq:{user_id: result.payroll.user_id}}) : of(null),
					payroll_concept_values: result.payroll ? this.rest_payroll_concept_value.search({eq:{payroll_id: result.payroll.id, status:'ACTIVE'}}) : of(null)
					
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

				//add the concept values that are not in the payroll_concept_values 
				//(only those that are active & not in the payroll_concept_values & payroll.paid_status == 'PENDING')
				if (payroll.paid_status != 'PAID')
				{	
					this.payroll_concept_list.forEach((payroll_concept)=>
					{
						let payroll_concept_value = this.payroll_info.payroll_concept_values.find((pcv)=>pcv.payroll_concept_id == payroll_concept.id);
						if (!payroll_concept_value && payroll_concept.status == "ACTIVE")
						{
							this.payroll_info.payroll_concept_values.push
							({
								id:0,
								payroll_id: this.payroll_info.payroll.id,
								payroll_concept_id: payroll_concept.id,
								value: parseInt(payroll_concept.formula) ?? 0, //esto se debe cambiar para cuando se empiecen a usar formulas ,
								status: 'ACTIVE',
								payroll_concept_name: payroll_concept.name,
								type: payroll_concept.type
							});
						}
					});
				}

				this.selected_user = this.users_list.find((user)=>user.id == payroll?.user_id) as User;

				this.calculatePayrollTotal();
			}
			else
			{
				this.start_date = Utils.getMysqlStringFromDate(new Date()).split(' ')[0];
				this.end_date = Utils.getMysqlStringFromDate(new Date()).split(' ')[0];

				//build the payroll_concept_values
				let tmp_payroll_concept_values:Payroll_Concept_Value[] = [];
				this.payroll_concept_list.forEach((payroll_concept)=>
				{
					if(payroll_concept.status == "ACTIVE")
					{
						tmp_payroll_concept_values.push
						({
							id:0,
							payroll_id: 0,
							payroll_concept_id: payroll_concept.id,
							value: parseInt(payroll_concept.formula) ?? 0, //esto se debe cambiar para cuando se empiecen a usar formulas ,
							status: 'ACTIVE'
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
		});
	}

	onFechaInicialChange(fecha:string)
	{
		this.payroll_info.payroll.start_date = fecha;
	}

	onFechaFinalChange(fecha:string)
	{
		this.payroll_info.payroll.end_date = fecha;
	}

	searchWorkLogs()
	{
		if( this.user_id == null || this.start_date == '' || this.end_date == '')
		{
			this.showError('Es necesario seleccionar un usuario y un rango de fechas');
			return;
		}
		
		this.selected_user = this.users_list.find((user)=>user.id == this.user_id) as User;
		if (this.selected_user)
		{
			this.payroll_info.payroll.user_id = this.selected_user.id;
			this.payroll_info.payroll.store_id = this.selected_user.store_id;
		}
		else
		{
			//si ya tenia uno seleccionado, regresarlo a su estado anterior
			if(this.payroll_info.payroll.user_id != 0)
			{
				this.user_id = this.payroll_info.payroll.user_id;
			}
			this.showError('No se encontro el usuario seleccionado');
			return;
		}
		
		this.subs.sink = forkJoin
		({
			work_logs: this.rest_work_log.search({ge:{date: this.start_date}, le:{date: this.end_date}, eq:{user_id: this.user_id}})
		})
		.subscribe((responses)=>
		{
			if( responses.work_logs.data.length == 0 )
			{
				//si no se encontraron registros de asistencia, reiniciar el payroll_info
				this.payroll_info.payroll =
				{
					...this.payroll_info.payroll,
					id:0,
					user_id: this.user_id as number,
					start_date: this.start_date,
					end_date: this.end_date,
					subtotal:0,
					total:0,
				}
				this.payroll_info.work_logs = [];
				this.payroll_info.payroll_concept_values = [];
				this.showError('No se encontraron registros de asistencia');
				return;
			}
			this.payroll_info.work_logs = this.mapWorkLogs(responses.work_logs.data);

			this.calculatePayrollTotal();
		});
	}

	addNewConceptValue(evt: Event)
	{
		if( this.selected_payroll_concept_id == null)
		{
			this.showError('Es necesario seleccionar un concepto');
			return;
		}
		
		let payroll_concept = this.payroll_concept_list.find((payroll_concept)=>payroll_concept.id == this.selected_payroll_concept_id);
		
		if (!payroll_concept)
		{
			this.showError('No se encontro el concepto seleccionado');
			return;
		}

		this.payroll_info.payroll_concept_values.push
		({
			id:0,
			payroll_id: this.payroll_info.payroll.id,
			payroll_concept_id: payroll_concept.id,
			value: parseInt(payroll_concept.formula) ?? 0, //esto se debe cambiar para cuando se empiecen a usar formulas ,
			status: 'ACTIVE',
			payroll_concept_name: payroll_concept.name,
			type: payroll_concept.type
		});

		this.calculatePayrollTotal();
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

		this.payroll_info.work_logs.forEach((work_log) => 
		{
			this.payroll_info.payroll.subtotal += work_log.total_payment;
		});

		this.payroll_info.payroll.total = this.payroll_info.payroll.subtotal;

		this.payroll_info.payroll_concept_values.forEach((payroll_concept_value)=>
		{	
			let payroll_concept = this.payroll_concept_list.find((payroll_concept)=>payroll_concept.id == payroll_concept_value.payroll_concept_id);

			if (payroll_concept && payroll_concept_value.status == "ACTIVE") 
			{
				if (payroll_concept.type == "DEDUCTION")
				{
					this.payroll_info.payroll.total -= payroll_concept_value.value;
				}
				else
				{
					this.payroll_info.payroll.total += payroll_concept_value.value;
				}
			}
		});
	}

	savePayroll(event:Event)
	{
		this.searchWorkLogs();

		if( this.payroll_info.payroll.total <= 0 )
		{
			this.showError('El total de la nómina debe ser mayor a 0');
			return;
		}
		
		if (this.payroll_info.payroll.id == 0)
		{
			this.subs.sink = this.rest_payroll.create(this.payroll_info.payroll).pipe
			(
				mergeMap((response)=>
				{
					this.payroll_info.payroll = response;

					let payroll_concept_values:Partial<Payroll_Concept_Value>[] = [];
					this.payroll_info.payroll_concept_values.forEach((pcv)=>
					{
						if(pcv.status == 'ACTIVE')
						{
							payroll_concept_values.push({
								payroll_id: response.id,
								payroll_concept_id: pcv.payroll_concept_id,
								value: pcv.value,
							})
						}
					});
			
					return forkJoin
					({
						payroll: of(response),
						payroll_concept_values: this.rest_payroll_concept_value.batchCreate(payroll_concept_values)
					})
				})
			)
			.subscribe((response)=>
			{
				this.payroll_info.payroll_concept_values = response.payroll_concept_values.map((pcv)=>
				{
					let payroll_concept = this.payroll_concept_list.find((payroll_concept)=>payroll_concept.id == pcv.payroll_concept_id);
					return {
						...pcv,
						payroll_concept_name: payroll_concept?.name ?? '',
						type: payroll_concept?.type ?? ''
					}
				});
				this.showSuccess('Nómina creada correctamente');
			}, (error)=>
			{
				this.showError('Error creando nómina ' + error);
			});
		}
		else
		{
			//updating the payroll
			this.subs.sink = this.rest_payroll.update(this.payroll_info.payroll).pipe
			(
				mergeMap((response)=>
				{
					let payroll_concept_values:Payroll_Concept_Value[] = []
					this.payroll_info.payroll_concept_values.forEach((pcv)=>
					{
						//conceptos nuevos
						if(pcv.status=='ACTIVE' && pcv.id == 0)
						{
							payroll_concept_values.push({
								id: pcv.id,
								payroll_id: this.payroll_info.payroll.id,
								payroll_concept_id: pcv.payroll_concept_id,
								value: pcv.value,
								status: pcv.status
							})
						}

						//conceptos a actualizar
						if(pcv.id != 0)
						{
							payroll_concept_values.push({
								id: pcv.id,
								payroll_id: this.payroll_info.payroll.id,
								payroll_concept_id: pcv.payroll_concept_id,
								value: pcv.value,
								status: pcv.status
							})
						}
					});
			
					return forkJoin
					({
						payroll: of(response),
						payroll_concept_values: payroll_concept_values.length > 0 ? this.rest_payroll_concept_value.batchUpdate(payroll_concept_values) : of(null)
					})
				})
			)
			.subscribe((response)=>
			{
				if (response.payroll_concept_values)
				{
					this.payroll_info.payroll_concept_values = response.payroll_concept_values.map((pcv)=>
					{
						let payroll_concept = this.payroll_concept_list.find((payroll_concept)=>payroll_concept.id == pcv.payroll_concept_id);
						return {
							...pcv,
							payroll_concept_name: payroll_concept?.name ?? '',
							type: payroll_concept?.type ?? ''
						}
					});

				}
				this.showSuccess('Nómina actualizada correctamente');
			}, (error)=>
			{
				this.showError('Error actualizando nómina ');
			});
		}
	}

	removePayrollConceptValue(payroll_concept_value:CPayroll_Concept_Value)
	{
		//this.payroll_info.payroll_concept_values = this.payroll_info.payroll_concept_values.filter((pcv)=>pcv.payroll_concept_id != payroll_concept_value.payroll_concept_id);
		payroll_concept_value.status = 'DELETED'
		this.calculatePayrollTotal();
	}

	justPrint()
	{
		window.print()
	}

}
