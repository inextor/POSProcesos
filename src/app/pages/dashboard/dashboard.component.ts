import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { PageStructureComponent } from "../../modules/shared/page-structure/page-structure.component";

@Component
({
	selector: 'app-dashboard',
	standalone: true,
	templateUrl: './dashboard.component.html',
	styleUrl: './dashboard.component.css',
	imports: [CommonModule, PageStructureComponent]
})

export class DashboardComponent extends BaseComponent
{

}
