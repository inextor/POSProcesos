import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../../components/header/header.component";
import { RestService } from '../services/rest.service';

@Component
({
	selector: 'app-page-structure',
	standalone: true,
	templateUrl: './page-structure.component.html',
	styleUrl: './page-structure.component.css',
	imports: [CommonModule, HeaderComponent ]
})
export class PageStructureComponent
{
	constructor(public rest: RestService)
	{

	}
}
