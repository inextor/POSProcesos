import { Component, OnInit } from '@angular/core';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Ecommerce, Profile } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of, Observable } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-save-ecommerce-profile',
	templateUrl: './save-ecommerce-profile.component.html',
	styleUrls: ['./save-ecommerce-profile.component.css'],
	standalone: true,
	imports: [LoadingComponent, FormsModule, CommonModule]
})
export class SaveEcommerceProfileComponent extends BaseComponent implements OnInit {

	ecommerce_profile: Profile = GetEmpty.ecommerce_profile();
	rest_ecommerce_profile: RestSimple<Profile> = this.rest.initRestSimple('ecommerce_profile');
	ecommerce: Ecommerce = GetEmpty.ecommerce();
	rest_ecommerce: RestSimple<Ecommerce> = this.rest.initRestSimple('ecommerce');

		ngOnInit() {
		this.subs.sink = this.route.paramMap.pipe(
			mergeMap((param_map) => {
				this.is_loading = true; // Set loading to true at the start of data fetching

				if( !param_map.has('ecommerce_id') )
				{
					//Must never happen if occour we only we display an error
					this.showError('No se econtrol el id del perfil notificar al programador');
					throw new Error('No se econtrol el id del perfil notificar al programador');
				}
				//aways must
				const ecommerceId = param_map.get('ecommerce_id');

				return forkJoin({
					profile: of( GetEmpty.ecommerce_profile() ),
					ecommerce: this.rest_ecommerce.get(ecommerceId)
				});
			})
		).subscribe({
				next: (response) => {
					this.ecommerce = response.ecommerce;
					this.ecommerce_profile = response.profile;
					this.ecommerce_profile.ecommerce_id = this.ecommerce.id;
					this.is_loading = false;
				},
				error: (error) => {
					this.is_loading = false;
					this.rest.showError(error);
				}
			});
	}

	save() {
	//The update must never happen we will set the code ther if needed
		this.is_loading = true;
		this.subs.sink = (this.ecommerce_profile.id ?
			this.rest_ecommerce_profile.update(this.ecommerce_profile) :
			this.rest_ecommerce_profile.create(this.ecommerce_profile)
		).subscribe({
			error: (error) => this.rest.showError(error),
			next: (response) => {
				this.is_loading = false;
				this.location.back();
			},
		});
	}
}
