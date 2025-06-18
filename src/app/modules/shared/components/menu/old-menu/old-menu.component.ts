import { Component, Input } from '@angular/core';

import { RestService } from '../../../services/rest.service';
import { RouterModule } from '@angular/router';
import { Form } from '../../../RestModels';

@Component({
    selector: 'app-old-menu',
    imports: [RouterModule],
    templateUrl: './old-menu.component.html',
    styleUrl: './old-menu.component.css'
})
export class OldMenuComponent
{
	@Input() forms_list:Form[]  = [];
	constructor(public rest:RestService){}
}
