import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Rest,RestResponse, RestSimple, SearchObject } from './Rest';
import { GetEmpty } from '../GetEmpty';
import { OFFLINE_DB_SCHEMA } from '../OfflineDBSchema';
import { ErrorMessage, Utils } from '../Utils';
import { Preferences, User, User_Permission } from '../RestModels';
import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http'
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export const USER_PERMISSION_KEY = 'user_permission';
const USER_KEY = 'user';

type SuperEmpty<Type> = Type | null | undefined;


@Injectable({
	providedIn: 'root'
})
export class RestService
{
	hades_counter:number = 0;
	has_hades:boolean = false;

	errorBehaviorSubject = new BehaviorSubject<ErrorMessage>(new ErrorMessage('',''));
	errorObservable = this.errorBehaviorSubject.asObservable();


	preferences = this.getPreferencesFromSession();
	public session_start?: Date | null;
	public user:User | null = null;
	public user_permission:User_Permission = GetEmpty.user_permission();

	public url_base = this.getUrlBase();
	public url_platform:string = this.getUrlPlatform();

	public _is_offline:boolean = false;
	public _offline_search_enabled = false;
	public show_menu:boolean = false;

	public local_db:any;

	public path:string = environment.app_settings.path_api;

	public domain_configuration = {
		//cambiar hostname por el dominio de test para que funcione en local
		//ignore on commit
		domain: environment.app_settings?.test_url	|| window.location.protocol+'//'+window.location.hostname
	};

	private platform_domain_configuration = {
		domain: this.getPlatformDomain()
	};

	//private offline_db: DatabaseStore	= DatabaseStore.builder
	//(
	//	OFFLINE_DB_SCHEMA.name,
	//	OFFLINE_DB_SCHEMA.version,
	//	OFFLINE_DB_SCHEMA.schema
	//);
	constructor(private http:HttpClient)
	{
		this.user = this.getUserFromSession();
		this.preferences = this.getPreferencesFromSession();
		this.session_start = this.getSessionStart();
	}

	public hideMenu():void
	{
		this.show_menu = false;
	}

	toggleMenu():void
	{
		this.show_menu = !this.show_menu;
	}

	getSessionStart():Date
	{
		let session = localStorage.getItem('session');

		if( session )
		{
			let obj = JSON.parse(session);
			let date = Date.parse(obj.created);
			let d = new Date();
			d.setTime(date);
			return d;
		}

		return new Date();
	}

	setDomainChangeSettings()
	{
		let root_domains:string[] = ['127.0.0.1','clientes.integranet.xyz','pos.integranet.xyz'];
		//this.can_change_domain = root_domains.includes(window.location.hostname);
	}

	getPlatformDomain():string
	{
		if (window.location.hostname.indexOf('127.0.') == 0 || window.location.hostname.indexOf('192.168') == 0 )
			return 'http://127.0.0.1';

		if (window.location.hostname.indexOf('localhost') == 0)
			return 'http://127.0.0.1';

		let protocol = window.location.protocol;
		return protocol+'//clientes.integranet.xyz';
	}

	getUrlPlatform():string
	{
		this.setDomainChangeSettings();

		if ( window.location.hostname.indexOf('integranet.xyz') !== -1)
			return 'api';

		if (window.location.hostname.indexOf('127.0.') == 0 || window.location.hostname.indexOf('192.168') == 0 )
			return 'POSSignUP';

		if (window.location.hostname.indexOf('localhost') == 0)
			return 'POSSignUP';

		return 'api';
	}

	getUrlBase():string
	{
		this.setDomainChangeSettings();

		if ( window.location.hostname.indexOf('integranet.xyz') !== -1 )
			return 'api';

		if (window.location.hostname.indexOf('127.0.') == 0 || window.location.hostname.indexOf('192.168') == 0 )
			return 'PointOfSale';

		if (window.location.hostname.indexOf('localhost') == 0)
			return 'PointOfSale';

		return 'api';
	}

	public initRestPlatform<T,U>(path:string)
	{
		let url_platform ='';

		return new Rest<T,U>(this.platform_domain_configuration,`${this.url_platform}/${path}.php`, this.http);
	}

	public initRest<T, U>(path: string, fields:string[] | undefined = undefined, extra_keys:string[] | undefined	= undefined)
	{

		//constructor(domain_configuration:DomainConfiguration,url_base:string,http:HttpClient,public fields:string[]=[],public extra_keys=[])
		return new Rest<T, U>(this.domain_configuration,`${this.url_base}/${path}.php`, this.http, fields, extra_keys);
	}

	public initRestSimple<T>(path: string, fields:string[]|undefined = undefined, extra_keys:string[]|undefined = undefined)
	{
		return this.initRest<T,T>(path, fields,extra_keys) as RestSimple<T>;
	}

	getApiUrl():string
	{
		return `${this.domain_configuration.domain}/${this.url_base}`;
	}

	getSessionHeaders():HttpHeaders
	{
		if( localStorage.getItem('session_token') == null )
		{
			return new HttpHeaders();
		}

		let headers = new HttpHeaders().set('Authorization', 'Bearer ' + localStorage.getItem('session_token'));
		return headers;
	}

	//getClientPlatformFromSession():Platform_Client | null
	//{
	//	let usr:string|null = localStorage.getItem('platform_client');

	//	if( usr )
	//		return Utils.transformJson( usr );

	//	return null;
	//}

	getUserFromSession():User | null
	{
		let usr:string|null = localStorage.getItem( USER_KEY );
		let permissions:string | null = localStorage.getItem( USER_PERMISSION_KEY );

		if( permissions )
		{
			this.user_permission = Utils.transformJson( permissions );
		}

		if( usr )
			return Utils.transformJson( usr );

		return null;
	}

	update<T>(method:string,data:any):Observable<T>
	{
		let obj:Record<string,string> = { };

		for(let i in data)
		{
			if( data[i] === null )
				continue;

			obj[i] = data[i];
		}
		obj['method'] = method;

    let url = `${this.domain_configuration.domain}/${this.url_base}/updates.php`;
		return this.http.post<T>(`${url}`,obj , { withCredentials: true, headers: this.getSessionHeaders() });
	}


	logout(redirect:boolean = true)
	{
		let obj = {
			method: 'logout',
		};

		let path = '/';
		if( this.user )
			path = this.user.type == 'USER' ? '/#/login' : '/';

		this.http.post<any>
		(
			`${this.domain_configuration.domain}/${this.url_base}/updates.php`,
			obj,
			{ withCredentials: true, headers: this.getSessionHeaders() }
		)
		.subscribe(
		{
			next: (response) =>
			{
				this.user = null;
				localStorage.clear();

				if( redirect )
					window.location.href=path;

			},
			error: (error:any)=>
			{
				console.log('ocurrio un error al finalizar la sesion',error);
				this.user = null;
				localStorage.clear();
				window.location.href = path
			}
		});
	}

	getClientPlatformFromSession():any
	{
		let usr:string|null = localStorage.getItem('platform_client');

		if( usr )
			return Utils.transformJson( usr );

		return null;
	}
	//doLoginPlatform(email:string,password:string):Observable<LoginResponse>
	//{
	//	let url	= `${this.getPlatformDomain()}/${this.getUrlPlatform()}/login.php`;
	//	let credentials = 'include';

	//	let params	= new FormData();
	//	params.set('password',password );
	//	params.set('email', email );

	//	let headers = { 'Content-Type':'application/json' };
	//	let method = 'POST';

	//	return fetch(url, {method, headers, params, credentials, body })
	//	.then(response =>
	//	{
	//		if (!response.ok) {
	//			throw new Error('Network response was not ok.');
	//		}
	//		return response.text(); // Assuming the response is JSON, adjust as needed
	//	})
	//	.then( text=>
	//	{
	//		let response = Utils.transformJson( text ) as RestResponse<T>;
	//		// Process the data if needed before returning
	//		if (response && response.session.id)
	//		{
	//			this.current_platform_client = response.platform_client;
	//			this.user_permission = GetEmpty.user_permission();

	//			localStorage.setItem('platform_client', JSON.stringify(response));
	//			localStorage.setItem('session_token', response.session.id);
	//			localStorage.removeItem(USER_PERMISSION_KEY);
	//			localStorage.removeItem('session');
	//		}
	//		return response;

	//	});
	//}
	getUrlSafe(url:string):string
	{
		return url;
		//return this.dom_sanitizer.bypassSecurityTrustUrl(url);
	}
	getImagePath(image1_id:SuperEmpty<number>,image2_id:SuperEmpty<number> = null,image3_id:SuperEmpty<number> = null,image4_id:SuperEmpty<number> = null ,image5_id:SuperEmpty<number> = null):string
	{
		if (image1_id)
			return this.getUrlSafe(this.domain_configuration.domain+'/'+this.url_base + '/image.php?id=' + image1_id);
		//console.log('dos');
		if (image2_id)
			return this.getUrlSafe(this.domain_configuration.domain+'/'+this.url_base + '/image.php?id=' + image2_id);
		//console.log('tres');
		if (image3_id)
			return this.getUrlSafe(this.domain_configuration.domain+'/'+this.url_base + '/image.php?id=' + image3_id);
		//console.log('cuatro');
		if (image4_id)
			return this.getUrlSafe(this.domain_configuration.domain+'/'+this.url_base + '/image.php?id=' + image4_id);
		//console.log('cinco');
		if( image5_id )
			return this.getUrlSafe(this.domain_configuration.domain+'/'+this.url_base + '/image.php?id=' + image5_id);
		return this.getUrlSafe('/assets/2px_transparent.png');
	}
	getFilePath(file_id: number,download=false): string
	{
		let d_string = download ?'&download=1':'';

		return this.domain_configuration.domain+'/'+this.url_base + '/attachment.php?id=' + file_id+d_string;
	}

	getPlatformImagePath(image1_id:SuperEmpty<number>): string
	{
		if( image1_id )
			return this.platform_domain_configuration.domain+'/'+this.getUrlPlatform()+ '/image.php?id=' + image1_id;

		return '/assets/2px_transparent.png';
	}
	getPreferencesFromSession():Preferences
	{
		let preferences:string|null = localStorage.getItem('preferences');
		let user:string | null = localStorage.getItem('user');
		let permissions = localStorage.getItem(USER_PERMISSION_KEY);

		if( permissions )
		{
			this.user_permission = JSON.parse(permissions);
		}

		if( user )
		{
			this.user = JSON.parse( user ) as User;
		}

		if( preferences )
		{
			this.preferences = JSON.parse( preferences );
			this.applyTheme();
			return this.preferences;
		}

		return GetEmpty.preferences();
	}

	applyTheme()
	{

	}

	getPreferencesInfo():Promise<Preferences>
	{
		console.log('Init preferences');

		let x = this.initRestSimple('preferences');
		let url = `${this.domain_configuration.domain}/${this.url_base}/preferences.php?domain=${window.location.hostname}`;

		return fetch(url, { method: "GET" })
		.then((response)=>
		{
			if( response.ok )
			{
				return response.text();
			}

			throw 'Ocurrio un error al cargar las preferencias';
		})
		.then((response)=>{
			return Utils.transformJson(response) as RestResponse<Preferences>;
		})
		.then((response:RestResponse<Preferences>)=>
		{
			if( response.data.length )
			{

				this.preferences = response.data[0];
				this.applyTheme();
				//console.log('Preferencias en getPreferencesInfo');
				localStorage.setItem('preferences', JSON.stringify( this.preferences ) );
			}
			else
			{
				this.preferences = this.getPreferencesFromSession();
				this.preferences.name = '';
				//this.preferences.menu_background_color = '#FFFFFF';
			}
			return Promise.resolve( this.preferences );
		})
	}

	showWarning(msg:string)
	{
		this.showErrorMessage(new ErrorMessage(msg, 'alert-warning'));
	}
	showSuccess(msg:string):void
	{
		this.showErrorMessage(new ErrorMessage(msg, 'alert-success'));
	}

	showError(error: any)
	{
		console.log('Error to display is', error);
		if( error instanceof ErrorMessage )
		{
			this.showErrorMessage(error);
			return;
		}
		let str_error = Utils.getErrorString(error);
		this.showErrorMessage(new ErrorMessage(str_error, 'alert-danger'));
	}

	showErrorMessage(error: ErrorMessage)
	{
		this.errorBehaviorSubject.next(error);
	}

	getApiPath()
	{
		return `${this.domain_configuration.domain}/${this.url_base}`;
	}

	getVersion():string
	{
		let buildTime = new Date();
		//buildTime.setTime(BuildInfo.timestamp);
		let date_pipe = new DatePipe('en-us');
		let version_created = date_pipe.transform( buildTime, 'yyMMdd:HHmm','UTC')+'-'+date_pipe.transform(buildTime,'hhmm');
		return version_created;
	}
	public get is_offline()
	{
		if( this._is_offline )
			return true;

		let x = localStorage.getItem('is_offline');
		this._is_offline = x !== null;

		return this._is_offline;
	}

	public set is_offline(b:boolean)
	{
		this._is_offline = b;

		if( b )
		{
			localStorage.setItem('is_offline','true');
			//this.initSocketIo();
		}
		else
		{
			localStorage.removeItem('is_offline');

			//if( this.socket && 'disconnect' in this.socket )
			//{
			//	console.log('Disconnecting');
			//	this.socket.disconnect();
			//	this.socket = null;
			//}
		}
	}
	enableHades():void
	{
		this.hades_counter++;
		this.has_hades = this.user_permission.hades>0 && this.hades_counter >= 5;
	}

	getReport(report_name:string, query:Record<string,any>):Observable<any>
	{
		let params = new HttpParams();

		for(let i in query)
		{
			if(query[i] instanceof Date )
			{
				params = params.set(i,Utils.getUTCMysqlStringFromDate( query[i] ));
			}
			else if( query[i] )
			{
				params = params.set( i, ''+query[ i ] );
			}
		}
		params = params.set('report_name',report_name);
		return this.http.get<any>(`${this.domain_configuration.domain}/${this.url_base}/reportes.php`, { params, headers: this.getSessionHeaders(), withCredentials: true });
	}
}

interface Sesion
{

}
