import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RestService } from '../../services/rest.service';
import { BuildInfo } from '../../BuildInfo';
import { BaseComponent } from '../../base/base.component';
import { MenuItem, MenuService } from '../../services/menu.service';
import { Observable } from 'rxjs';
import { Component, Injector } from '@angular/core';


type Falseable = boolean | number | null;

import { SafePipe } from '../../pipes/safe.pipe';

@Component({
    standalone: true,
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrl: './menu.component.css',
    imports: [CommonModule, RouterModule, SafePipe]
})
export class MenuComponent extends BaseComponent
{
	build_info = BuildInfo;
	external_base_url: string = this.rest.getExternalAppUrl();
	menu_items$: Observable<MenuItem[]> = this.menu_service.getMenuItems();
	show_old_menu: Falseable = false;

	constructor(public override rest:RestService, private menu_service: MenuService, public override injector: Injector)
	{
		super(injector);
	}


}
