import { Component } from '@angular/core';
import { Item, Production, Production_Area, Production_Area_Item } from '../../modules/shared/RestModels';
import { ItemInfo, ProductionInfo } from '../../modules/shared/Models';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap } from 'rxjs';
import { SearchObject } from '../../modules/shared/services/Rest';
import { Utils } from '../../modules/shared/Utils';
import { LoadingComponent } from "../../components/loading/loading.component";
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Keep FormsModule


interface ProductionByArea
{
	production_area:Production_Area;
	production_by_category: ProductionByCategory[];
	total_kgs: number;
	total_pieces: number;
	open: boolean;
	string_id: string;
}


interface ProductionByCategory
{
	category_name: string;
	total_kgs: number;
	total_pieces: number;
	production_by_item: CProductionInfo[];
	open: boolean;
	string_id: string;
}

interface CProductionInfo
{
	item: any;
	total_kgs: number;
	total_pieces: number;
	production_info_list: ProductionInfo[];
	open: boolean;
	string_id: string;
}

interface CategoryProduction {
	category_name: string;
	total_kgs: number;
	total_pieces: number;
	production_by_item: CProductionInfo[];
	open: boolean;
	string_id: string;
}

interface ProductionArea {
	production_area: any;
	category_production: CategoryProduction[];
}

type ProductionData = ProductionArea[];

interface GroupedProductionByDate {
	date: string;
	productions: ProductionInfo[];
	total_kgs: number;
	total_pieces: number;
}

@Component({
	selector: 'app-resume-production-day',
	imports: [LoadingComponent,DatePipe,FormsModule],
	templateUrl: './resume-production-day.component.html',
	styleUrl: './resume-production-day.component.css'
})
export class ResumeProductionDayComponent extends BaseComponent
{
	rest_production_info = this.rest.initRest<Production,ProductionInfo>("production_info",['created','id','item_id']);
	rest_production_area = this.rest.initRestSimple<Production_Area>("production_area");
    rest_production_area_item = this.rest.initRestSimple<Production_Area_Item>("production_area_item");
	rest_item_info = this.rest.initRest<Item,ItemInfo>("item_info",['id','name']);

	production_area_list:any[] = [];
	production_by_area_list:ProductionByArea[] = [];
	production_info_list:any[] = [];
	item_info_list:any[] = [];
	groupedProductionByDate: GroupedProductionByDate[] = [];
	structured_production_data: ProductionData = [];

	total_kgs: number = 0;
	total_pieces: number = 0;
	end_date: string = '';
	start_date: string = '';

	ngOnInit()
	{
		this.sink = this.getQueryParamObservable().pipe
		(
			mergeMap(([query_params, param_map]) =>
			{
				let keys = query_params.keys;

				let obj:SearchObject<Production> = this.rest_production_info.getEmptySearch();


				if( query_params.has('start_date') )
				{
					this.start_date = query_params.get('start_date') as string;
				}
				else
				{
					let d = new Date();
					d.setHours(0,0,0,0);
					this.start_date = Utils.getLocalMysqlStringFromDate(d).substring(0,10);
				}

				let sd = Utils.getLocalDateFromMysqlString(this.start_date) as Date;
				sd.setHours(0,0,0,0);
				obj.ge.created = sd;//sd.toISOString().substring(0,19).replace('T',' ');

				if( query_params.has('end_date') )
				{
					this.end_date = query_params.get('end_date') as string;
				}
				else
				{
					let d = new Date();
					d.setHours(0,0,0,0);
					d.setDate(d.getDate() + 1);
					this.end_date = Utils.getLocalMysqlStringFromDate(d).substring(0,10);
				}

				console.log("this.start_date", this.start_date);
				console.log("this.end_date", this.end_date);


				let ed = Utils.getLocalDateFromMysqlString(this.end_date) as Date;
				ed.setHours(23,59,59,0);
				obj.le.created =ed;// ed.toISOString().substring(0,19).replace('T',' ');
				obj.limit = 999999;

				this.is_loading = true;
				return forkJoin
				({
					production_info:this.rest_production_info.search(obj),
					production_area:this.rest_production_area.search({limit:999999}),
				});
			}),
			mergeMap((response) =>
			{
				this.production_area_list = response.production_area.data;
				this.production_info_list = response.production_info.data as ProductionInfo[];
				this.groupedProductionByDate = this.groupProductionByDate(this.production_info_list);

				return this.rest_production_area_item.search({ csv:{ id: this.production_area_list.map((area:any) => area.id) }, limit: 999999 });
			}),
			mergeMap(response=>
			{
				let item_ids = response.data.map(x=>x.item_id);
				return this.rest_item_info.search({ csv:{ id: item_ids.filter((value, index, self) => self.indexOf(value) === index) }, limit: 999999 }); // Filter unique item_ids
			})
		)
		.subscribe
		({
			error:error=>this.rest.showError(error),
			complete:() =>this.is_loading = false,
			next:(response) =>
			{
				this.item_info_list = response.data;
				this.createStructures();
			}
		});
	}

	groupProductionByDate(productionInfoList: ProductionInfo[]): GroupedProductionByDate[] {
		const grouped: { [key: string]: ProductionInfo[] } = {};
		for (const productionInfo of productionInfoList as any[]) { // Cast to any for now due to potential type mismatch with RestModels
			const date = productionInfo.production.created.split(' ')[0]; // Extract date part
			if (!grouped[date]) {
				grouped[date] = [];
			}
			grouped[date].push(productionInfo);
		}

		const result: GroupedProductionByDate[] = [];
		for (const date in grouped) {
			if (grouped.hasOwnProperty(date)) {
				let total_kgs = 0;
				let total_pieces = 0;
				for(const prod_info of grouped[date] as any[]){ // Cast to any
					total_kgs += prod_info.production.qty;
					total_pieces += prod_info.production.alternate_qty;
				}
				result.push({ date, productions: grouped[date], total_kgs, total_pieces });
			}
		}

		return result.sort((a, b) => a.date.localeCompare(b.date)); // Sort by date
	}

	createStructures()
	{
		console.log("this.production_area_list", this.production_area_list);
		console.log("this.production_info_list", this.production_info_list);
		console.log("this.groupedProductionByDate", this.groupedProductionByDate);
		// The groupedProductionByDate already has the structure we need for displaying daily summaries
		// We can calculate overall totals here if needed, but the daily totals are in groupedProductionByDate

		// Recalculate total_kgs and total_pieces based on the grouped data
		this.total_kgs = this.groupedProductionByDate.reduce((sum, day) => sum + day.total_kgs, 0);
		this.total_pieces = this.groupedProductionByDate.reduce((sum, day) => sum + day.total_pieces, 0);

		this.is_loading = false; // Set loading to false after all processing

		// The original createStructures method was for grouping by production area,
		// which is not needed for the daily summary view. I've commented out
		// or removed the logic that was trying to rebuild that structure.
		// The groupedProductionByDate property is what the template should use now.
	}

	// Helper to get item name (you might have a pipe for this)
	getItemName(itemId: number): string {
		const item = this.item_info_list.find((item:any) => item.id === itemId); // Cast to any
		return item ? item.name : 'Unknown Item';
	}

	// Helper to get production area name
	getProductionAreaName(areaId: number): string {
		const area = this.production_area_list.find((area:any) => area.id === areaId); // Cast to any
		return area ? area.name : 'Unknown Area';
	}

	// Toggle function for expanding/collapsing sections (similar to resume-production)
	toggle(item: any) {
		if (item.open === undefined) {
			item.open = true;
		} else {
			item.open = !item.open;
		}
	}

	// Check if an item is open (for template)
	isOpen(item: any): boolean {
		return item.open === true;
	}

	csearch($event: MouseEvent) {
		this.router.navigate(['/resumen-production-day'], { // Navigate to the same component
			queryParams: {
				start_date: this.start_date,
				end_date: this.end_date
			}
		});
	}
}
