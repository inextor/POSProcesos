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
  standalone: true,
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
			mergeMap((params)=>{

				return forkJoin({
					payroll_concept: this.rest_payroll_concept.search({limit:99999})
				})
			})
		).subscribe((responses)=>{
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
			this.showError('No payroll concept selected');
			return;
		}

		if( this.selected_payroll_concept.id != 0)
		{
			this.rest_payroll_concept.update(this.selected_payroll_concept).subscribe((response)=>{
				this.showSuccess('Payroll concept updated');
			}, (error)=>{
				this.showError('Error updating payroll concept');
			});
		}
		else
		{
			this.rest_payroll_concept.create(this.selected_payroll_concept).subscribe((response)=>{
				this.showSuccess('Payroll concept created');
				this.payroll_concept_list.push(response);
			}, (error)=>{
				this.showError('Error creating payroll concept');
			});
		}
		this.showPayrollModal = false;
	}

	deletePayrollConcept(payroll_concept_id:number)
	{
		//delete normally, with status update

		let payroll_concept = this.payroll_concept_list.find(payroll_concept=>payroll_concept.id == payroll_concept_id);
		if( payroll_concept)
		{
			//payroll_concept.status = 'DELETED';
		}
		
		this.rest_payroll_concept.update(payroll_concept).subscribe((response)=>{
			this.showSuccess('Payroll concept deleted');
			console.log('payroll concept deleted');
		}, (error)=>{
			this.showError('Error deleting payroll concept');
		});

		console.log('deleting payroll concept on list');

	}



}
