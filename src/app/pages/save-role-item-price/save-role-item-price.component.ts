import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Production_Role_Price, Role } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { forkJoin, mergeMap, of } from 'rxjs';

@Component({
	selector: 'app-save-role-item-price',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './save-role-item-price.component.html',
	styleUrl: './save-role-item-price.component.css'
})
export class SaveRoleItemPriceComponent extends BaseComponent implements OnInit
{
	rest_role_item_price: RestSimple<Production_Role_Price> = this.rest.initRest('role_item_price',['id','name','price','created','updated']);
	rest_role: RestSimple<Role> = this.rest.initRest('role',['id','name','created','updated']);
	role_list: Role[] = [];

	ngOnInit(): void
	{
		this.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.path = '/save-role-item-price';

				let role_item_price_observable = param_map.has('id')
					? this.rest_role_item_price.get(param_map.get('id'))
					: of( GetEmpty.role_item_price() );

				return forkJoin
				({
					role_item_price: role_item_price_observable,
					role : this.rest_role.search({limit:999999})
				});
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.role_list = response.role.data;
			this.is_loading = false;
		});
	}
}
