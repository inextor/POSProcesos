import { Component, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestService } from '../services/rest.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { SubSink } from 'subsink';
import { Location} from '@angular/common';
import { ShortDatePipe } from '../pipes/short-date.pipe';
import { Title } from '@angular/platform-browser';
import { Observable, combineLatest, startWith } from 'rxjs';

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
		this.rest.warning( msg );
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
}
