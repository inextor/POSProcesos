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
		for (const productionInfo of productionInfoList) {
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
				for(const prod_info of grouped[date]){
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

		this.structured_production_data = []; // Clear previous data if any

		for (const dailyProduction of this.groupedProductionByDate) {
			const productionAreas: ProductionArea[] = [];

			for (const productionArea of this.production_area_list) {
				const categoryProduction: CategoryProduction[] = [];
				const productionInfosForArea = dailyProduction.productions.filter(
					(prodInfo) => prodInfo.production_area.id === productionArea.id
				);

				if (productionInfosForArea.length > 0) {
					const groupedByCategory: { [key: string]: ProductionInfo[] } = {};
					for (const prodInfo of productionInfosForArea) {
						const categoryName = prodInfo?.category?.name || 'N/A';
						if (!groupedByCategory[categoryName]) {
							groupedByCategory[categoryName] = [];
						}
						groupedByCategory[categoryName].push(prodInfo);
					}

					for (const categoryName in groupedByCategory) {
						if (groupedByCategory.hasOwnProperty(categoryName)) {
							const productionByItem: CProductionInfo[] = [];
							const groupedByItem: { [key: number]: ProductionInfo[] } = {};
							let total_kgs = 0;
							let total_pieces = 0;

							for (const prodInfo of groupedByCategory[categoryName]) {
								if (!groupedByItem[prodInfo.item.id]) {
									groupedByItem[prodInfo.item.id] = [];
								}
								groupedByItem[prodInfo.item.id].push(prodInfo);
								total_kgs += prodInfo.production.qty;
								total_pieces += prodInfo.production.alternate_qty;
							}

							for (const itemId in groupedByItem) {
								if (groupedByItem.hasOwnProperty(itemId)) {
									let item_total_kgs = 0;
									let item_total_pieces = 0;
									for(const prod_info of groupedByItem[itemId]){
										item_total_kgs += prod_info.production.qty;
										item_total_pieces += prod_info.production.alternate_qty;
									}
									productionByItem.push({ item: groupedByItem[itemId][0].item, total_kgs: item_total_kgs, total_pieces: item_total_pieces, production_info_list: groupedByItem[itemId], open: false, string_id: 'p_item_' + itemId });
								}
							}

							categoryProduction.push({ category_name: categoryName, total_kgs, total_pieces, production_by_item: productionByItem, open: false, string_id: 'p_cat_' + (groupedByCategory[categoryName][0]?.category?.id || 'NULL') });
						}
					}
					productionAreas.push({ production_area: productionArea, category_production: categoryProduction });
				}
			}
			// Now you have productionAreas structured for the current dailyProduction.
			// You might want to store this structured data per day if needed for the template
			// For simplicity here, I'll just log it, but you would typically add it to a list
			// associated with the dailyProduction or a new top-level structure.
			console.log("Structured data for date", dailyProduction.date, productionAreas);
			// Example: this.structured_production_data.push({ date: dailyProduction.date, areas: productionAreas });
		}

		// Recalculate total_kgs and total_pieces based on the grouped data
		this.total_kgs = this.groupedProductionByDate.reduce((sum, day) => sum + day.total_kgs, 0);
		this.total_pieces = this.groupedProductionByDate.reduce((sum, day) => sum + day.total_pieces, 0);

		this.is_loading = false; // Set loading to false after all processing
	}

	// Helper to get item name (you might have a pipe for this)
	getItemName(itemId: number): string {
		const item = this.item_info_list.find(item => item.id === itemId);
		return item ? item.name : 'Unknown Item';
	}

	// Helper to get production area name
	getProductionAreaName(areaId: number): string {
		const area = this.production_area_list.find(area => area.id === areaId);
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
			{
				production_by_area = {
					production_area,
					production_by_category: [],
					total_kgs: 0,
					total_pieces: 0,
					open: false,
					string_id: 'p_area_'+production_area.id
				};
				production_by_area_list.push(production_by_area);
			}

			for (const production_info of production_info_list)
			{
				let category_name = production_info?.category?.name || 'N/A';
				let production_by_category = production_by_area.production_by_category.find(pbc => pbc.category_name === category_name);

				if (!production_by_category)
				{
					production_by_category = {
						category_name,
						total_kgs: 0,
						total_pieces: 0,
						production_by_item: [],
						open: false,
						string_id: 'p_cat_'+( production_info?.category?.id || 'NULL')

					};
					production_by_area.production_by_category.push(production_by_category);
				}

				let find_lamnda = (pbi:any) =>{
					return pbi.item.id === production_info.item.id;
				};

				let production_by_item = production_by_category.production_by_item.find(pbi => pbi.item.id === production_info.item.id);

				if (!production_by_item)
				{
					production_by_item = {
						item: production_info.item,
						total_kgs: 0,
						total_pieces: 0,
						production_info_list: [],
						open: false,
						string_id: 'p_item_'+production_info.item.id
					};
					production_by_category.production_by_item.push(production_by_item);
				}

				production_by_item.production_info_list.push( production_info );

				production_by_area.total_kgs += production_info.production.qty;
				production_by_area.total_pieces += production_info.production.alternate_qty;

				production_by_category.total_kgs += production_info.production.qty;
				production_by_category.total_pieces += production_info.production.alternate_qty;

				production_by_item.total_kgs += production_info.production.qty;
				production_by_item.total_pieces += production_info.production.alternate_qty;

				total_kgs += production_info.production.qty;
				total_pieces += production_info.production.alternate_qty;
			}
		}

		this.total_kgs = total_kgs;
		this.total_pieces = total_pieces;

		this.production_by_area_list = production_by_area_list;
		console.log("this.production_by_area_list", this.production_by_area_list);
		this.is_loading = false;
	}

	csearch($event: MouseEvent)
	{
		this.router.navigate(['/resumen-production'], { queryParams:{
			start_date: this.start_date,
			end_date: this.end_date
		}});
	}
}
