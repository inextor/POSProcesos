import { Component, OnInit } from '@angular/core';

import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Commission_Rule } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { MAX_FORMULA_LENGTH, evaluateCommissionFormula } from '../../modules/shared/CommissionFormula';
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
	rest_commission_rule: RestSimple<Commission_Rule> = this.rest.initRestSimple('commission_rule', ['id', 'base_percent', 'discount_reduction_per_percent', 'formula', 'price_type_id', 'status', 'store_id', 'item_id', 'category_id', 'created', 'updated']);
	max_formula_length: number = MAX_FORMULA_LENGTH;

	test_order_total: number = 1000;
	test_order_discount: number = 100;
	test_item_total: number = 1000;
	test_item_discount: number = 0;
	test_item_discount_percent: number = 0;
	test_item_qty: number = 2;
	test_unitary_price: number = 500;
	test_unit_cost: number = 300;
	preview_result: number | null = null;
	preview_error: string = '';
	formula_length: number = 0;

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
				this.updateFormulaPreview();
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	updateFormulaPreview()
	{
		const formula = (this.commission_rule.formula || '').trim();
		this.formula_length = (this.commission_rule.formula || '').length;

		if (formula === '')
		{
			this.preview_result = null;
			this.preview_error = '';
			return;
		}

		const item_total_cost = this.test_item_qty * this.test_unit_cost;

		try
		{
			this.preview_result = evaluateCommissionFormula
			(
				formula,
				{
					id: 0,
					total: this.test_order_total,
					subtotal: this.test_order_total,
					discount: this.test_order_discount,
					price_type_id: this.commission_rule.price_type_id,
					store_id: this.commission_rule.store_id,
					closed_timestamp: null,
					amount_paid: this.test_order_total
				},
				{
					id: 0,
					item_id: this.commission_rule.item_id || 0,
					category_id: this.commission_rule.category_id,
					qty: this.test_item_qty,
					unitary_price: this.test_unitary_price,
					total: this.test_item_total,
					subtotal: this.test_item_total,
					discount: this.test_item_discount,
					discount_percent: this.test_item_discount_percent,
					unit_cost: this.test_unit_cost,
					total_cost: item_total_cost,
					profit: this.test_item_total - item_total_cost
				},
				{
					id: this.commission_rule.id,
					base_percent: Number(this.commission_rule.base_percent || 0),
					discount_reduction_per_percent: Number(this.commission_rule.discount_reduction_per_percent || 0)
				},
				{
					amount_paid_in_period: this.test_order_total,
					paid_ratio: 1,
					date_start: '',
					date_end: ''
				}
			);
			this.preview_error = '';
		}
		catch (error)
		{
			this.preview_result = null;
			this.preview_error = error instanceof Error ? error.message : String(error);
		}
	}

	loadExampleFormula()
	{
		this.commission_rule.formula = 'let y = 0;\n'
			+ 'let discount_percent = ((order.discount / order.total) + (order_item.discount / order_item.total)) / 2;\n'
			+ 'if (discount_percent < 10) y = 1;\n'
			+ 'if (y == 1)\n'
			+ '  return order_item.total * 0.10;\n'
			+ 'return 0;';
		this.updateFormulaPreview();
	}

	save($event: Event)
	{
		if (!this.commission_rule.store_id && !this.commission_rule.price_type_id && !this.commission_rule.category_id && !this.commission_rule.item_id)
		{
			this.rest.showError('Se requiere al menos uno de: sucursal, tipo de precio, categoría o artículo');
			return;
		}

		if (this.commission_rule.formula && this.commission_rule.formula.length > this.max_formula_length)
		{
			this.rest.showError('La fórmula excede el máximo de ' + this.max_formula_length + ' caracteres');
			return;
		}

		if (this.preview_error !== '')
		{
			this.rest.showError('La fórmula tiene errores: ' + this.preview_error);
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
