import { Component } from '@angular/core';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { PageStructureComponent } from "../../modules/shared/page-structure/page-structure.component";
import { CodeReaderComponent } from "../../modules/shared/code-reader/code-reader.component";

@Component
({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    imports: [PageStructureComponent]
})

export class DashboardComponent extends BaseComponent
{
/*
	codes:string[] = [];

	myCallback(data: any)
	{
		console.log('Diego says', data);
		this.codes.push(data as string);
	}


	myCallBack(data: any)
	{
		console.log('Diego says', data);
		this.codes.push(data as string);
	}
*/
}
