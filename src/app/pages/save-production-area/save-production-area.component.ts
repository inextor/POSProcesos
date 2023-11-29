import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { HttpClientModule } from '@angular/common/http';
import { RestService } from '../../modules/shared/services/rest.service';
import { Production_Area } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/Rest';

@Component({
	selector: 'app-save-production-area',
	standalone: true,
	imports: [CommonModule,HttpClientModule],
	templateUrl: './save-production-area.component.html',
	styleUrl: './save-production-area.component.css'
})

export class SaveProductionAreaComponent
{
    production_area_rest: RestSimple<Production_Area>;

	constructor(private rest:RestService)
	{
		this.production_area_rest = rest.initRestSimple<Production_Area>('production_area');
	}
}
