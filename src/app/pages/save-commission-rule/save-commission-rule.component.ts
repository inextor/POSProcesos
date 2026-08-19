import { Component, OnInit } from '@angular/core';

import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Commission_Rule } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { StoreSearchComponent } from "../../modules/shared/components/store-search/store-search.component";
import { PriceTypeSearchComponent } from "../../modules/shared/components/price-type-search/price-type-search.component";
import { ItemSearchComponent } from "../../modules/shared/components/item-search/item-search.component";
import { CategorySearchComponent } from "../../modules/shared/components/category-search/category-search.component";

@Component({
	selector: 'app-save-commission-rule',
	imports: [LoadingComponent, FormsModule, StoreSearchComponent, PriceTypeSearchComponent, ItemSearchComponent, CategorySearchComponent],
	templateUrl: './save-commission-rule.component.html',
	styleUrl: './save-commission-rule.component.css'
})
export class SaveCommissionRuleComponent extends BaseComponent implements OnInit
{
	commission_rule: Commission_Rule = GetEmpty.commission_rule();
	rest_commission_rule: RestSimple<Commission_Rule> = this.rest.initRestSimple('commission_rule', ['id', 'base_percent', 'discount_reduction_per_percent', 'price_type_id', 'status', 'store_id', 'item_id', 'category_id', 'created', 'updated']);

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
		if (!this.commission_rule.store_id && !this.commission_rule.price_type_id && !this.commission_rule.category_id && !this.commission_rule.item_id)
		{
			this.rest.showError('Se requiere al menos uno de: sucursal, tipo de precio, categoría o artículo');
			return;
		}

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
