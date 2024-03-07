import { Component, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestService } from '../services/rest.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { SubSink } from 'subsink';
import { Location} from '@angular/common';
import { ShortDatePipe } from '../pipes/short-date.pipe';
import { Title } from '@angular/platform-browser';
import { Observable, combineLatest, startWith } from 'rxjs';
import { SearchObject } from '../services/Rest';

@Component({
	selector: 'app-base',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './base.component.html',
	styleUrl: './base.component.css'
})
export class BaseComponent	implements OnDestroy
{
	subs = new SubSink();
	is_loading = false;
	current_page:number = 0;
	path:string = '';
	total_pages:number = 0;
	page_size:number = 50;

	constructor(public rest:RestService, public route:ActivatedRoute,public router:Router, public location:Location,public title_service:Title)
	{

	}

	ngOnDestroy()
	{
		this.subs.unsubscribe();
	}

	showError(error:any):void
	{
		this.is_loading = false;
		this.rest.showError(error);
	}

	showSuccess(msg:string)
	{
		this.is_loading = false;
		this.rest.showSuccess(msg);
	}
	showWarning(msg:string)
	{
		this.rest.showWarning( msg );
	}

	getQueryParamObservable():Observable<ParamMap[]>
	{
		let p:ParamMap = {
			has:(_prop)=>false,
			keys:[],
			get:(_value:string)=>{ return null},
			getAll:()=>{ return []},
		};

		return combineLatest
		([
			this.route.queryParamMap.pipe(startWith(p)),
			this.route.paramMap
		])
	}

	getEmptySearch<T>():SearchObject<T>
	{
		let item_search:SearchObject<T> = {
			eq:{} as T,
			le:{} as T,
			lt:{} as T,
			ge:{} as T,
			gt:{} as T,
			lk:{} as T,
			nn:[] as string[],
			sort_order:[] as string[],
			start:{} as T,
			ends:{} as T,
			csv:{},
			different:{},
			is_null:[],
			search_extra: {} as Record<string,string|null|number|Date>,
			page:0,
			limit: this.page_size
		};
		return item_search;
	}
}
