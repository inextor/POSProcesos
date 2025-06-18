import { Component, OnInit } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { FormsModule } from '@angular/forms';
import { User, User_extra_fields } from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { forkJoin, mergeMap } from 'rxjs';
import { RestSimple } from '../../modules/shared/services/Rest';
import { RouterModule } from '@angular/router';

interface ExtraField {
	key: string;
	value: string;
}

@Component({
    selector: 'app-save-user-extra-fields',
    imports: [BaseComponent, FormsModule, RouterModule],
    templateUrl: './save-user-extra-fields.component.html',
    styleUrl: './save-user-extra-fields.component.css'
})
export class SaveUserExtraFieldsComponent extends BaseComponent implements OnInit{

	rest_user:RestSimple<User> = this.rest.initRestSimple('user');
	rest_user_extra_fields:RestSimple<User_extra_fields> = this.rest.initRestSimple('user_extra_fields');

	user:User = GetEmpty.user();
	user_extra_fields:User_extra_fields = GetEmpty.user_extra_fields(0);
	array_extra_fields:ExtraField[] = [];

	ngOnInit(): void {
		this.subs.sink = this.route.paramMap
		.pipe
		(
			mergeMap(params => {
				this.is_loading = true;
				let user_id = parseInt(params.get('user_id') as string);
				this.user_extra_fields = GetEmpty.user_extra_fields(user_id);

				return forkJoin({
					user: this.rest_user.get(user_id),
					user_extra_fields: this.rest_user_extra_fields.search({eq: {user_id: user_id}, limit: 1})
				});
			})
		)
		.subscribe({
			next: (result) => {

				this.is_loading = false;
				this.user = result.user;

				if(result.user_extra_fields.data.length > 0)
				{
					this.user_extra_fields = result.user_extra_fields.data[0];

					Object.keys(this.user_extra_fields.json_fields).forEach((key) => {
						this.array_extra_fields.push({key: key, value: this.user_extra_fields.json_fields[key]});
					});
				}
			},
			error: (error) => {
				this.showError(error);
			}
		});
	}

	addExtraField()
	{
		this.array_extra_fields.push({key: '', value: ''});
	}

	removeExtraField(index: number)
	{
		this.array_extra_fields.splice(index, 1);
	}

	save(evt: Event)
	{
		evt.preventDefault();
		this.is_loading = true;

		let json_fields:Record<string, string> = {};
		this.array_extra_fields.forEach((field) => {
			let key = field.key.split(' ').join('_');
			json_fields[key] = field.value;
		});

		console.log(json_fields);
		console.log(this.user_extra_fields);
		
		this.user_extra_fields.json_fields = json_fields;

		this.subs.sink = this.rest_user_extra_fields.update(this.user_extra_fields)
		.subscribe({
			next: (result) => {
				this.showSuccess('Campos extra guardados correctamente');
				this.router.navigate(['/users-checking-clock']);
			},
			error: (error) => {
				this.showError(error);
			}
		});
	}
}
