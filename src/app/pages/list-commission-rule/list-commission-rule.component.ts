import { Component, OnInit } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Commission_Rule } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";
import { ConfirmationResult, ConfirmationService } from '../../modules/shared/services/confirmation.service';

@Component({
	selector: 'app-list-commission-rule',
	imports: [RouterModule, ShortDatePipe],
	templateUrl: './list-commission-rule.component.html',
	styleUrl: './list-commission-rule.component.css'
})
export class ListCommissionRuleComponent extends BaseComponent implements OnInit {
	rest_commission_rule: RestSimple<Commission_Rule> = this.rest.initRestSimple('commission_rule', ['id', 'base_percent', 'discount_reduction_per_percent', 'status', 'created', 'updated']);
	search_commission_rule: SearchObject<Commission_Rule> = this.rest_commission_rule.getEmptySearch();
	commission_rule_list: Commission_Rule[] = [];

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap) =>
			{
				this.search_commission_rule = this.rest_commission_rule.getSearchObject(paramMap);
				this.search_commission_rule.limit = this.page_size;
				this.current_page = this.search_commission_rule.page;
				return this.rest_commission_rule.search(this.search_commission_rule);
			})
		).subscribe((response) => {
				this.is_loading = false;
				this.commission_rule_list = response.data;
				this.setPages(this.current_page, response.total);
			});
	}

	delete(rule: Commission_Rule)
	{
		this.sink = this.confirmation.showConfirmAlert(null, 'Confirmación', '¿Estás seguro de que quieres eliminar esta regla de comisión?', 'Sí', 'No').pipe
		(
			filter((x: ConfirmationResult) => x.accepted),
			mergeMap(() => this.rest_commission_rule.delete(rule))
		)
		.subscribe({
			next: () =>
			{
				this.commission_rule_list = this.commission_rule_list.filter(r => r.id !== rule.id);
			},
			error: (error: any) =>
			{
				this.rest.showError(error);
			}
		});
	}
}
