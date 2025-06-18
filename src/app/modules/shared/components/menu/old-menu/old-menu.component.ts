import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestService } from '../../../services/rest.service';
import { RouterModule } from '@angular/router';
import { Form } from '../../../RestModels';

@Component({
    selector: 'app-old-menu',
    imports: [CommonModule, RouterModule],
    templateUrl: './old-menu.component.html',
    styleUrl: './old-menu.component.css'
})
export class OldMenuComponent
{
	@Input() forms_list:Form[]  = [];
	constructor(public rest:RestService){}
}
