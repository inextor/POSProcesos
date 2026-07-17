import { Component, OnInit } from '@angular/core';

import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Commission_Rule } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-save-commission-rules',
	imports: [LoadingComponent, FormsModule],
	templateUrl: './save-commission-rules.component.html',
	styleUrl: './save-commission-rules.component.css'
})
export class SaveCommissionRulesComponent extends BaseComponent implements OnInit
{
	commission_rule: Commission_Rule = GetEmpty.commission_rule();
	rest_commission_rule: RestSimple<Commission_Rule> = this.rest.initRestSimple('commission_rule', ['id', 'base_percent', 'discount_reduction_per_percent', 'price_type_id', 'status', 'store_id', 'created', 'updated']);

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map) =>
			{
				if (param_map.has('id'))
				{
					return this.rest_commission_rule.get(param_map.get('id'));
				}

				return of(GetEmpty.commission_rule());
			})
		)
		.subscribe
		({
			next: (response: Commission_Rule) =>
			{
				this.is_loading = false;
				this.commission_rule = response;
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	save($event: Event)
	{
		let on_response =
		{
			next: (response: Commission_Rule) =>
			{
				this.is_loading = false;
				this.location.back();
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		}

		this.subs.sink = this.commission_rule.id
			? this.rest_commission_rule.update(this.commission_rule).subscribe(on_response)
			: this.rest_commission_rule.create(this.commission_rule).subscribe(on_response);
	}
}
