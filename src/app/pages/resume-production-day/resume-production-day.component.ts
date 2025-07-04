import { Component } from '@angular/core';
import { Item, Production, Production_Area } from '../../modules/shared/RestModels';
import { ProductionInfo } from '../../modules/shared/Models';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { SearchObject } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule } from '@angular/common';
import { LoadingComponent } from "../../components/loading/loading.component";

// New Interfaces for the desired structure
interface ProductionByDay {
    date: string;
    production_by_category: ProductionByCategory[];
    total_kgs: number;
    total_pieces: number;
    open: boolean;
}

interface ProductionByCategory {
    category_name: string;
    production_by_area: ProductionByArea[];
    total_kgs: number;
    total_pieces: number;
    open: boolean;
}

interface ProductionByArea {
    production_area: Production_Area;
    items: ProductionByItem[];
    total_kgs: number;
    total_pieces: number;
    open: boolean;
}

interface ProductionByItem {
	item: Item;
	items: ProductionInfo[];
	total_kgs: number;
	total_pieces: number;
	open: boolean;
}

@Component({
    selector: 'app-resume-production-day', // Corrected selector
    imports: [FormsModule, DatePipe, LoadingComponent, CommonModule],
    templateUrl: './resume-production-day.component.html',
    styleUrl: './resume-production-day.component.css'
})
export class ResumeProductionDayComponent extends BaseComponent {
    rest_production_info = this.rest.initRest<Production, ProductionInfo>("production_info", ['created', 'id', 'item_id', 'production_area_id']);
    rest_production_area = this.rest.initRestSimple<Production_Area>("production_area");

    production_area_list: Production_Area[] = [];
    production_info_list: ProductionInfo[] = [];

    production_by_day_list: ProductionByDay[] = []; // New data structure

    total_kgs: number = 0;
    total_pieces: number = 0;
    end_date: string = '';
    start_date: string = '';

    ngOnInit() {
        this.sink = this.getQueryParamObservable().pipe(
            mergeMap(([query_params, param_map]) =>
			{
                let obj: SearchObject<Production> = this.rest_production_info.getEmptySearch();

                if (query_params.has('start_date'))
				{
                    this.start_date = query_params.get('start_date') as string;
                }
				else
				{
                    let d = new Date();
                    d.setHours(0, 0, 0, 0);
                    this.start_date = Utils.getLocalMysqlStringFromDate(d).substring(0, 10);
                }

                let sd = Utils.getLocalDateFromMysqlString(this.start_date) as Date;
                sd.setHours(0, 0, 0, 0);
                obj.ge.created = sd;

                if (query_params.has('end_date'))
				{
                    this.end_date = query_params.get('end_date') as string;
                }
				else
				{
                    let d = new Date();
                    d.setHours(23, 59, 59, 999);
                    this.end_date = Utils.getLocalMysqlStringFromDate(d).substring(0, 10);
                }

                let ed = Utils.getLocalDateFromMysqlString(this.end_date) as Date;
                ed.setHours(23, 59, 59, 0);
                obj.le.created = ed;
                obj.limit = 999999;

                this.is_loading = true;
                return forkJoin
				({
                    production_info: this.rest_production_info.search(obj),
                    production_area: this.rest_production_area.search({ limit: 999999 }),
                });
            })
        )
		.subscribe
		({
            error: error => this.rest.showError(error),
            complete: () => this.is_loading = false,
            next: (response: any) =>
			{
                this.production_area_list = response.production_area.data;
                this.production_info_list = response.production_info.data as ProductionInfo[];
                this.createStructures();
            }
        });
    }

    createStructures()
	{

        const result: ProductionByDay[] = [];

		this.total_kgs = 0;
		this.total_pieces = 0;

		this.production_info_list
		.sort((a,b)=>
		{
			let control_a = a.production?.control ?? 0;
			let control_b = b.production?.control ?? 0;

			return control_a > control_b  ? 1 : -1;
		})
		.sort((a,b)=>
		{
			return a.item.name.localeCompare(b.item.name);
		})
		.sort((a,b)=>
		{
			return a.production.created > b.production.created ? 1 : -1;
		});

        for (const production_info of this.production_info_list)
		{
			if( !production_info.production_area )
			{
				let production_area:Production_Area = {
                    id: 0,
                    name: 'S/N',
                    created: new Date(),
                    store_id: 0,
                    status: 'ACTIVE',
                    updated: new Date()
                };

				production_info.production_area = production_area;
			}

			let day = production_info.production.created.toISOString().substring(0,10);
			let production_by_day = result.find(pbd => pbd.date === day);

			if (!production_by_day)
			{
				production_by_day = {
					date: day,
					production_by_category: [],
					total_kgs: 0,
					total_pieces: 0,
					open: false
				};
				result.push(production_by_day);
			}

			let category_name = production_info?.category?.name || 'S/N';

			let production_by_category = production_by_day.production_by_category.find(pbc =>
			{
				return pbc.category_name === category_name ;
			});

			if (!production_by_category)
			{
				production_by_category = {
					category_name: category_name,
					production_by_area: [],
					total_kgs: 0,
					total_pieces: 0,
					open: false
				};
				production_by_day.production_by_category.push(production_by_category);
			}

			let production_by_area = production_by_category.production_by_area.find(pba =>
			{
				return pba.production_area.id === production_info?.production_area?.id;
			});

			if (!production_by_area)
			{
				production_by_area = {
					production_area: production_info.production_area,
					items: [],
					total_kgs: 0,
					total_pieces: 0,
					open: false
				};
				production_by_category.production_by_area.push(production_by_area);
			}

			let production_by_item = production_by_area.items.find(pbi => pbi.item.id === production_info.item.id);
			if (!production_by_item)
			{
				production_by_item = {
					item: production_info.item,
					items: [],
					total_kgs: 0,
					total_pieces: 0,
					open: false
				};
				production_by_area.items.push(production_by_item);
			}

			production_by_item.items.push(production_info);

			production_by_day.total_kgs += production_info.production.qty;
			production_by_day.total_pieces += production_info.production.alternate_qty;

			production_by_category.total_kgs += production_info.production.qty;
			production_by_category.total_pieces += production_info.production.alternate_qty;

			production_by_area.total_kgs += production_info.production.qty;
			production_by_area.total_pieces += production_info.production.alternate_qty;

			this.total_kgs += production_info.production.qty;
			this.total_pieces += production_info.production.alternate_qty;
		}

		console.log("this.production_by_day_list", result);
		this.production_by_day_list = result;

        this.is_loading = false;
    }

    toggle(item: any) {
        item.open = !item.open;
    }

    csearch(_evt: Event) {
        this.router.navigate(['/resume-production-day'], { // Corrected route
            queryParams: {
                start_date: this.start_date,
                end_date: this.end_date
            }
        });
    }
}
