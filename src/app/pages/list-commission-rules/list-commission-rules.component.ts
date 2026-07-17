import { Component, OnInit } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Commission_Rule } from '../../modules/shared/RestModels';
import { mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";

@Component({
	selector: 'app-list-commission-rules',
	imports: [RouterModule, ShortDatePipe],
	templateUrl: './list-commission-rules.component.html',
	styleUrl: './list-commission-rules.component.css'
})
export class ListCommissionRulesComponent extends BaseComponent implements OnInit {
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
}
