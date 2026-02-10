import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest } from '../../modules/shared/services/Rest';
import { Transformation, Transformation_Input, Transformation_Output } from '../../modules/shared/RestModels';
import { TransformationInfo, ItemInfo } from '../../modules/shared/Models';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from '../../components/loading/loading.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';

interface InputRow {
	transformation_input: Partial<Transformation_Input>;
	item_info: ItemInfo | null;
	search_str: string;
}

interface OutputRow {
	transformation_output: Partial<Transformation_Output>;
	item_info: ItemInfo | null;
	search_str: string;
}

@Component({
	selector: 'app-save-transformation',
	imports: [CommonModule, FormsModule, LoadingComponent, SearchItemsComponent],
	templateUrl: './save-transformation.component.html',
	styleUrl: './save-transformation.component.css'
})
export class SaveTransformationComponent extends BaseComponent implements OnInit {
	transformation_info: TransformationInfo = GetEmpty.transformation_info();
	rest_transformation_info: Rest<Transformation, TransformationInfo> = this.rest.initRest('transformation_info', ['name', 'id', 'created', 'updated', 'status', 'provider_user_id', 'reference', 'note']);

	input_rows: InputRow[] = [];
	output_rows: OutputRow[] = [];

	ngOnInit() {
		this.sink = this.route.paramMap.pipe(
			mergeMap((param_map) => {
				if (param_map.has('id')) {
					return this.rest_transformation_info.get(param_map.get('id'));
				}
				return of(GetEmpty.transformation_info());
			})
		).subscribe({
			next: (response: TransformationInfo) => {
				this.is_loading = false;
				this.transformation_info = response;
				this.initRows();
			},
			error: (error: any) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	initRows() {
		this.input_rows = this.transformation_info.inputs.map(input => ({
			transformation_input: input,
			item_info: input.item ? { item: input.item, category: null, prices: [], options: [], exceptions: [], records: [], serials: [], item_options: [] } : null,
			search_str: input.item?.name || ''
		}));

		this.output_rows = this.transformation_info.outputs.map(output => ({
			transformation_output: output,
			item_info: output.item ? { item: output.item, category: null, prices: [], options: [], exceptions: [], records: [], serials: [], item_options: [] } : null,
			search_str: output.item?.name || ''
		}));

		if (this.input_rows.length === 0) {
			this.addInputRow();
		}
		if (this.output_rows.length === 0) {
			this.addOutputRow();
		}
	}

	addInputRow() {
		this.input_rows.push({
			transformation_input: GetEmpty.transformation_input(),
			item_info: null,
			search_str: ''
		});
	}

	addOutputRow() {
		this.output_rows.push({
			transformation_output: GetEmpty.transformation_output(),
			item_info: null,
			search_str: ''
		});
	}

	removeInputRow(index: number) {
		this.input_rows.splice(index, 1);
		if (this.input_rows.length === 0) {
			this.addInputRow();
		}
	}

	removeOutputRow(index: number) {
		this.output_rows.splice(index, 1);
		if (this.output_rows.length === 0) {
			this.addOutputRow();
		}
	}

	onInputItemSelected(item_info: ItemInfo, row: InputRow) {
		row.item_info = item_info;
		row.transformation_input.item_id = item_info.item.id;
		row.search_str = item_info.item.name;
	}

	onOutputItemSelected(item_info: ItemInfo, row: OutputRow) {
		row.item_info = item_info;
		row.transformation_output.item_id = item_info.item.id;
		row.search_str = item_info.item.name;
	}

	save($event: Event) {
		$event.preventDefault();

		const valid_inputs = this.input_rows.filter(row => row.transformation_input.item_id && row.transformation_input.quantity);
		const valid_outputs = this.output_rows.filter(row => row.transformation_output.item_id && row.transformation_output.quantity);

		if (valid_inputs.length === 0) {
			this.rest.showError('Debe agregar al menos una entrada');
			return;
		}

		if (valid_outputs.length === 0) {
			this.rest.showError('Debe agregar al menos una salida');
			return;
		}

		const payload = {
			transformation: this.transformation_info.transformation,
			inputs: valid_inputs.map(row => ({
				item_id: row.transformation_input.item_id,
				quantity: row.transformation_input.quantity
			})),
			outputs: valid_outputs.map(row => ({
				item_id: row.transformation_output.item_id,
				quantity: row.transformation_output.quantity
			}))
		};

		this.is_loading = true;

		const on_response = {
			next: (response: TransformationInfo) => {
				this.is_loading = false;
				this.rest.showSuccess('Transformación guardada correctamente');
				this.location.back();
			},
			error: (error: any) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		};

		this.subs.sink = this.transformation_info.transformation.id
			? this.rest_transformation_info.update(payload).subscribe(on_response)
			: this.rest_transformation_info.create(payload).subscribe(on_response);
	}
}
