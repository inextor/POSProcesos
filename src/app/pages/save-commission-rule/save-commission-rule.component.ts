import { Component, OnInit } from '@angular/core';

import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Commission_Rule } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { MAX_FORMULA_LENGTH, evaluateCommissionFormula } from '../../modules/shared/CommissionFormula';
import { LoadingComponent } from "../../components/loading/loading.component";
import { ModalComponent } from "../../components/modal/modal.component";
import { FormsModule } from '@angular/forms';
import { StoreSearchComponent } from "../../modules/shared/components/store-search/store-search.component";
import { PriceTypeSearchComponent } from "../../modules/shared/components/price-type-search/price-type-search.component";
import { ItemSearchComponent } from "../../modules/shared/components/item-search/item-search.component";
import { CategorySearchComponent } from "../../modules/shared/components/category-search/category-search.component";

@Component({
	selector: 'app-save-commission-rule',
	imports: [LoadingComponent, ModalComponent, FormsModule, StoreSearchComponent, PriceTypeSearchComponent, ItemSearchComponent, CategorySearchComponent],
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
	test_item_tax: number = 0;
	test_original_unitary_price: number = 500;
	preview_result: number | null = null;
	preview_error: string = '';
	formula_length: number = 0;

	show_formula_modal: boolean = false;
	modal_template: string = '';
	modal_title: string = '';
	modal_description: string = '';
	modal_percent: number = 10;
	modal_amount: number = 0;
	modal_discount_limit: number = 10;
	modal_reduction: number = 0.5;

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
					profit: this.test_item_total - item_total_cost,
					tax: this.test_item_tax,
					original_unitary_price: this.test_original_unitary_price
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

	openFormulaTemplate(template: string)
	{
		this.modal_template = template;

		if (template === 'percent')
		{
			this.modal_title = 'Porcentaje sobre venta';
			this.modal_description = 'Comisión = total de la partida × porcentaje. Ejemplo: 10% de una venta de $1,000 = $100.';
		}
		else if (template === 'fixed_qty')
		{
			this.modal_title = 'Monto fijo por pieza';
			this.modal_description = 'Comisión = cantidad × monto. Ejemplo: 2 piezas × $25 = $50.';
		}
		else if (template === 'profit')
		{
			this.modal_title = 'Porcentaje sobre utilidad';
			this.modal_description = 'Comisión = (total − costo) × porcentaje. Solo se comisiona sobre la ganancia.';
		}
		else if (template === 'discount_cap')
		{
			this.modal_title = 'Porcentaje con tope de descuento';
			this.modal_description = 'Si el descuento de la partida alcanza el tope, la comisión es $0. Si no, aplica el porcentaje sobre la venta.';
		}
		else if (template === 'discount_reduction')
		{
			this.modal_title = 'Porcentaje reducido por descuento';
			this.modal_description = 'Cada punto de descuento reduce el porcentaje base. Ejemplo: base 10% con 4% de descuento y reducción 0.5 → 8% efectivo.';
		}
		else if (template === 'flat')
		{
			this.modal_title = 'Monto fijo por concepto';
			this.modal_description = 'Comisión fija por partida, sin importar cantidad ni total.';
		}

		this.show_formula_modal = true;
	}

	applyFormulaTemplate()
	{
		let formula = '';

		if (this.modal_template === 'percent')
		{
			if (!(this.modal_percent > 0))
			{
				this.rest.showError('El porcentaje debe ser mayor a 0');
				return;
			}
			formula = 'return order_item.total * ' + (this.modal_percent / 100) + ';';
		}
		else if (this.modal_template === 'fixed_qty')
		{
			if (!(this.modal_amount > 0))
			{
				this.rest.showError('El monto debe ser mayor a 0');
				return;
			}
			formula = 'return order_item.qty * ' + this.modal_amount + ';';
		}
		else if (this.modal_template === 'profit')
		{
			if (!(this.modal_percent > 0))
			{
				this.rest.showError('El porcentaje debe ser mayor a 0');
				return;
			}
			formula = 'return order_item.profit * ' + (this.modal_percent / 100) + ';';
		}
		else if (this.modal_template === 'discount_cap')
		{
			if (!(this.modal_percent > 0))
			{
				this.rest.showError('El porcentaje debe ser mayor a 0');
				return;
			}
			if (!(this.modal_discount_limit > 0))
			{
				this.rest.showError('El tope de descuento debe ser mayor a 0');
				return;
			}
			formula = 'if (order_item.discount_percent >= ' + this.modal_discount_limit + ') return 0;\n'
				+ 'return order_item.total * ' + (this.modal_percent / 100) + ';';
		}
		else if (this.modal_template === 'discount_reduction')
		{
			if (!(this.modal_percent > 0))
			{
				this.rest.showError('El porcentaje base debe ser mayor a 0');
				return;
			}
			if (!(this.modal_reduction >= 0))
			{
				this.rest.showError('La reducción debe ser 0 o mayor');
				return;
			}
			formula = 'let effective_percent = ' + this.modal_percent + ' - (order_item.discount_percent * ' + this.modal_reduction + ');\n'
				+ 'if (effective_percent < 0) effective_percent = 0;\n'
				+ 'return order_item.total * effective_percent / 100;';
		}
		else if (this.modal_template === 'flat')
		{
			if (!(this.modal_amount > 0))
			{
				this.rest.showError('El monto debe ser mayor a 0');
				return;
			}
			formula = 'return ' + this.modal_amount + ';';
		}
		else
		{
			this.rest.showError('Plantilla desconocida');
			return;
		}

		this.commission_rule.formula = formula;
		this.show_formula_modal = false;
		this.updateFormulaPreview();
	}

	save($event: Event)
	{
		if (!this.commission_rule.store_id && !this.commission_rule.price_type_id && !this.commission_rule.category_id && !this.commission_rule.item_id)
		{
			this.rest.showError('Se requiere al menos uno de: sucursal, tipo de precio, categoría o artículo');
			return;
		}

		if (!this.commission_rule.formula || this.commission_rule.formula.trim() === '')
		{
			this.rest.showError('La fórmula es requerida, usa los botones de plantilla para generarla');
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
