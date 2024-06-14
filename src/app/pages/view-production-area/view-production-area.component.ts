import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Production_Area,Item,Production_Area_Item, Process, ItemInfo } from '../../modules/shared/RestModels';
import { forkJoin,of,mergeMap, filter } from 'rxjs';
import { RouterModule } from '@angular/router';
import { RestSimple } from '../../modules/shared/services/Rest';
import { ModalComponent } from '../../components/modal/modal.component';
import { SaveProductionAreaItemComponent } from '../save-production-area-item/save-production-area-item.component';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';


interface CProduction_Area_Item extends Production_Area_Item
{
	name:string;
}

@Component({
	selector: 'app-view-production-area',
	standalone: true,
	imports: [CommonModule,RouterModule, ModalComponent, SaveProductionAreaItemComponent, SearchItemsComponent, ShortDatePipe],
	templateUrl: './view-production-area.component.html',
	styleUrl: './view-production-area.component.css'
})
export class ViewProductionAreaComponent extends BaseComponent implements OnInit
{
	rest_production_area: RestSimple<Production_Area> = this.rest.initRestSimple<Production_Area>('production_area');
	rest_production_area_item: RestSimple<Production_Area_Item> = this.rest.initRestSimple<Production_Area_Item>('production_area_item');
	rest_process:RestSimple<Process> = this.rest.initRestSimple<Process>('process');
	rest_item:RestSimple<Item> = this.rest.initRestSimple<Item>('item');

	cproduction_area_item_list:CProduction_Area_Item[] = [];
	process_list:Process[] = [];
	production_area = GetEmpty.production_area();
	selected_production_area_item:Production_Area_Item = GetEmpty.production_area_item();

	ngOnInit()
	{	
		this.is_loading = true;
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap)=>
			{
				let production_area_id = parseInt( paramMap.get('id') as string) as number;
				return forkJoin
				({
						production_area: paramMap.has('id')
							? this.rest_production_area.get( paramMap.get('id' ) )
							: of( GetEmpty.production_area() ),
						process	: this.rest_process.search({eq:{production_area_id }, limit: 20 }),
						items	: this.rest_production_area_item.search({eq:{production_area_id, status: 'ACTIVE' }, limit: 99999, }).pipe
						(
							mergeMap((response)=>
							{
								return forkJoin({
									items: this.rest_item.search({csv:{ id: response.data.map((pai:Production_Area_Item)=>pai.item_id)}, limit: response.data.length}),
									production_area_items: of( response )
								})
							})
						)
					});

			}),
		)
		.subscribe((response)=>
		{
			this.production_area = response.production_area;
			this.process_list = response.process.data;
			
			this.cproduction_area_item_list = response.items.production_area_items.data.map((pai:Production_Area_Item)=>
			{
				let item = response.items.items.data.find((item:Item)=>item.id == pai.item_id);
				if ( item == undefined )
					return { ...pai, name: 'Item no encontrado' };
				return { ...pai, name: item.name };
			});
			this.is_loading = false;
		})
	}

	addProductionAreaItem(item_info:ItemInfo):void
	{
		let production_area_item:Production_Area_Item = GetEmpty.production_area_item();

		production_area_item.production_area_id = this.production_area.id;
		production_area_item.item_id = item_info.item.id;

		this.subs.sink = this.rest_production_area_item.create(production_area_item)
		.subscribe({

			next: (response)=> 	this.cproduction_area_item_list.push({ ...response, name: item_info.item.name }),

			error: (error)=> this.rest.showError(error)

		});
	}

	deleteProductionAreaItem(cproduction_area_item:CProduction_Area_Item):void
	{
		this.confirmation.showConfirmAlert(cproduction_area_item,'Confirmar','¿Desea eliminar ' + cproduction_area_item.name + ' del area de producción?')
		.pipe(filter((response)=> response.accepted))
		.subscribe((response)=>
		{
			cproduction_area_item.status = 'DELETED';
			let production_area_item:Partial<Production_Area_Item> = {
				id: cproduction_area_item.id,
				status: 'DELETED',
				item_id: cproduction_area_item.item_id,
				production_area_id: cproduction_area_item.production_area_id
			};
			this.subs.sink = this.rest_production_area_item.update(production_area_item)
			.subscribe({

				next: (response)=>
				{
					this.cproduction_area_item_list = this.cproduction_area_item_list.filter((pai:CProduction_Area_Item)=>pai.id != cproduction_area_item.id);
				},

				error: (error)=> this.rest.showError(error)

			});
		});
	
	}

	onItemSelected(item_info:ItemInfo):void
	{
		let added = this.cproduction_area_item_list.findIndex((pai:CProduction_Area_Item)=>pai.item_id == item_info.item.id) != -1;

		if (item_info.item.has_serial_number == 'NO') 
		{
			if (added)
				return this.showError('El item ya ha sido agregado');

			this.confirmation.showConfirmAlert(item_info, 'Confirmar', '¿Desea agregar ' + item_info.item.name + ' al area de producción?')
				.pipe(filter((response) => response.accepted))
				.subscribe((response) => {
					this.addProductionAreaItem(item_info);
			});
		}
		else 
		{
			this.showError('Numeros de serie no soportados');
		}
	}
}
