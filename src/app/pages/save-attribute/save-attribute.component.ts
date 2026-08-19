import { Component, OnInit } from '@angular/core';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Attribute } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-save-attribute',
    imports: [LoadingComponent, FormsModule, RouterModule],
    templateUrl: './save-attribute.component.html',
    styleUrl: './save-attribute.component.css'
})
export class SaveAttributeComponent extends BaseComponent implements OnInit {
	attribute: Attribute = GetEmpty.attribute();
	rest_attribute: RestSimple<Attribute> = this.rest.initRestSimple('attribute', ['name', 'id', 'created', 'updated']);

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map) =>
			{
				if (param_map.has('id'))
				{
					this.is_loading = true;
					return this.rest_attribute.get(param_map.get('id'));
				}

				return of(GetEmpty.attribute());
			})
		)
		.subscribe
		({
			next: (response: Attribute) =>
			{
				this.is_loading = false;
				this.attribute = response;
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	save()
	{
		this.is_loading = true;
		let on_response =
		{
			next: (response: Attribute) =>
			{
				this.is_loading = false;
				this.rest.showSuccess('Guardado correctamente');
				this.location.back();
			},
			error: (error: any) =>
			{
				this.is_loading = false;
				this.rest.showError(error);
			}
		}

		this.subs.sink = this.attribute.id
			? this.rest_attribute.update(this.attribute).subscribe(on_response)
			: this.rest_attribute.create(this.attribute).subscribe(on_response);
	}
}
