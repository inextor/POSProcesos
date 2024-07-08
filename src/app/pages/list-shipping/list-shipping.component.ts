import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Production, Production_Area, Requisition, Requisition_Item, Shipping, Shipping_Item, Store } from '../../modules/shared/RestModels';
import { RequisitionInfo, ShippingInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../modules/shared/Utils';
import { LoadingComponent } from '../../components/loading/loading.component';


interface CRequisitionByStore
{
	store:Store;
	required:number;
	shipped:number;
	required_shipped:number;
	pending:number;
}

@Component({
	selector: 'app-list-shipping',
	standalone: true,
	imports: [CommonModule,RouterModule,FormsModule, BaseComponent, LoadingComponent],
	templateUrl: './list-shipping.component.html',
	styleUrl: './list-shipping.component.css'
})

export class ListShippingComponent extends BaseComponent
{
	rest_production:RestSimple<Production> = this.rest.initRest('production');
	rest_production_area:RestSimple<Production_Area> = this.rest.initRestSimple('production_area');
	crequisition_by_store_list: CRequisitionByStore[] = [];
	production_area_list: Production_Area[] = [];

	fecha_inicial: string | Date = '';
	fecha_final: string | Date = '';

	production_search:SearchObject<Production> = this.rest_production.getEmptySearch();

	total_required:number = 0;
	total_shipped:number = 0;
	total_required_shipped:number = 0;
	total_pending:number = 0;

	ngOnInit()
	{
		this.route.queryParamMap.pipe
		(
			mergeMap((paramMap)=>
			{
				this.path = 'list-shipping';
				this.is_loading = true;

				if(paramMap.has('eq.production_area_id'))
				{
					this.production_search.eq.production_area_id = parseInt(paramMap.get('eq.production_area_id') as string);
				}
				else
				{
					this.production_search.eq.production_area_id = 1;
				}

				if(paramMap.has('ge.date'))
				{
					let start = new Date(paramMap.get('ge.date') as string + 'T00:00:00');
					this.production_search.ge.created = start;
					this.fecha_inicial = paramMap.get('ge.date') as string;
				}
				else
				{
					let start = new Date();
					start.setHours(0, 0, 0, 0);
					this.fecha_inicial = start.toISOString().split('T')[0];
					this.production_search.ge.created = start;
				}

				if(paramMap.has('le.date'))
				{
					let end = new Date(paramMap.get('le.date') as string + 'T23:59:59');
					this.production_search.le.created = end;
					this.fecha_final = paramMap.get('le.date') as string;
				}
				else
				{
					let end = new Date();
					this.fecha_final = end.toISOString().split('T')[0];
					end.setHours(23, 59, 59);
					this.production_search.le.created = end;
				}

				let search_obj = 
				{
					production_area_id: this.production_search.eq.production_area_id,
					start_timestamp: this.production_search.ge.created, 
					end_timestamp: this.production_search.le.created
				}

				return forkJoin({
					report: this.rest.getReport('requisition_shipping',search_obj),
					production_area: this.rest_production_area.search({limit:99999})
				});
			})
		)
		.subscribe(
		{

			next: (response)=> {
				this.crequisition_by_store_list = response.report as CRequisitionByStore[];
				
				this.total_required = this.crequisition_by_store_list.reduce((p,c)=>p+c.required,0);
				this.total_shipped = this.crequisition_by_store_list.reduce((p,c)=>p+c.shipped,0);
				this.total_pending = this.crequisition_by_store_list.reduce((p,c)=>p+c.pending,0);
				this.total_required_shipped = this.crequisition_by_store_list.reduce((p,c)=>p+c.required_shipped,0);
				this.production_area_list = response.production_area.data as Production_Area[];
				this.is_loading = false;
			},

			error: (error) => {
				this.showError("Ocurrio un error obteniendo el reporte:" + error.message);
			}
		});
	}

	fechaInicialChange(fecha:Date)
	{
		this.fecha_inicial = fecha;
		if( fecha )
		{
			this.production_search.ge.created = fecha;
		}
	}

	fechaFinalChange(fecha:Date)
	{
		this.fecha_final = fecha;
		if( fecha )
		{
			this.production_search.le.created= fecha;
		}
	}

}
