import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Work_log_rules } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { mergeMap } from 'rxjs';
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

	rest_work_log_rules:RestSimple<Work_log_rules> = this.rest.initRestSimple('work_log_rules');

	work_log_rules:Work_log_rules = GetEmpty.work_log_rules();
	array_rules:Rule[] = [];

	ngOnInit(): void {
		this.subs.sink = this.route.queryParamMap
		.pipe
		(
			mergeMap(params => {
				let store_id = this.rest.user?.store_id as number;
				this.is_loading = true;
				return this.rest_work_log_rules.search({ eq:{store_id: store_id} ,limit: 1 });
			})
		)
		.subscribe({
			next: (result) => {
				this.is_loading = false;
				this.work_log_rules = result.data[0];
				if( this.work_log_rules )
					this.buildRules();
			},
			error: (error) => {
				this.showError(error);
			}
		});
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
		this.is_loading = true;

		//convert array to object
		let rules:Record<string, string> = {};
		this.array_rules.forEach((rule) => {
			let key = rule.key.split(' ').join('_');
			rules[key] = rule.value;
		});

		console.log(rules);
		console.log(this.work_log_rules);
		if(!this.work_log_rules)
		{
			this.work_log_rules = GetEmpty.work_log_rules();
			this.work_log_rules.store_id = this.rest.user?.store_id as number;
		}
		this.work_log_rules.json_rules = rules;

		//RULE PARA TECATE
		// user.master ? production.total_prod * 0.2 : (production.total_prod * 0.1) / production.total_users

		this.subs.sink = this.rest_work_log_rules.update(this.work_log_rules)
		.subscribe({
			next: (result) => {
				this.showSuccess('Reglas guardadas');
			},
			error: (error) => {
				this.showError(error);
			}
		});
	}

}
