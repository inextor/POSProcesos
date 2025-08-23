import { Component, OnInit } from '@angular/core';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Ecommerce, Ecommerce_Profile } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from "../../components/pagination/pagination.component";
import { RouterLink } from '@angular/router';
import { GetEmpty } from '../../modules/shared/GetEmpty';

@Component({
	selector: 'app-list-ecommerce-profile',
	templateUrl: './list-ecommerce-profile.component.html',
	styleUrls: ['./list-ecommerce-profile.component.css'],
	standalone: true,
	imports: [LoadingComponent, FormsModule, CommonModule, PaginationComponent, RouterLink]
})
export class ListEcommerceProfileComponent extends BaseComponent implements OnInit {

	ecommerce_profiles: Ecommerce_Profile[] = [];
	rest_ecommerce_profile: RestSimple<Ecommerce_Profile> = this.rest.initRestSimple('ecommerce_profile');
	search_ecommerce_profile: SearchObject<Ecommerce_Profile> = this.rest_ecommerce_profile.getEmptySearch();

	ecommerce: Ecommerce = GetEmpty.ecommerce();
	rest_ecommerce: RestSimple<Ecommerce> = this.rest.initRestSimple('ecommerce');

	ngOnInit() {
		this.search_ecommerce_profile.limit = this.page_size;
		this.search_ecommerce_profile.sort_order = ['name_ASC'];

		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map) => {
				this.is_loading = true;
				const ecommerceId = param_map.get('ecommerce_id');

				if (!ecommerceId) {
					this.showError('Ecommerce ID not found in route');
					throw new Error('Ecommerce ID not found in route');
				}

				this.search_ecommerce_profile.eq.ecommerce_id = parseInt(ecommerceId) as number;

				return forkJoin({
					ecommerce: this.rest_ecommerce.get(ecommerceId),
					profiles: this.rest_ecommerce_profile.search(this.search_ecommerce_profile)
				});
			})
		).subscribe({
			next: (response) => {
				this.ecommerce = response.ecommerce;
				this.ecommerce_profiles = response.profiles.data;
				this.setPages(this.search_ecommerce_profile.page, response.profiles.total);
				this.is_loading = false;
			},
			error: (error) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}
}
