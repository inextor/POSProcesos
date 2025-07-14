import { Component, OnInit, OnDestroy, Injector} from '@angular/core';

import { RestService } from '../services/rest.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { SubSink } from 'subsink';
import { Location} from '@angular/common';
import { ShortDatePipe } from '../pipes/short-date.pipe';
import { Title } from '@angular/platform-browser';
import { Observable, Subscriber, SubscriptionLike, combineLatest, forkJoin, mergeMap, of, startWith } from 'rxjs';
import { SearchObject } from '../services/Rest';
import { ConfirmationService } from '../services/confirmation.service';
import { Utils } from '../Utils';

export interface ParamsAndQueriesMap
{
	param:ParamMap;
	query:ParamMap;
}


@Component({
    selector: 'app-base',
    imports: [],
    templateUrl: './base.component.html',
    styleUrl: './base.component.css'
})
export class BaseComponent
	implements OnDestroy
{
	public subs = new SubSink();
	public is_loading = false;
	public current_page:number = 0;
	public path:string = '';
	public total_pages:number = 0;
	public total_items: number	= 0;
	public pages:number[] = [];
	public page_size:number = 50;

	public rest:RestService;
	public route:ActivatedRoute;
	public router:Router;
	public location:Location;
	public title_service:Title;
	public confirmation:ConfirmationService;
	public titleService: Title;

	constructor(public injector: Injector)
	{
		this.rest = injector.get(RestService);
		this.route = injector.get(ActivatedRoute);
		this.router = injector.get(Router);
		this.location = injector.get(Location);
		this.title_service = injector.get(Title);
		this.confirmation = injector.get(ConfirmationService);
		this.titleService = injector.get(Title);
	}

	ngOnDestroy()
	{
		this.subs.unsubscribe();
	}

	setPages(current_page:number,totalItems:number)
	{
		this.current_page = current_page;
		this.pages.splice(0,this.pages.length);
		this.total_items = totalItems;

		if( ( this.total_items % this.page_size ) > 0 )
		{
			this.total_pages = Math.floor(this.total_items/this.page_size)+1;
		}
		else
		{
			this.total_pages = this.total_items/this.page_size;
		}

		for(let i=this.current_page-5;i<this.current_page+5;i++)
		{
			if( i >= 0 && i<this.total_pages)
			{
				this.pages.push( i );
			}
		}

		this.is_loading = false;
		//this.rest.scrollTop();
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

	public setTitle(newTitle: string)
	{
		this.titleService.setTitle(newTitle);
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


	getParamsAndQueriesObservable():Observable<ParamsAndQueriesMap>
	{
		return this.getQueryParamObservable().pipe
		(
			mergeMap
			(
				(response)=>of({query: response[0], param: response[1]})
			)
		);
	}

	getSearch<T>(param_map:ParamMap, fields:string[],extra_keys:string[]=[]):SearchObject<T>
	{
		let keys:string[] = ['eq','le','lt','ge','gt','csv','lk','nn','start'];
		let item_search:any = this.getEmptySearch();

		extra_keys.forEach((i:string)=>
		{
			if( param_map.has('search_extra.'+i ) )
			{
				let v = param_map.get('search_extra.'+i ) === 'null' ? null : param_map.get('search_extra.'+i);

				if( i.includes('timestamp') )
				{
					if( /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}/.test( v ?? '' ) )
					{
						if (v) {
							let components = v.split(/T|-|:|\s/g);

							let utcTime = Date.UTC
							(
								parseInt(components[0]),
								parseInt(components[1]) - 1,
								parseInt(components[2]),
								parseInt(components[3]),
								parseInt(components[4])
							);

							let localTime = new Date();
							localTime.setTime(utcTime);
							item_search.search_extra[i] = localTime; // Utils.getLocalMysqlStringFromDate( localTime );
						}
						return;
					}
				}

				item_search.search_extra[ i ] = v;
			}
			else
			{
				item_search.search_extra[ i ] = null;
			}
		});

		keys.forEach((k:string)=>
		{
			item_search[k] ={};

			fields.forEach((f:string)=>
			{
				let field = k+"."+f;

				if( param_map.has(field) )
				{
					let value_to_assign = param_map.get( field );
					if( value_to_assign === 'null' )
					{
						item_search[k][ field ] = null;
					}
					else if( value_to_assign === null || value_to_assign === undefined )
					{
						item_search[ field ] = null
					}
					else
					{
						if( f == 'created' || f =='updated' )
						{
							let value = param_map.get(field);

							if( value && value !='null' )
							{
								item_search[k][f] = Utils.getDateFromUTCMysqlString( value );
							}
							return;
						}

						if( f.includes('timestamp') )
						{
							let value = param_map.get(field);
							if( /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}/.test( value ?? '' ) )
							{
								if( value )
									item_search[k][f] = Utils.getDateFromUTCMysqlString( value );
							}
							else
							{
								item_search[k][f] = null;
							}
							return;
						}
						/*else */
						if( k == 'csv' )
						{
							let v = param_map.get(field);
							let array = (''+v).split(',');
							item_search.csv[f] = array.length == 1 && array[0] == '' ? [] : array;
						}
						else
						{
							let z	= parseInt(value_to_assign);

							if( /.*_id$/.test( field ) && !Number.isNaN(z) )
							{
								item_search[ k ][ f ] = z;
							}
							else if( field )
							{
								item_search[ k ][ f ] = param_map.get( field );
							}
						}
					}
				}
				else
				{
					item_search[ k ][ f ] = null;
				}
			});
		});

		if (param_map.has('sort_order')) {
			const sort_order = param_map.get('sort_order');
			item_search.sort_order = sort_order ? sort_order.split(',') : [];
		}

		let page_str: string | null = param_map.get('page');
		item_search.page = page_str ? parseInt( page_str ) as number : 0;
		item_search.limit = this.page_size;

		if( Number.isNaN(item_search.page) )
			item_search.page = 0;

		return item_search as SearchObject<T>;
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

	onDateChange(date:string,obj:any, attr:string,hour='', seconds:number =0)
	{
		if( date == '' )
		{
			obj[attr] = null;
			return;
		}

		let d_str = date.trim();
		if( /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test( d_str ) )
		{
			d_str = date.trim()+':00';
		}

		if( hour != '')
		{
			d_str = date.substring(0,10)+' '+hour;
		}

		let d = Utils.getLocalDateFromMysqlString( d_str );

		if( seconds )
		{
			d?.setSeconds( seconds );
		}

		obj[attr] = d;
		return;
	}

	search(item_search:Partial<SearchObject<any>> | null = null )
	{
		let to_search = item_search == null ? this.getEmptySearch() : item_search;

		let search:Record<string,string|null> = {};

		for(let i in to_search.search_extra )
		{
			if( to_search.search_extra[ i ] && to_search.search_extra[ i ] !== 'null' )
			{
				let v = to_search.search_extra[ i ] as any;
				if( (v instanceof Date) )
				{
					search['search_extra.'+i] = Utils.getUTCMysqlStringFromDate( v );
				}
				else
				{
					search['search_extra.'+i] = ''+to_search.search_extra[ i ];
				}
			}
		}

		if( to_search != null )
		{
			to_search.page = 0;

			let array = ['eq','le','lt','ge','gt','csv','lk','nn','start'];

			let i: keyof typeof to_search;

			for(i in to_search )
			{
				if(array.indexOf( i ) > -1 )
				{
					let ivalue = to_search[i] as any;
					let j: keyof typeof ivalue;

					for(j in ivalue)
					{
						let value = ivalue[j];

						if( value !== null && value !== 'null' && value !== undefined )
						{
							if( value instanceof Date )
							{
								search[i+'.'+j] = Utils.getUTCMysqlStringFromDate( value );
							}
							else
							{
								//Non Null assertion operator (! )
								//https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html
								search[i+'.'+j] = ''+value!;
							}
						}
					}
				}
			}
		}

		if (item_search && 'sort_order' in item_search && item_search.sort_order?.length) {
			search['sort_order'] = item_search.sort_order.join(',');
		}

		this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
			this.router.navigate([this.path], { queryParams: search });
		});
	}

	applySortOrderFromArray(header:string,sort_order:string[])
	{
		sort_order.splice(4,Infinity);

		let index = sort_order.findIndex((i)=>{
			let clean = i.replaceAll(/_DESC|_ASC/g,'')
			return clean == header;
		});

		if( index == -1 )
		{
			sort_order.unshift( header+'_ASC');
		}
		else if( index == 0 )
		{
			if(sort_order[0] == header+'_ASC' )
			{
				sort_order[0] = header+'_DESC';
			}
			else
			{
				sort_order[0] = header+'_ASC';
			}
		}
		else
		{
			sort_order.splice( index )
			sort_order.unshift( header+'_ASC' );
		}
	}

	sort(header:string,search:SearchObject<any>)
	{
		this.applySortOrderFromArray(header,search.sort_order)
		search.page = 0;
		this.search( search );
	}

	searchNoForceReload(item_search:Partial<SearchObject<any>> | null = null )
	{
		let search:Record<string,string|null> = {};

		if( item_search != null )
		{
			for(let i in item_search.search_extra )
			{
				if( item_search.search_extra[ i ] && item_search.search_extra[ i ] !== 'null' )
				{
					let v = item_search.search_extra[ i ] as any;
					if( (v instanceof Date) )
					{
						search['search_extra.'+i] = Utils.getUTCMysqlStringFromDate( v );
					}
					else
					{
							search['search_extra.'+i] = ''+item_search.search_extra[ i ];
					}
				}
			}

			item_search.page = 0;

			let array = ['eq','le','lt','ge','gt','csv','lk','nn','start'];

			let i: keyof typeof item_search;

			for(i in item_search )
			{
				if(array.indexOf( i ) > -1 )
				{
					let ivalue = item_search[i] as any;
					let j: keyof typeof ivalue;

					for(j in ivalue)
					{
						if( ivalue[j] !== null && ivalue[j] !== 'null'&&ivalue[j] !== undefined)
						{
							let value = ivalue[j];

							if( value !== null && value !== 'null' && value !== undefined )
							{
								if( value instanceof Date )
								{
									search[i+'.'+j] = Utils.getUTCMysqlStringFromDate( value );
								}
								else
								{
									search[i+'.'+j] = ''+value!;
								}
							}
						}
					}
				}
			}
		}

		this.router.navigate([this.path],{queryParams: search});
	}

	public set sink(s:SubscriptionLike)
	{
		this.subs.sink = s;
	}
}
