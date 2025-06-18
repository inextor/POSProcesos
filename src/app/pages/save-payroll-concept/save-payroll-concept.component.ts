import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Payroll_Concept } from '../../modules/shared/RestModels';
import { forkJoin, mergeMap } from 'rxjs';
import { ModalComponent } from '../../components/modal/modal.component';

@Component({
    selector: 'app-save-payroll-concept',
    imports: [CommonModule, BaseComponent, FormsModule, ModalComponent],
    templateUrl: './save-payroll-concept.component.html',
    styleUrl: './save-payroll-concept.component.css'
})
export class SavePayrollConceptComponent extends BaseComponent implements OnInit {

	rest_payroll_concept:RestSimple<Payroll_Concept> = this.rest.initRestSimple<Payroll_Concept>('payroll_concept');

	payroll_concept_list:Payroll_Concept[] = [];
	selected_payroll_concept:Payroll_Concept|null = null;

	showPayrollModal:boolean = false;

	ngOnInit(): void {
		this.route.queryParamMap.pipe
		(
			mergeMap((params)=>
			{

				return forkJoin
				({
					payroll_concept: this.rest_payroll_concept.search({ eq:{status: "ACTIVE"}, limit:99999})
				})

			})
		)
		.subscribe((responses)=>
		{
			this.payroll_concept_list = responses.payroll_concept.data;
		});
	}

	showEditPayrollConcept(payroll_concept_id:number | null)
	{
		if (payroll_concept_id == null)
		{
			this.selected_payroll_concept = {
				id: 0,
				name: '',
				type: 'DEDUCTION' as const,
				formula: '',
				status: 'ACTIVE'
			};
		}
		else 
		{
			let payroll_concept = this.payroll_concept_list.find(payroll_concept => payroll_concept.id == payroll_concept_id);
			if( payroll_concept )
			{
				this.selected_payroll_concept = this.payroll_concept_list.find(payroll_concept => payroll_concept.id == payroll_concept_id) || null;
			}
			else
			{
				this.showError('Payroll concept not found');
				return;
			}
		}
		this.showPayrollModal = true;
	}

	savePayrollConcept(evt:Event)
	{
		evt.preventDefault();
		if(!this.selected_payroll_concept)
		{
			this.showError('No ha seleccionado un concepto de nómina');
			return;
		}

		if( this.selected_payroll_concept.id != 0)
		{
			this.rest_payroll_concept.update(this.selected_payroll_concept).subscribe((response)=>
			{
				this.showSuccess('Concepto de nómina actualizado');
			}, (error)=>
			{
				this.showError('Error actualizando concepto de nómina');
			});
		}
		else
		{
			this.rest_payroll_concept.create(this.selected_payroll_concept).subscribe((response)=>
			{
				this.showSuccess('Concepto de nómina creado');
				this.payroll_concept_list.push(response);
			}, (error)=>
			{
				this.showError('Error creando concepto de nómina');
			});
		}
		this.showPayrollModal = false;
	}

	deletePayrollConcept(payroll_concept:Payroll_Concept)
	{
		this.subs.sink = this.confirmation.showConfirmAlert(payroll_concept, 'Eliminar concepto de nómina', '¿Está seguro que desea eliminar el concepto de nómina?')
		.subscribe((response)=>
		{
			if(response.accepted)
			{
				this.rest_payroll_concept.update({...payroll_concept, status: "DELETED"})
				.subscribe((response)=>
				{
					this.showSuccess('Concepto de nómina eliminado');
					payroll_concept.status = 'DELETED';
					this.payroll_concept_list = this.payroll_concept_list.filter((pc)=>{ return pc.id != payroll_concept.id});
				}, (error)=>
				{
					this.showError('Error deleting payroll concept');
				});				
			}
		});
	}



}
