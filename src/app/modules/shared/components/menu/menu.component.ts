import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { RestService } from '../../services/rest.service';
import { BuildInfo } from '../../BuildInfo';
import { Form } from '../../RestModels';
import { BaseComponent } from '../../base/base.component';
import { OldMenuComponent } from "./old-menu/old-menu.component";

type Falseable = boolean | number | null;

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrl: './menu.component.css',
    imports: [CommonModule, RouterOutlet, RouterModule, OldMenuComponent]
})
export class MenuComponent extends BaseComponent
{

	build_info = BuildInfo;

    show_users_menu: Falseable = false;
    show_menu_users: Falseable = false;
    show_menu_stock: Falseable = false;
    show_menu_shippings: Falseable = false;
    show_menu_catalogs: Falseable = false;
    show_menu_prices: Falseable = false;
    show_menu_accountant: Falseable = false;
    show_menu_production: Falseable  = false;
    show_menu_reservations: Falseable = false;
    show_menu_settings: Falseable = false;
	show_old_menu: Falseable = false;
	show_old_production_menu: Falseable = false;
    rest_form = this.rest.initRestSimple<Form>('form');
	is_initialized:boolean = false;

	forms_list:Form[] = [];
    show_menu_reports: Falseable = false;
	show_menu_rentals: Falseable = false; //Permisos por añadir
	// add_clients
	//

	ngOnInit()
	{

		this.sink = this.getParamsAndQueriesObservable()
		.subscribe((params:any)=>
		{
			if( this.rest.user?.id && !this.is_initialized )
			{
				this.show_menu_users = this.rest.user_permission.add_user || this.rest.user_permission.add_providers||
					this.rest.user_permission.pos;

				this.show_menu_stock = this.rest.user_permission.add_stock
					|| this.rest.user_permission.global_add_stock
					|| this.rest.user_permission.stocktake;

				this.show_menu_catalogs = this.rest.user_permission.add_items;
				this.show_menu_shippings = this.rest.user_permission.send_shipping || this.rest.user_permission.global_send_shipping;
				this.show_menu_prices = this.rest.user_permission.store_prices || this.rest.user_permission.add_items;

				this.show_menu_accountant = false;
				this.show_menu_production = this.rest.user_permission.production || this.rest.user_permission.add_roles;

				this.show_menu_reservations = false;
				this.show_menu_reports = this.rest.user_permission.reports;

				this.show_menu_settings = this.rest.user_permission.add_user
					|| this.rest.user_permission.add_commandas;


				this.show_menu_rentals = this.rest.user_permission.pos;

				this.subs.sink = this.rest_form.search({limit:9999})
				.subscribe
				({
					next:(response)=>
					{
						this.forms_list = response.data;
					},
					error:(error)=>
					{
						this.rest.showError(error);
					}
				});
				this.is_initialized = true;
			}
			else
			{
				console.log('Menu: Sin inicializar');
			}
		});
	}

	syncData(evt:Event)
	{
		evt.preventDefault();
		evt.stopPropagation();

		this.rest.forceSyncOfflineItems()
		.then(()=>
		{
			this.rest.showSuccess('Datos de soporte actualizados');
		},(error)=>this.rest.showError( error ));
	}
}
