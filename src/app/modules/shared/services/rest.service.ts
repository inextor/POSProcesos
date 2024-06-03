import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Rest,RestResponse, RestSimple, SearchObject } from './Rest';
import { GetEmpty } from '../GetEmpty';
import { OFFLINE_DB_SCHEMA } from '../OfflineDBSchema';
import { ErrorMessage, Utils } from '../Utils';
import { Preferences, User, User_Permission } from '../RestModels';
import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http'
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { SocketMessage } from '../Models';

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
	private socket: Socket | null = null;
	socket_is_connected:boolean = false;

	public local_db:any;

	public path:string = environment.app_settings.path_api;

	public domain_configuration = {
		//cambiar hostname por el dominio de test para que funcione en local
		//ignore on commit
		domain: environment.app_settings.test_url	|| window.location.protocol+'//'+window.location.hostname
	};

	private platform_domain_configuration = {
		domain: this.getPlatformDomain()
	};

	private updatesSubject = new Subject<SocketMessage>();
	public notification = new BehaviorSubject({});
	errorBehaviorSubject = new BehaviorSubject<ErrorMessage>(new ErrorMessage('',''));
	errorObservable = this.errorBehaviorSubject.asObservable();
	public local_preferences = this.getPreferencesFromSession();
	public session_start?: Date | null;
	public user:User | null = null;
	public user_permission:User_Permission = GetEmpty.user_permission();

	public url_base = this.getUrlBase();
	public url_platform:string = this.getUrlPlatform();

	public _is_offline:boolean = false;
	public _offline_search_enabled = false;
	public show_menu:boolean = false;

	

	//private offline_db: DatabaseStore	= DatabaseStore.builder
	//(
	//	OFFLINE_DB_SCHEMA.name,
	//	OFFLINE_DB_SCHEMA.version,
	//	OFFLINE_DB_SCHEMA.schema
	//);
	constructor(private http:HttpClient)
	{
		this.user = this.getUserFromSession();
		this.local_preferences = this.getPreferencesFromSession();
		this.session_start = this.getSessionStart();
	}

	initSocketIo()
	{
		if( this.socket )
		{
			return;
		}

		let url = 'https://notifications.integranet.xyz:5000';

		if( window.location.href.indexOf('127.0.0.') > -1 || environment.app_settings.test_url)
			url = 'http://127.0.0.1:5000';

		this.socket = io( url );

		this.socket.on("connect",()=>{

		});

		this.socket.on('connect',()=>{
			this.socket_is_connected = true;
			console.log('Socket Connected');
		});

		this.socket.on('connect',()=>{
			this.socket_is_connected = true;
			console.log('Socket Connected');
		});

		this.socket.on('disconnect',()=>{
			console.log('Socket Disconected');
			this.socket_is_connected = false;
		});

		this.socket.on('update',(mensage)=>{
			console.log('Lleego mensaje de sockete',mensage);
			this.updatesSubject.next(mensage);
		});

		this.socket.on('order',(mensage)=>{
			console.log('Lleego mensaje de sockete',mensage);
			this.updatesSubject.next(mensage);
		});

		this.socket.on("updateCommandas", (message: any) => {
			this.updatesSubject.next(message);
		});
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
		let obj = Utils.transformDatesToString(data);

		for(let i in data)
		{
			if( data[i] === null )
				continue;

			let d = Utils.transformDatesToString( data[i] );
			obj[i] = d;
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

			},
			error: (error:any)=>
			{
				console.log('ocurrio un error al finalizar la sesion',error);
				this.user = null;
				localStorage.clear();
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
	getLoginLogo():string
	{
		if( window.location.hostname.indexOf('pos.integranet.xyz') !== -1)
			return this.getUrlSafe('/assets/integranet_logo.jpg');

		return this.getImagePath(this.local_preferences.login_image_id, this.local_preferences.logo_image_id );
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
			this.local_preferences = JSON.parse( preferences );
			this.applyTheme();
			return this.local_preferences;
		}

		return GetEmpty.preferences();
	}

	applyTheme()
	{

		if( this.local_preferences == null )
			return;


		let properties:Record<string,string> = {
			'--menu-icon-color':this.local_preferences.menu_icon_color || '#F66151',
			'--menu-text-color':this.local_preferences.menu_text_color || '#F66151',
			'--menu-title-color':this.local_preferences.menu_title_color || '#F66151',
			'--submenu-icon-color':this.local_preferences.submenu_icon_color || '#FFFFFF',
			'--submenu-text-color':this.local_preferences.submenu_text_color || '#FFFFFF',
			'--button-border-radius': this.local_preferences.button_border_radius || '.25em',

			'--btn-primary-bg-color': this.local_preferences.btn_primary_bg_color || '#F66151',
			'--btn-primary-bg-color-hover': this.local_preferences.btn_primary_bg_color_hover || '#F66151',
			'--btn-primary-text-color': this.local_preferences.btn_primary_text_color || '#FFFFFF',
			'--btn-primary-text-color-hover': this.local_preferences.btn_primary_text_color_hover || '#FFFFFF',
			'--btn-primary-border-color': this.local_preferences.btn_primary_border_color || '#F66151',
			'--btn-primary-border-color-hover': this.local_preferences.btn_primary_border_color_hover || '#F66151',

			'--btn-secondary-bg-color': this.local_preferences.btn_secondary_bg_color || '#6c757d',
			'--btn-secondary-bg-color-hover': this.local_preferences.btn_secondary_bg_color_hover || '#6c757d',
			'--btn-secondary-text-color': this.local_preferences.btn_secondary_text_color || '#000000',
			'--btn-secondary-text-color-hover': this.local_preferences.btn_secondary_text_color_hover || '#000000',
			'--btn-secondary-border-color': this.local_preferences.btn_secondary_border_color || '##6c757d',
			'--btn-secondary-border-color-hover': this.local_preferences.btn_secondary_border_color_hover || '#6c757d',

			'--header-background-color': this.local_preferences.header_background_color || '#F66151',
			'--header-text-color': this.local_preferences.header_text_color || '#000000',
			'--link-color': this.local_preferences.link_color || '#F66151',
			'--link-color-hover': this.local_preferences.link_hover || '#F66151',
			'--button-style': this.local_preferences.button_style || 'transparent',
			'--titles-color': this.local_preferences.titles_color || '#000000',
			'--card-border-radius': this.local_preferences.card_border_radius || '.25em',
			'--button_border_radius': this.local_preferences.button_border_radius || '.25em',
			'--text-color': this.local_preferences.text_color || '#000000',
			'--icon-menu-color':this.local_preferences.pv_bar_background_color || 'white',
			'--pv-bar-text-color': this.local_preferences.pv_bar_text_color || '#FFFFFF',
			'--pv-bar-background-color': this.local_preferences.pv_bar_background_color || '#000000',
			'--pv-bar-total-color': this.local_preferences.pv_bar_total_color || '#FFFFFF',
			'--item-selected-background-color': this.local_preferences.item_selected_background_color || '#F66151',
			'--item-selected-text-color': this.local_preferences.item_selected_text_color || '#FFFFFF',
		};

		let body = window.document.body;

		for(let i in properties )
		{
			if( properties[ i ] )
			{
				body.style.setProperty( i, properties[i] );
			}
		}

		if( this.local_preferences.display_categories_on_items == 'YES' )
		{
			body.style.setProperty('--pos_item_height', '56px')
		}
		else
		{
			body.style.setProperty('--pos_item_height', '44px')
		}


		if( this.local_preferences?.login_background_image_id )
		{
			let path = this.getImagePath(this.local_preferences.login_background_image_id);

			if( this.local_preferences.login_background_image_size == 'cover')
				body.style.setProperty('--login-background-image','url('+path+') no-repeat fixed center/cover transparent');
			else
				body.style.setProperty('--login-background-image','url('+path+') repeat fixed');
		}

		if( this.local_preferences.background_image_id )
		{
			let path = this.getImagePath(this.local_preferences.background_image_id);

			if( this.local_preferences.background_image_id )
			{
				if( this.local_preferences.background_image_size == 'cover' )
				{
					body.style.setProperty('--background-image', 'url('+path+') no-repeat fixed center/cover transparent');
				}
				else
				{
					body.style.setProperty('--background-image','url('+path+') repeat fixed');
				}
			}
			else if( this.local_preferences.background_image_size == 'cover' )
			{
				body.style.setProperty('--menu-background-image','url(/assets/default_background.webp) no-repeat fixed center/cover transparent');
			}
			else
			{
				body.style.setProperty('--menu-background-image','url(/assets/default_background.webp) repeat fixed');
			}
		}
		else
		{
			body.style.setProperty('--menu-background-image','url(/assets/default_background.webp) repeat fixed');
		}

		if( this.local_preferences.menu_background_type == 'COLOR' && this.local_preferences.menu_background_color)
		{
			let hex = this.local_preferences.menu_background_color.substring(1,8);
			var bigint = parseInt(hex, 16);
			var r = (bigint >> 16) & 255;
			var g = (bigint >> 8) & 255;
			var b = bigint & 255;

			let percent = (this.local_preferences.menu_color_opacity ?? 1 )/100;

			body.style.setProperty('--menu-background-image','none');
			body.style.setProperty('--menu-background-color','rgba('+r+','+g+','+b+','+percent+')')
		}
		else
		{
			body.style.setProperty('--menu-background-color','transparent');

			if( this.local_preferences.menu_background_image_id )
			{
				if( this.local_preferences.menu_background_image_size == 'cover' )
				{
					body.style.setProperty('--menu-background-image', 'url('+this.getImagePath( this.local_preferences.menu_background_image_id )+') no-repeat fixed center/cover transparent');
				}
				else
				{
					body.style.setProperty('--menu-background-image','url('+this.getImagePath( this.local_preferences.menu_background_image_id )+') repeat fixed');
				}
			}
			else if( this.local_preferences.menu_background_image_size == 'cover' )
			{
				body.style.setProperty('--menu-background-image','url(/assets/default_menu_background.jpg) no-repeat fixed center/cover transparent');
			}
			else
			{
				body.style.setProperty('--menu-background-image','url(/assets/default_menu_background.jpg) repeat fixed');
			}
		}

		if( this.local_preferences.submenu_background_color )
		{
			let hex = this.local_preferences.submenu_background_color.substring(1,8);
			var bigint = parseInt(hex, 16);
			var r = (bigint >> 16) & 255;
			var g = (bigint >> 8) & 255;
			var b = bigint & 255;

			let percent = (this.local_preferences.submenu_color_opacity ?? 1 )/100;

			body.style.setProperty('--submenu-background-color','rgba('+r+','+g+','+b+','+percent+')')
		}
		else
		{

			body.style.setProperty('--submenu-background-color','#eb5a4e');
		}

		if( this.local_preferences.card_background_image_id )
		{
			body.style.setProperty('--card-background-color','transparent');
		}
		else if( this.local_preferences.card_background_color )
		{
			let hex = this.local_preferences.card_background_color.substring(1,8);

			var bigint = parseInt(hex, 16);
			var r = (bigint >> 16) & 255;
			var g = (bigint >> 8) & 255;
			var b = bigint & 255;

			let percent = (this.local_preferences.card_background_opacity ?? 1) /100;
			body.style.setProperty('--card-background-color','rgba('+r+','+g+','+b+','+percent+')');
			body.style.setProperty('--card-background-color-plain',this.local_preferences.card_background_color);
			body.style.setProperty('--card-background-image', 'none');
		}
		else
		{
			body.style.setProperty('--card-background-color','#FFFFFF');
			body.style.setProperty('--card-background-color-plain','#FFFFFF');
			body.style.setProperty('--card-background-image', 'none');
		}

		if( this.local_preferences.card_border_color == 'transparent' )
		{
			body.style.setProperty('--card-border-style', 'none');
			body.style.setProperty('--card-border-width', '0');
		}
		else
		{
			body.style.setProperty('--card-border-style', 'solid');
			body.style.setProperty('--card-border-width', '1px');
			body.style.setProperty('--card-border-color', this.local_preferences.card_border_color);
		}
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

				this.local_preferences = response.data[0];
				this.applyTheme();
				//console.log('Preferencias en getPreferencesInfo');
				localStorage.setItem('preferences', JSON.stringify( this.local_preferences ) );
			}
			else
			{
				this.local_preferences = this.getPreferencesFromSession();
				this.local_preferences.name = '';
				//this.preferences.menu_background_color = '#FFFFFF';
			}
			return Promise.resolve( this.local_preferences );
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
		this.errorBehaviorSubject?.next(error);
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
