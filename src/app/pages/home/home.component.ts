import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageStructureComponent } from "../../modules/shared/page-structure/page-structure.component";
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
    imports: [CommonModule, PageStructureComponent, RouterModule, RouterOutlet]
})
export class HomeComponent extends BaseComponent implements OnInit
{

	ngOnInit(): void
	{
		if( !this.rest.user?.id )
		{
			this.router.navigate(['/login']);
		}
	}
}
