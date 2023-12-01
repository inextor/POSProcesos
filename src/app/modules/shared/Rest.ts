import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders,HttpParams } from '@angular/common/http';
import { Utils} from './Utils';
import {mergeMap, retry} from 'rxjs/operators';
//import { HttpErrorResponse } from '@angular/common/http';


export interface CsvArray{
	[key: string]: any[];
}

/*
* From perl operators except lk = LIKE
* Several comparison operators impose string contexts upon their operands.
* These are string equality (eq),
* string inequality (ne),
* greater than (gt),
* less than (lt),
* greater than or equal to (ge),
* less than or equal to (le),
*/

export interface SearchObject<T>
{
	page:number;
	limit:number;
	eq:Partial<T>; //Equals to
	gt:Partial<T>; //Great than
	lt:Partial<T>; //Less than
	ge:Partial<T>; //Great or equal than
	different:Partial<T>; //Different than
	le:Partial<T>; //less or equal than
	lk:Partial<T>; //like
	nn:string[]; //Not nulls
	is_null:string[];
	sort_order:string[]; //Sort order like 'updated_ASC','name_DESC' //Etc
	csv:CsvArray; //Posiblemente String tambien
	start:Partial<T>;
	ends:Partial<T>;
	search_extra:Record<string,string|number|null|Date>
}

export interface RestResponse<T>{
	total:number;
	data:T[];
}

export interface DomainConfiguration
{
	domain:string
}

export class Rest<U,T>{
	private url_base:string;
	private http:HttpClient;
	private domain_configuration:DomainConfiguration;

	constructor(domain_configuration:DomainConfiguration,url_base:string,http:HttpClient)
	{
		this.url_base = url_base;
		this.http = http;
		this.domain_configuration = domain_configuration;
	}

	private getSessionHeaders():HttpHeaders
	{
		if( localStorage.getItem('session_token') == null )
		{
			return new HttpHeaders();
		}

		let headers = new HttpHeaders().set('Authorization', 'Bearer ' + localStorage.getItem('session_token'));
		return headers;
	}

	get(id:any):Observable<T>
	{
		let params = new HttpParams();
		params = params.set('id',''+id);
		return this.http.get<T>(`${this.domain_configuration.domain}/${this.url_base}`,{params,headers:this.getSessionHeaders(),withCredentials:true}).pipe( retry(2) );
	}

	getAsPromise(id:any):Promise<T>
	{
		let url = `${this.domain_configuration.domain}/${this.url_base}?id=${id}`;

		let a_headers = this.getSessionHeaders();

		let headers = new Headers();

		for(let x of a_headers.keys() )
		{
			headers.set(x,a_headers.get(x) as string );
		}

		let credentials:RequestCredentials = 'include';

		return fetch(url, { headers, credentials })
			.then(response =>
			{
				if (!response.ok) {
					throw new Error('Network response was not ok.');
				}
				return response.text(); // Assuming the response is JSON, adjust as needed
			})
			.then( text=>
			{
				// Process the data if needed before returning
				return Utils.transformJson( text ) as T;
			});
	}

	getAll():Observable<RestResponse<T>>
	{
		let params = new HttpParams();
		params = params.set('limit','9999999999');

		return this.http.get<RestResponse<T>>(`${this.domain_configuration.domain}/${this.url_base}`,{params,headers:this.getSessionHeaders(),withCredentials:true}).pipe( retry(2) );
	}



	getParamsFromSearch(searchObj:Partial<SearchObject<U>>):HttpParams
	{
		let params = new HttpParams();

		if( searchObj.search_extra )
		{
			for( let i in searchObj.search_extra)
			{
				if( searchObj.search_extra[i] === null || searchObj.search_extra[i] === '' || searchObj.search_extra[i] === undefined )
					continue;

				params = params.set(i,''+searchObj.search_extra[''+i]);
			}
		}

		for(let i in searchObj.eq )
		{
			if( searchObj.eq[i] === null || searchObj.eq[i] === undefined )
				continue;

			if( (searchObj.eq[i] && ''+searchObj.eq[i] !== 'null' ) || typeof searchObj.eq[i] == 'number' )
			{
				params = params.set(i,''+this.getString( searchObj.eq[i], i ) );
			}
		}

		for(let i in searchObj.gt )
			if( searchObj.gt[i] || typeof searchObj.gt[i] == 'number' )
				params = params.set(i+'>',''+this.getString( searchObj.gt[i], i ));

		for(let i in searchObj.lt )
			if( searchObj.lt[i] || typeof searchObj.lt[i] == 'number' )
				params = params.set(i+'<',''+this.getString( searchObj.lt[i], i ) );

		for(let i in searchObj.ge )
			if( searchObj.ge[i] || typeof searchObj.ge[i] == 'number' )
				params = params.set(i+'>~',''+this.getString( searchObj.ge[i], i ) );

		for(let i in searchObj.le )
			if( searchObj.le[i] || typeof searchObj.le[i] == 'number' )
				params = params.set(i+'<~',''+this.getString( searchObj.le[i], i ) );

		for(let i in searchObj.csv )
			if( Array.isArray( searchObj.csv[i] ) && searchObj.csv[i].length > 0 )
				params = params.set(i+',',''+searchObj.csv[i].join(','));

		for(let i in searchObj.different )
			if( searchObj.different[i] || typeof searchObj.different[i] == 'number' )
				params = params.set(i+'!',''+this.getString( searchObj.different[i], i ) );

		for(let i in searchObj.lk )
			if( searchObj.lk[i] )
				params = params.set(i+'~~',''+searchObj.lk[i] );

		for(let i in searchObj.start )
		{
			if( searchObj.start[i] )
				params = params.set(i+'^',''+searchObj.start[i] );
		}

		for(let i in searchObj.ends )
		{
			params = params.set(i+'$',''+searchObj.ends[i] );
		}

		/* Not Nulls Search */
		if( searchObj?.nn?.length )
		{
			params = params.set('_NN',searchObj.nn.join(','));
		}

		/* Nulls Search */
		if( searchObj?.is_null?.length )
		{
			params = params.set('_NULL',searchObj.is_null.join(','));
		}

		if( searchObj.page )
		{
			params = params.set( 'page', ''+searchObj.page );
		}

		if( searchObj.limit )
		{
			params = params.set( 'limit', ''+searchObj.limit );
		}

		if( searchObj.sort_order && searchObj.sort_order )
		{
			params = params.set('_sort',searchObj.sort_order.join(','));
		}
		return params;
	}

	searchAsPost(searchObj:Partial<SearchObject<U>>):Observable<RestResponse<T>>
	{
		let params	= this.getParamsFromSearch(searchObj);
		params = params.set('_post_search','1');

		let options	= {
			headers:this.getSessionHeaders(),
			withCredentials:true
		};

		let url = `${this.domain_configuration.domain}/${this.url_base}`;

		return this.http.post<RestResponse<T>>(url,params,options).pipe( retry(2) );
	}

	search(searchObj:Partial<SearchObject<U>>):Observable<RestResponse<T>>
	{
		let params = this.getParamsFromSearch(searchObj);
		return this.http.get<RestResponse<T>>
		(
			`${this.domain_configuration.domain}/${this.url_base}`,
			{params,headers:this.getSessionHeaders(),withCredentials:true}
		)
		.pipe
		(
			retry(2),
		);
	}

	searchAsPromise(searchObj:Partial<SearchObject<U>>):Promise<RestResponse<T>>
	{
		let params = this.getParamsFromSearch(searchObj);

		let url = `${this.domain_configuration.domain}/${this.url_base}`;
		const paramsString = params.toString();
		let a_headers = this.getSessionHeaders();

		let headers = new Headers();

		for(let x of a_headers.keys() )
		{
			headers.set(x,a_headers.get(x) as string );
		}

		let credentials:RequestCredentials = 'include';

		// Append params to the base URL
		const urlWithParams = url + (paramsString.length > 0 ? `?${paramsString}` : '');

		return fetch(urlWithParams, { headers, credentials })
			.then(response =>
			{
				if (!response.ok) {
					throw new Error('Network response was not ok.');
				}
				return response.text(); // Assuming the response is JSON, adjust as needed
			})
			.then( text=>
			{
				// Process the data if needed before returning
				return Utils.transformJson( text ) as RestResponse<T>;
			});
	}

	getString(value:any,key:any = ''):string
	{
		let skey = ''+key;

		if( skey == 'created' || skey == 'updated' )
		{
			if( typeof(value) == 'string' )
			{
				if( /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(value) )
				{
					let x:string = value.replace('T',' ')+':00';
					console.log( x );
					let d:Date = Utils.getLocalDateFromMysqlString(x) as Date;
					return Utils.getUTCMysqlStringFromDate(d);
				}
			}
		}

		if( value instanceof Date )
		{
			return Utils.getUTCMysqlStringFromDate( value );
		}
		return value;
	}

	create(obj:any):Observable<T>
	{
		return this.http.post<T>(`${this.domain_configuration.domain}/${this.url_base}`,obj,{headers:this.getSessionHeaders(),withCredentials:true});
	}

	createAsPromise(obj:Partial<T>):Promise<T>
	{
		let url = `${this.domain_configuration.domain}/${this.url_base}`;


		//const paramsString = params.toString();
		let a_headers = this.getSessionHeaders();

		let headers = new Headers();

		for(let x of a_headers.keys() )
		{
			headers.set(x,a_headers.get(x) as string );
		}

		let credentials:RequestCredentials = 'include';

		let body = JSON.stringify( Utils.transformDatesToString( obj ) );
		headers.set('Content-Type','application/json');
		let method = 'POST';

		// Append params to the base URL

		return fetch(url, {method, headers, credentials, body })
			.then(response =>
			{
				if (!response.ok) {
					throw new Error('Network response was not ok.');
				}
				return response.text(); // Assuming the response is JSON, adjust as needed
			})
			.then( text=>
			{
				// Process the data if needed before returning
				return Utils.transformJson( text ) as T;
			});
	}

	update(obj:any,send_as_json:boolean = true ):Observable<T>
	{
		return this.http.put<T>(`${this.domain_configuration.domain}/${this.url_base}`,obj,{headers:this.getSessionHeaders(),withCredentials:true});
	}

	updateAsPromise(obj:Partial<T>):Promise<T>
	{
		let url = `${this.domain_configuration.domain}/${this.url_base}`;

		//const paramsString = params.toString();
		let a_headers = this.getSessionHeaders();

		let headers = new Headers();

		for(let x of a_headers.keys() )
		{
			headers.set(x,a_headers.get(x) as string );
		}

		let credentials:RequestCredentials = 'include';

		let body = JSON.stringify( Utils.transformDatesToString( obj ) );
		headers.set('Content-Type','application/json');
		let method = 'PUT';

		// Append params to the base URL

		return fetch(url, {method, headers, credentials, body })
			.then(response =>
			{
				if (!response.ok) {
					throw new Error('Network response was not ok.');
				}
				return response.text(); // Assuming the response is JSON, adjust as needed
			})
			.then( text=>
			{
				// Process the data if needed before returning
				return Utils.transformJson( text ) as T;
			});


	}

	batchCreate(obj:Partial<T>[]):Observable<T[]>
	{
		return this.http.post<T[]>(`${this.domain_configuration.domain}/${this.url_base}`,obj,{headers:this.getSessionHeaders(),withCredentials:true});
	}

	batchUpdate(obj:Partial<T>[]):Observable<T[]>
	{
		return this.http.put<T[]>(`${this.domain_configuration.domain}/${this.url_base}`,obj,{headers:this.getSessionHeaders(),withCredentials:true});
	}

	batchUpdateJSON(obj:Partial<T>[]):Observable<T[]>
	{
		let str = JSON.stringify( obj );
		let headers = this.getSessionHeaders().set('Content-Type','application/json');

		return this.http.put<T[]>(`${this.domain_configuration.domain}/${this.url_base}`,str,{headers,withCredentials:true});
	}

	delete(obj:U):Observable<T>
	{
		let params = new HttpParams();

		for(let i in obj)
		{
			params = params.set(i,''+obj[i]);
		}

		return this.http.delete<T>(`${this.domain_configuration.domain}/${this.url_base}`,{params,headers:this.getSessionHeaders(),withCredentials:true});
	}
	deleteT(obj:T):Observable<T>
	{
		let params = new HttpParams();

		for(let i in obj)
		{
			params = params.set(i,''+obj[i]);
		}

		return this.http.delete<T>(`${this.domain_configuration.domain}/${this.url_base}`,{params,headers:this.getSessionHeaders(),withCredentials:true});
	}
}

export class RestSimple<T> extends Rest<T,T>
{

}
