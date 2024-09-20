import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../header/header.component";
import { RestService } from '../services/rest.service';
import { MenuComponent } from "../components/menu/menu.component";

@Component
({
	selector: 'app-page-structure',
	standalone: true,
	templateUrl: './page-structure.component.html',
	styleUrl: './page-structure.component.css',
	imports: [CommonModule, HeaderComponent, MenuComponent]
})
export class PageStructureComponent
{
	constructor(public rest: RestService)
	{

	}
}
