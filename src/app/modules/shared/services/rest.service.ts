import { Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Rest,RestResponse, RestSimple, SearchObject } from './Rest';
import { GetEmpty } from '../GetEmpty';
import { OFFLINE_DB_SCHEMA } from '../OfflineDBSchema';
import { ErrorMessage, Utils } from '../Utils';
import { Preferences, Price_Type, User, User_Permission } from '../RestModels';
import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http'
import { BehaviorSubject, mergeMap, Observable, of, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { OrderInfo, OrderItemInfo, OrderItemStructureInfo, SocketMessage, StructuredOrderInfo } from '../Models';
import { OfflineUtils, ServerInfo } from '../OfflineUtils';
import { BuildInfo } from '../BuildInfo';

export const USER_PERMISSION_KEY = 'user_permission';
const USER_KEY = 'user';

type SuperEmpty<Type> = Type | null | undefined;

@Injectable
({
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
	public preferences = this.getPreferencesFromSession();
	public session_start?: Date | null;
	public user:User | null = null;
	public user_permission:User_Permission = GetEmpty.user_permission();

	public url_base = this.getUrlBase();
	public url_platform:string = this.getUrlPlatform();

	public _is_offline:boolean = false;
	public _offline_search_enabled = false;
	public show_menu:boolean = false;
	public updates: Observable<SocketMessage>;

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
		this.initSocketIo();
		this.updates = this.updatesSubject.asObservable();
	}

	sendNotification(type:string,id:number)
	{
		if( this.socket )
		{
			console.log('Emitiendo notificacion');
			this.socket.emit('update',{type,id});
		}
	}

	initSocketIo()
	{
		if( this.socket || environment.app_settings.socket_io_url == '' )
		{
			return;
		}

		this.socket = io( environment.app_settings.socket_io_url );

		this.socket.on("connect",()=>{});

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

		this.socket.on('update',(mensage:any)=>{
			console.log('Lleego mensaje de sockete',mensage);
			this.updatesSubject.next(mensage);
		});

		this.socket.on('order',(mensage:any)=>{
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

	getSyncId():string
	{
		if( this.user == null )
			return 'FOO-'+Date.now();

		return this.user.id + '-' + Date.now();
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

	public getExternalAppUrl(): string
	{
		const protocol = window.location.protocol;
		const hostname = window.location.hostname;

		if (environment.production) {
			return `${protocol}//${hostname}/`;
		}
		else
		{
			return `${protocol}//${hostname}:4000`; // Assuming 4001 is the dev port for the other project
		}
	}

	public initRestPlatform<T,U>(path:string)
	{
		return new Rest<T,U>(this.platform_domain_configuration,`${this.url_platform}/${path}.php`, this.http);
	}

	public initRest<T, U>(path: string, fields:string[] = [], extra_keys:string[] = []):Rest<T,U>
	{
		//constructor(domain_configuration:DomainConfiguration,url_base:string,http:HttpClient,public fields:string[]=[],public extra_keys=[])
		return new Rest<T, U>(this.domain_configuration,`${this.url_base}/${path}.php`, this.http, fields, extra_keys);
	}

	public initRestSimple<T>(path: string, fields:string[] = [], extra_keys:string[] = [])
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
		let options = { withCredentials: true, headers: this.getSessionHeaders() };
		return this.http.post<T>(`${url}`, obj , options );
	}

	reservationUpdates<T>(method:string,data:any):Observable<T>
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

		let url = `${this.domain_configuration.domain}/${this.url_base}/reservationUpdates.php`;
		return this.http.post<T>(`${url}`,obj , { withCredentials: true, headers: this.getSessionHeaders() });
	}

	logout(redirect:boolean = true)
	{
		let obj = {
			method: 'logout',
		};

		let path = '/produccion/#/login';

		let subs = this.http.post<any>
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
				subs.unsubscribe();

				if (redirect)
					window.location.href=path;
			},
			error: (error:any)=>
			{
				console.log('ocurrio un error al finalizar la sesion',error);
				this.user = null;
				localStorage.clear();
				window.location.href = path;
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

		return this.getImagePath(this.preferences.login_image_id, this.preferences.logo_image_id );
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
		if( this.preferences == null )
			return;

		let properties:Record<string,string> = {
			'--menu-icon-color':this.preferences.menu_icon_color || '#F66151',
			'--menu-text-color':this.preferences.menu_text_color || '#F66151',
			'--menu-title-color':this.preferences.menu_title_color || '#F66151',
			'--submenu-icon-color':this.preferences.submenu_icon_color || '#FFFFFF',
			'--submenu-text-color':this.preferences.submenu_text_color || '#FFFFFF',
			'--button-border-radius': this.preferences.button_border_radius || '.25em',

			'--btn-primary-bg-color': this.preferences.btn_primary_bg_color || '#F66151',
			'--btn-primary-bg-color-hover': this.preferences.btn_primary_bg_color_hover || '#F66151',
			'--btn-primary-text-color': this.preferences.btn_primary_text_color || '#FFFFFF',
			'--btn-primary-text-color-hover': this.preferences.btn_primary_text_color_hover || '#FFFFFF',
			'--btn-primary-border-color': this.preferences.btn_primary_border_color || '#F66151',
			'--btn-primary-border-color-hover': this.preferences.btn_primary_border_color_hover || '#F66151',

			'--btn-secondary-bg-color': this.preferences.btn_secondary_bg_color || '#6c757d',
			'--btn-secondary-bg-color-hover': this.preferences.btn_secondary_bg_color_hover || '#6c757d',
			'--btn-secondary-text-color': this.preferences.btn_secondary_text_color || '#000000',
			'--btn-secondary-text-color-hover': this.preferences.btn_secondary_text_color_hover || '#000000',
			'--btn-secondary-border-color': this.preferences.btn_secondary_border_color || '##6c757d',
			'--btn-secondary-border-color-hover': this.preferences.btn_secondary_border_color_hover || '#6c757d',

			'--header-background-color': this.preferences.header_background_color || '#F66151',
			'--header-text-color': this.preferences.header_text_color || '#000000',
			'--link-color': this.preferences.link_color || '#F66151',
			'--link-color-hover': this.preferences.link_hover || '#F66151',
			'--button-style': this.preferences.button_style || 'transparent',
			'--titles-color': this.preferences.titles_color || '#000000',
			'--card-border-radius': this.preferences.card_border_radius || '.25em',
			'--button_border_radius': this.preferences.button_border_radius || '.25em',
			'--text-color': this.preferences.text_color || '#000000',
			'--icon-menu-color':this.preferences.pv_bar_background_color || 'white',
			'--pv-bar-text-color': this.preferences.pv_bar_text_color || '#FFFFFF',
			'--pv-bar-background-color': this.preferences.pv_bar_background_color || '#000000',
			'--pv-bar-total-color': this.preferences.pv_bar_total_color || '#FFFFFF',
			'--item-selected-background-color': this.preferences.item_selected_background_color || '#F66151',
			'--item-selected-text-color': this.preferences.item_selected_text_color || '#FFFFFF',
		};

		let body = window.document.body;

		for(let i in properties )
		{
			if( properties[ i ] )
			{
				body.style.setProperty( i, properties[i] );
			}
		}

		if( this.preferences.display_categories_on_items == 'YES' )
		{
			body.style.setProperty('--pos_item_height', '56px')
		}
		else
		{
			body.style.setProperty('--pos_item_height', '44px')
		}

		if( this.preferences?.login_background_image_id )
		{
			let path = this.getImagePath(this.preferences.login_background_image_id);

			if( this.preferences.login_background_image_size == 'cover')
				body.style.setProperty('--login-background-image','url('+path+') no-repeat fixed center/cover transparent');
			else
				body.style.setProperty('--login-background-image','url('+path+') repeat fixed');
		}

		if( this.preferences.background_image_id )
		{
			let path = this.getImagePath(this.preferences.background_image_id);

			if( this.preferences.background_image_id )
			{
				if( this.preferences.background_image_size == 'cover' )
				{
					body.style.setProperty('--background-image', 'url('+path+') no-repeat fixed center/cover transparent');
				}
				else
				{
					body.style.setProperty('--background-image','url('+path+') repeat fixed');
				}
			}
			else if( this.preferences.background_image_size == 'cover' )
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

		if( this.preferences.menu_background_type == 'COLOR' && this.preferences.menu_background_color)
		{
			let hex = this.preferences.menu_background_color.substring(1,8);
			var bigint = parseInt(hex, 16);
			var r = (bigint >> 16) & 255;
			var g = (bigint >> 8) & 255;
			var b = bigint & 255;

			let percent = (this.preferences.menu_color_opacity ?? 1 )/100;

			body.style.setProperty('--menu-background-image','none');
			body.style.setProperty('--menu-background-color','rgba('+r+','+g+','+b+','+percent+')')
		}
		else
		{
			body.style.setProperty('--menu-background-color','transparent');

			if( this.preferences.menu_background_image_id )
			{
				if( this.preferences.menu_background_image_size == 'cover' )
				{
					body.style.setProperty('--menu-background-image', 'url('+this.getImagePath( this.preferences.menu_background_image_id )+') no-repeat fixed center/cover transparent');
				}
				else
				{
					body.style.setProperty('--menu-background-image','url('+this.getImagePath( this.preferences.menu_background_image_id )+') repeat fixed');
				}
			}
			else if( this.preferences.menu_background_image_size == 'cover' )
			{
				body.style.setProperty('--menu-background-image','url(/assets/default_menu_background.jpg) no-repeat fixed center/cover transparent');
			}
			else
			{
				body.style.setProperty('--menu-background-image','url(/assets/default_menu_background.jpg) repeat fixed');
			}
		}

		if( this.preferences.submenu_background_color )
		{
			let hex = this.preferences.submenu_background_color.substring(1,8);
			var bigint = parseInt(hex, 16);
			var r = (bigint >> 16) & 255;
			var g = (bigint >> 8) & 255;
			var b = bigint & 255;

			let percent = (this.preferences.submenu_color_opacity ?? 1 )/100;

			body.style.setProperty('--submenu-background-color','rgba('+r+','+g+','+b+','+percent+')')
		}
		else
		{

			body.style.setProperty('--submenu-background-color','#eb5a4e');
		}

		if( this.preferences.card_background_image_id )
		{
			body.style.setProperty('--card-background-color','transparent');
		}
		else if( this.preferences.card_background_color )
		{
			let hex = this.preferences.card_background_color.substring(1,8);

			var bigint = parseInt(hex, 16);
			var r = (bigint >> 16) & 255;
			var g = (bigint >> 8) & 255;
			var b = bigint & 255;

			let percent = (this.preferences.card_background_opacity ?? 1) /100;
			body.style.setProperty('--card-background-color','rgba('+r+','+g+','+b+','+percent+')');
			body.style.setProperty('--card-background-color-plain',this.preferences.card_background_color);
			body.style.setProperty('--card-background-image', 'none');
		}
		else
		{
			body.style.setProperty('--card-background-color','#FFFFFF');
			body.style.setProperty('--card-background-color-plain','#FFFFFF');
			body.style.setProperty('--card-background-image', 'none');
		}

		if( this.preferences.card_border_color == 'transparent' )
		{
			body.style.setProperty('--card-border-style', 'none');
			body.style.setProperty('--card-border-width', '0');
		}
		else
		{
			body.style.setProperty('--card-border-style', 'solid');
			body.style.setProperty('--card-border-width', '1px');
			body.style.setProperty('--card-border-color', this.preferences.card_border_color);
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

	getPriceTypes(force_offline:boolean = false):Observable<RestResponse<Price_Type>>
	{
		let rest_price_type:RestSimple<Price_Type> = this.initRest('price_type');
		return rest_price_type.search({limit:999999}).pipe
		(
			mergeMap((response)=>
			{
				response.data.sort((a:Price_Type,b:Price_Type)=>{
					return b.sort_priority > a.sort_priority ? 1 : -1;
				});
				return of( response );
			})
		);
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
		return 'P-'+BuildInfo.timestamp;
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

	private _getParams(query:any):HttpParams
	{
		let params = new HttpParams();

		for(let i in query)
		{
			if(query[i] instanceof Date )
			{
				params = params.set(i,Utils.getUTCMysqlStringFromDate( query[i] ));
			}
			else if( query[i] != null && query[i] != undefined && query[i] != '' )
			{
				params = params.set( i, ''+query[ i ] );
			}
		}

		return params;
	}

	public getReportByPath(report_name: string, query:any):Observable<any>
	{
		let params = this._getParams(query);
		let url = `${this.domain_configuration.domain}/${this.url_base}/reports/${report_name}.php`;
		let options = { params, headers: this.getSessionHeaders(), withCredentials: true };
		return this.http.get<any>( url, options );
	}

	getReport(report_name:string, query:Record<string,any>):Observable<any>
	{
		let params = this._getParams(query);
		params = params.set('report_name',report_name);

		let url = `${this.domain_configuration.domain}/${this.url_base}/reportes.php`;
		let options = { params, headers: this.getSessionHeaders(), withCredentials: true };
		return this.http.get<any>( url , options );
	}

	syncData(event: Event)
	{
		event.preventDefault();
	}

	forceSyncOfflineItems():Promise<any>
	{
		let url_base = `${this.domain_configuration.domain}/${this.url_base}`;

		let data = {
			type: 'sync-items',
			base_url: url_base,
			credentials:localStorage.getItem('session_token'),
		};
		return OfflineUtils.updateDb(data as ServerInfo);
	}

	normalizarOrderItems(order_item_info_list:OrderItemInfo[]):OrderItemInfo[]
	{
		let temp_list = order_item_info_list.map(i=>i);
		let final_list:OrderItemInfo[] = [];

		temp_list.sort((a,b)=>
		{
			let aa= !!a.order_item.item_option_id;
			let bb= !!b.order_item.item_option_id;

			if( aa == bb )
				return 0;

			return aa ? -1 : 1;
		});

		while( temp_list.length )
		{
			let item_info = temp_list.pop() as OrderItemInfo;
			let subitems = temp_list.filter((i)=>i.order_item.item_group == item_info.order_item.item_group);
			final_list.push( item_info );
			subitems.forEach((a)=>
			{
				let index = temp_list.indexOf(a);
				temp_list.splice(index,1);
				a.order_item.qty = a.order_item.item_option_qty*item_info.order_item.qty;
				final_list.push( a );
			});
		}
		return final_list;
	}



	createStructuredItems(oi:OrderInfo):StructuredOrderInfo
	{
		let order_info:StructuredOrderInfo = {...oi, structured_items: []};

		let ois:OrderItemStructureInfo[] = [];

		order_info.items.forEach((oii:OrderItemInfo,index:number)=>
		{
			oii.serials_string = oii.serials
			.map((oii)=>oii.serial.serial_number+'\n'+(oii.serial.description? '-'+oii.serial.description : ''))
			.join('\n--------------------\n');

			if( ois.length == 0 ||
				order_info.items[index-1].order_item.item_group != oii.order_item.item_group ||
				order_info.items[index-1].order_item.item_group != oii.order_item.item_group
			)
			{
				ois.push({...oii,childs:[], total_options: 0,total_cost:oii.order_item.total})
			}
			else
			{
				ois[ois.length-1].childs.push(oii);
				ois[ois.length-1].total_options += oii.order_item.qty;
				ois[ois.length-1].total_cost += oii.order_item.qty*oii.order_item.total;
			}
		});

		order_info.structured_items = ois;
		return order_info;
	}
}

