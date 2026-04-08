import { Component, OnInit } from '@angular/core';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Storage_Type } from '../../modules/shared/RestModels';
import { BaseComponent } from './../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-save-storage-type',
    imports: [LoadingComponent, FormsModule, RouterModule],
    templateUrl: './save-storage-type.component.html',
    styleUrl: './save-storage-type.component.css'
})
export class SaveStorageTypeComponent extends BaseComponent implements OnInit {
	storage_type: Storage_Type = GetEmpty.storage_type();
	rest_storage_type: RestSimple<Storage_Type> = this.rest.initRestSimple('storage_type',['name','id','created','updated','sort_weight']);

	ngOnInit()
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map) =>
			{
				if (param_map.has('id'))
				{
					this.is_loading = true;
					return this.rest_storage_type.get(param_map.get('id'));
				}

				return of(GetEmpty.storage_type());
			})
		)
		.subscribe
		({
			next: (response: Storage_Type) =>
			{
				this.is_loading = false;
				this.storage_type = response;
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
			next: (response: Storage_Type) =>
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

		this.subs.sink = this.storage_type.id
			? this.rest_storage_type.update(this.storage_type).subscribe(on_response)
			: this.rest_storage_type.create(this.storage_type).subscribe(on_response);
	}
}
