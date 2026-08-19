import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Production_Area, Work_Log_Rules } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { GetEmpty } from '../../modules/shared/GetEmpty';


interface Rule {
	key: string;
	value: string;
}

@Component({
    selector: 'app-save-worklog-rules',
    imports: [FormsModule],
    templateUrl: './save-worklog-rules.component.html',
    styleUrl: './save-worklog-rules.component.css'
})
export class SaveWorklogRulesComponent extends BaseComponent implements OnInit {

	rest_work_log_rules:RestSimple<Work_Log_Rules> = this.rest.initRestSimple('work_log_rules');
	rest_production_area:RestSimple<Production_Area> = this.rest.initRestSimple('production_area');

	work_log_rules:Work_Log_Rules = GetEmpty.work_log_rules();
	array_rules:Rule[] = [];

	production_area_list:Production_Area[] = [];
	production_area_id:number | null = null;

	ngOnInit(): void {

		this.path = 'save-worklog-rules';

		this.subs.sink = this.route.queryParamMap
		.pipe
		(
			mergeMap(params => {
				this.is_loading = true;

				let param_area = params.get('eq.production_area_id');
				this.production_area_id = param_area && param_area !== 'null' ? parseInt( param_area ) : null;

				return forkJoin
				({
					production_area: this.rest_production_area.search({ eq:{ status:'ACTIVE' }, limit: 9999, sort_order:['name_ASC'] }),
					//Las reglas viven por area; mientras no se elija una no hay nada que cargar
					rules: this.production_area_id
						? this.rest_work_log_rules.search({ eq:{ production_area_id: this.production_area_id }, limit: 1 })
						: of(null)
				});
			})
		)
		.subscribe({
			next: (result) => {
				this.is_loading = false;

				this.production_area_list = result.production_area.data;

				//Reiniciar siempre: buildRules solo agrega, y al cambiar de area se duplicarian los renglones
				this.array_rules = [];
				this.work_log_rules = result.rules?.data[0] ?? GetEmpty.work_log_rules();

				if( this.work_log_rules.id )
				{
					this.buildRules();
				}
			},
			error: (error) => {
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

	onAreaChange()
	{
		this.router.navigate([this.path], { queryParams: { 'eq.production_area_id': this.production_area_id } });
	}

	buildRules()
	{
		if (!this.work_log_rules.json_rules)
		{
			this.work_log_rules.json_rules = {};
		}
		else
		{
			Object.keys(this.work_log_rules.json_rules).forEach((key) => {
				this.array_rules.push({key: key, value: this.work_log_rules.json_rules[key]});
			});
		}
	}

	addRule()
	{
		this.array_rules.push({key: '', value: ''});
	}

	removeRule(index: number)
	{
		this.array_rules.splice(index, 1);
	}

	save(evt: Event)
	{
		evt.preventDefault();

		if( !this.production_area_id )
		{
			this.showWarning('Selecciona un área de producción');
			return;
		}

		//convert array to object
		let rules:Record<string, string> = {};
		this.array_rules.forEach((rule) => {
			let key = rule.key.split(' ').join('_');
			rules[key] = rule.value;
		});

		this.work_log_rules.json_rules = rules;
		this.work_log_rules.production_area_id = this.production_area_id;

		//store_id ya no decide a quien se le aplica la regla, pero la columna sigue siendo NOT NULL:
		//se llena con la sucursal del area para que el registro quede coherente.
		let area = this.production_area_list.find((pa) => pa.id == this.production_area_id);

		if( area )
		{
			this.work_log_rules.store_id = area.store_id;
		}

		this.is_loading = true;

		//El backend hace upsert: sin id inserta, con id actualiza
		this.subs.sink = this.rest_work_log_rules.update(this.work_log_rules)
		.subscribe({
			next: (result) => {
				this.is_loading = false;
				this.work_log_rules = result;
				this.showSuccess('Reglas guardadas');
			},
			error: (error) => {
				this.is_loading = false;
				this.showError(error);
			}
		});
	}

}
