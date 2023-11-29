import {ItemInfo, OrderInfo,OFFLINE_DB_SCHEMA, SearchTerm} from "../models/models";
import {Category, Category_Tree, Currency_Rate, Price_Type, Store, Table} from "../models/RestModels";
import {DatabaseStore} from "./Finger/DatabaseStore";
import {ObjectStore} from "./Finger/ObjectStore";
import {Options} from "./Finger/OptionsUtils";
import {StoreDictionary} from "./Finger/SchemeBuilder";

export class OfflineUtils
{
	static sync_data_db ={
		name: 'offline-sync-data',
		version: 2,
		schema: { dates:'++id' }
	};

	static addNewUpdateDate(db:DatabaseStore,date:Date)
	{
		return db.add('dates',{date:date})
	}

	static getLastsyncDate(db:DatabaseStore):Promise<Date| null>
	{
		let options = new Options();
		options.count = 1;
		options.direction = 'prev';
		//options.index = 'id'; //Lanza un error por que es el indice por defecto

		return db
		.getAll<Record<string,Date>>('dates',options )
		.then((response:Record<string,Date>[])=>
		{
			return response.length > 0 ? response[0].date : null;
		});
	}

	static syncOrderItemInfoList(
		db:DatabaseStore,
		item_info_list:ItemInfo[],
		category_list:Category[],
		stores:Store[],
		price_type:Price_Type[],
		category_tree:Category_Tree[],
		table:Table[],
		currency_rate:Currency_Rate[]
	)
	{
		let ids = item_info_list.map((item_info:ItemInfo)=>item_info.item.id);
		ids.sort();

		let terms_to_remove:Options<SearchTerm>[] = [];
		let terms:SearchTerm[] = [];

		item_info_list.forEach((item_info)=>
		{
			let str = '';
			if( item_info.item.code )
				str += item_info.item.code+' ';

			str +=' '+item_info.item.name;

			if( item_info.category )
				str += ' '+item_info.category.name;

			terms.push( ... OfflineUtils.getTerms( str, item_info.item.id ) );

			let opt = new Options();
			opt.index = 'item_id';
			opt.comparations.set('=', item_info.item.id);
			terms_to_remove.push(opt);
		});

		let txt_callback = (obj_stores:StoreDictionary,_txt:IDBTransaction) =>
		{
			console.log('obj_stores',obj_stores);
			console.time('SyncData');

			let remove_promises:Promise<any>[] = [
				obj_stores.item_info.clear(),
				obj_stores.category.clear(),
				obj_stores.store.clear(),
				obj_stores.price_type.clear(),
				obj_stores.category_tree.clear(),
				obj_stores.table.clear(),
				obj_stores.currency_rate.clear(),
			];

			terms_to_remove.map((opt:Options<SearchTerm>)=>
			{
				remove_promises.push( obj_stores.item_terms.removeAll(opt) );
			})


			let promises:Promise<any>[] = [
				Promise.all( remove_promises ).then(()=>{
					return obj_stores.item_terms.addAll(terms,false);
				}),
				obj_stores.item_info.updateAll( item_info_list ),
				obj_stores.category.updateAll( category_list ),
				obj_stores.store.updateAll( stores ),
				obj_stores.price_type.updateAll( price_type ),
				obj_stores.category_tree.updateAll( category_tree ),
				obj_stores.table.updateAll( table ),
				obj_stores.currency_rate.updateAll( currency_rate)
			];

			return Promise.all( promises ).then(()=>{
				console.log('Se removieron todos los términos de búsqueda');
				console.log('Se agregaran los trminos',terms);
				console.timeEnd('SyncData');
				return Promise.resolve();
			})
			.catch((error)=>{
				console.timeEnd('SyncData');
				throw error;
			});
		};

		return db.transaction
		(
			['item_terms','item_info','category','store','price_type','category_tree','table','currency_rate'],
			'readwrite',
			txt_callback,
			'SyncOfflineItems-'+Date.now()
		);
	}

	static getCategories(db:DatabaseStore):Promise<Category[]>
	{
		return db.getAll('category',new Options());
	}

	static getItemInfoByCategory(db:DatabaseStore,category_id:number):Promise<ItemInfo[]>
	{
		let opt = new Options();
		opt.index = 'item.category_id';
		opt.comparations.set('=',category_id);

		return db.getAll('item_info',opt) as Promise<ItemInfo[]>;
	}

	static getTerms( str:string, item_id:number ):SearchTerm[]
	{
		let terms:string[] = [];
		let termDict:Record<string,boolean> = {};
		let meta_data:SearchTerm[] = [];

		let allTerms = str.toLowerCase().split(/[\b;:,\\\/\-+{}\[\]\s\.`|?="*~<>]+/g);
		allTerms.forEach((word)=>
		{
			if( word == '' )
				return;

			if( /^#+$/.test( word ) )
				return;

			if( word in termDict )
				return;

			meta_data.push({ term : word, position: terms.length, item_id });
			terms.push( word );
			termDict[ word ] = true;
		});

		return meta_data;
	}

	static search(db:DatabaseStore, name:string ):Promise<ItemInfo[]>
	{
		return db.transaction(['item_info','item_terms'],'readonly',(stores,_txt)=>
		{
			return OfflineUtils.getTermsIndex( stores.item_terms, name )
			.then((terms:SearchTerm[])=>
			{
				let ids = terms.map( i => i.item_id );
				ids.sort();

				return stores.item_info.getAllByKeyIndex( ids )
				.then((item_info_list:ItemInfo[])=>
				{
					//console.log('items found',item_info_list.length, ids );
					let indexes:Record<number,Record<string,SearchTerm|number>> = {};

					terms.forEach((term:SearchTerm,index:number) =>{
						indexes[ term.item_id ] ={ index: index, term }
					});

					let term_items:Record<string,ItemInfo|SearchTerm>[] = [];

					item_info_list.forEach((i)=>
					{
						term_items.push({ item: i, term: indexes[i.item.id ].term as SearchTerm });
					});

					term_items.sort(( a,b ) =>
					{

						let aa = a.item as ItemInfo;
						let bb = b.item as ItemInfo;

						if( indexes[ aa.item.id ].index == indexes[ bb.item.id ].index )
							return 0;

						return indexes[ aa.item.id ].index > indexes[ bb.item.id ].index ? 1 : -1;
					});

					let result = term_items.map( i => i.item ).filter((i,index)=>index<50);

					return result;
				});
			});
		});
	}


	static dumbSearch2(db:DatabaseStore, name:string ):Promise<ItemInfo[]>
	{
		let toSearch = name.trim().toLowerCase().replace(/\s/g, ' ');
		let terms = toSearch.split(/\s/g);
		let ts = terms[0];

		return db.transaction(['item_info','item_terms'],'readonly',(stores,txt)=>
		{
			return OfflineUtils.getTermsIndex( stores.item_terms, ts, 0 )
			.then((terms:SearchTerm[])=>
			{
				if( terms.length == 0 )
					return [];

				let ids:number[] = terms.map( i => i.item_id );
				ids.sort((a,b)=>a>b?1:-1);

				//console.log('Found in terms', ids.length );

				let opt = new Options();
				opt.comparations.set('>=',ids[0]);
				opt.comparations.set('<=',ids[ids.length-1]);

				let filter_function = (item_info:ItemInfo)=>
				{

					if( item_info.item.on_sale == 'NO' )
						return false;

					if(item_info.records.length == 0 && item_info.item.availability_type == 'ON_STOCK'  )
						return false;

					let s2 = ((item_info?.category?.name || '' )+' '+item_info?.item?.name)+' '+(item_info.item?.code || '');
					let str = s2.toLowerCase().replace(/\s+/g, ' ')


					//console.log({str,toSearch});
					return str.includes(toSearch);
				};

				return stores.item_info.getAllByKeyIndexAndTest( ids, opt, filter_function )
				.catch((error)=>{
					console.log('Error cayo en getAllByKeyIndexAndTest',error);
					throw error;
				});
			})
			.catch((error)=>{
				console.log('Error en getAllByKeyIndexAndTest',error);
				throw error;
			})
		});
	}

	static getItemByCode(db:DatabaseStore,code:string):Promise<ItemInfo> 
	{
		console.log('Get by code');

		let opt  = Options.build({eq:code,index:'item_info.code'});
		return db.transaction(['item_info'],'readonly',(stores,txt)=>
		{
			let opt =	Options.build({eq:code,index:'item.code'});
			return stores['item_info'].getByKey(code,opt );
		});
	}

	static dumbSearch(db:DatabaseStore, name:string ):Promise<ItemInfo[]>
	{
		let toSearch = name.trim().toLowerCase();

		return db.transaction(['item_info'], 'readonly',(stores,txt)=>{
			let opt = new Options();
			let filter_function = (item_info:ItemInfo)=>
			{
				if( item_info.item.on_sale == 'NO' )
					return false;

				if( item_info.records.length == 0 )
					return false;

				let str = ((item_info.item?.code || '')+' '+(item_info?.category?.name || '' )+' '+item_info?.item?.name).trim().toLowerCase();
				//console.log('LLEGO ',str );

				return str.includes(toSearch);
			};
			return stores.item_info.getAll(opt, filter_function );
		});
	}

	static getCodePoint(term:string)
	{
		let to_search = term;
		while(to_search.length > 0 )
		{
			let bigger = to_search.toLowerCase().codePointAt( to_search.length -1 ) as number;
			if( !isNaN( bigger ) )
			{
				return
			}
			to_search = to_search.substring(0,to_search.length-1);
		}
	}


	static getTermsIndex( item_terms:ObjectStore<SearchTerm>, term:string, count:number = -1 ):Promise<SearchTerm[]>
	{
		let tlower = term.toLowerCase();

		let bigger = tlower.toLowerCase().codePointAt( tlower.length -1 ) as number;

		if( isNaN(bigger)  )
		{
			bigger = 0xDFBE;
		}
		console.log('Code Point', bigger+1);
		let next = String.fromCodePoint( bigger+1 );
		let biggerString = tlower.substring(0, tlower.length-1 )+next;

		let opt = new Options();
		opt.index = 'term';
		opt.comparations.set('>=', term.toLowerCase());
		opt.comparations.set('<', biggerString );

		return item_terms.getAll(opt).then(( terms )=>
		{
			//Accpeto el codigo es feo pero lo escribi hace mucho tiempo y no quiero testearlo de nuevo
			//el sort podria ser (a,b)=> a.term > b.term ? 1 : -1 solamente
			// No se hay una razon por la que este asi.

			terms.sort((a:SearchTerm,b:SearchTerm)=>
			{
				if( a.position == b.position )
				{
					return a.term > b.term ? 1 : -1;
				}

				return a.position > b.position ? 1 : -1;
			});

			let keys:Record<number,boolean> = {};

			let finalResult = terms.filter((a) =>
			{
				if( a.item_id in keys )
					return false;

				keys[ a.item_id ] = true;
				return true;
			});

			if( count > 0 )
				return Promise.resolve( finalResult.slice(0,count) );

			return Promise.resolve( finalResult );
		})
		.catch((error)=>
		{
			console.log('Error en getTermsIndex',error);
			throw error;
		});
	}

	static getCategoriesAndItems(db:DatabaseStore,category_id:number):Promise<Record<string,Category[]|ItemInfo[]>>
	{
		if( category_id != 0 )
		{
			let callback = (stores:StoreDictionary,_transaction:IDBTransaction)=>
			{
				let items_promise:Promise<ItemInfo[]>;

				let item_option = new Options();
				item_option.index = 'item.category_id';
				item_option.comparations.set('=',category_id);
				items_promise = stores.item_info.getAll( item_option ) as Promise<ItemInfo[]>;

				//getAll<T>( store_name:string, options:Options<T> = new Options() ):Promise<T[]>
				return Promise.all([
					stores.category_tree.getAll(),
					stores.category.getAll(),
					items_promise
				]).then((results)=>
				{
					let m = new Map();
					results[0].forEach((ct:Category_Tree)=>
					{
						if( ct.parent_category_id == category_id )
							m.set(ct.child_category_id,ct)
					});

					let category_list:Category[] = results[1].filter((c:Category)=>m.has(c.id));

					category_list.sort((a:Category,b:Category)=>{
						if( a.sort_weight != b.sort_weight )
							return b.sort_weight > a.sort_weight?1:-1;

						return a.name.localeCompare(b.name);
					});

					results[2].sort((a:ItemInfo,b:ItemInfo)=>{
						if( b.item.sort_weight != a.item.sort_weight )
							return b.item.sort_weight > a.item.sort_weight?1:-1;

						return a.item.name.localeCompare( b.item.name );
					});


					return Promise.resolve({category:category_list,item_info:results[2]});
				})
			};
			return db.transaction(['category','category_tree','item_info'],'readonly',callback);
		}

		//type TransactionCallback = (stores:StoreDictionary,transaction:IDBTransaction)=>Promise<any>;
		let callback = (stores:StoreDictionary,_transaction:IDBTransaction)=>
		{
			let options = new Options();
			//options.index = 'item.category_id';
			//options.comparations.set('=',null);

			let filter = (ii:ItemInfo)=>!ii.item.category_id;

			return Promise.all([
				stores.category_tree.getAll(),
				stores.category.getAll(),
				stores.item_info.getAll(options,filter)
			])
			.then((results)=>
			{
				let m = new Map();
				results[0].forEach((ct:Category_Tree)=>m.set(ct.child_category_id,ct));

				console.log('Categories before',results[0].length);
				let category_array = results[1].filter((c:Category)=>!m.has(c.id));
				console.log('Categories after',category_array.length);

				category_array.sort((a:Category,b:Category)=>{
					if( a.sort_weight != b.sort_weight )
						return b.sort_weight > a.sort_weight?1:-1;

					return a.name.localeCompare(b.name);
				});

				results[2].sort((a:ItemInfo,b:ItemInfo)=>{
					if( b.item.sort_weight != a.item.sort_weight )
						return b.item.sort_weight > a.item.sort_weight?1:-1;

					return a.item.name.localeCompare( b.item.name );
				});

				return Promise.resolve({category:category_array,item_info:results[2]});
				//getAllByKeyIndex(list:IDBValidKey[],options:Options<T> = new Options()):Promise<T[]>
			})
		};

		return db.transaction(['category','category_tree','item_info'],'readonly',callback);
	}

	static removeOrderInfo(db:DatabaseStore, order_info ):Promise<any>
	{
		if( order_info.id )
		{
			return db.remove('order_info',order_info.id);
		}

		return db.getKeyByIndex('order_info','order.sync_id',order_info.order.sync_id)
		.then((key:any)=>{
			console.log('Actualizando orden con key', key, order_info );
			if( key == undefined )
			{
				throw 'No se encontro la orden';
			}

			return db.remove('order_info',key);
		});
	}

	static updateOrderInfo(db:DatabaseStore, order_info:OrderInfo):Promise<OrderInfo>
	{
		if( order_info.id )
		{
			return db.update('order_info',order_info);
		}

		return db.getKeyByIndex('order_info','order.sync_id',order_info.order.sync_id)
		.then((key:any)=>{
			console.log('Actualizando orden con key', key, order_info );
			if( key == undefined )
			{
				return db.add('order_info', order_info);
			}

			order_info.id = key;

			return db.put('order_info',order_info, undefined);
		})
		.catch((error:any)=>
		{
			console.log('No se encontro la orden',error);
			return db.add('order_info', order_info);
		});
	}

	static updateDb(data:Record<string,string>):Promise<any>
	{
		let db	= DatabaseStore.builder
		(
			OFFLINE_DB_SCHEMA.name,
			OFFLINE_DB_SCHEMA.version,
			OFFLINE_DB_SCHEMA.schema
		);
		console.log( 'Fetching data');
		console.log( data );



		let all_items_promise = OfflineUtils.getResource(data.base_url+'/item_info.php?on_sale=YES&status=ACTIVE&limit=1', data.credentials)
		.then((response)=>
		{
			let item_batch_size = 150;
			let items_promises = [];
			let pages_needed = Math.ceil( response.total/item_batch_size );

			for(let i=0;i<pages_needed;i++)
			{
				items_promises.push(OfflineUtils.getResource(data.base_url+`/item_info.php?on_sale=YES&status=ACTIVE&page=${i}&limit=${item_batch_size}`, data.credentials) );
			}

			return Promise.all( items_promises );
		})
		.then((responses)=>
		{
			let response = responses.reduce((p,c)=>
			{
				p.data.push(...c.data)
				return p;
			});
			return Promise.resolve( response );
		});


		return Promise.all
		([
			//OfflineUtils.getResource(data.base_url+'/item_info.php?on_sale=YES&status=ACTIVE&limit=99999', data.credentials),
			all_items_promise,
			OfflineUtils.getResource(data.base_url+'/category.php?display_status=NORMAL&limit=99999', data.credentials),
			OfflineUtils.getResource(data.base_url+'/store.php?limit=99999', data.credentials),
			OfflineUtils.getResource(data.base_url+'/price_type.php?limit=99999', data.credentials),
			OfflineUtils.getResource(data.base_url+'/category_tree.php?limit=99999', data.credentials ),
			OfflineUtils.getResource(data.base_url+'/table.php?limit=99999&status=ACTIVE', data.credentials ),
			OfflineUtils.getResource(data.base_url+'/currency_rate.php?limit=99999', data.credentials )
		])
		.then((responses)=>
		{
			return OfflineUtils.syncOrderItemInfoList
			(
				db,
				responses[0].data,
				responses[1].data,
				responses[2].data,
				responses[3].data,
				responses[4].data,
				responses[5].data,
				responses[6].data
			);
		})
		.then(()=>
		{
			let sdb = DatabaseStore.builder
			(
				OfflineUtils.sync_data_db.name,
				OfflineUtils.sync_data_db.version,
				OfflineUtils.sync_data_db.schema
			);
			return OfflineUtils.addNewUpdateDate(sdb, new Date());
		})
		.then(()=>{
			console.log('Todo salio bien');
			return Promise.resolve(true);
		})
		.catch((error)=>
		{
			console.error('No llegaron los datos',error);
		})
	}

	static getResource(url:string,bearer:string):Promise<any>
	{
		return fetch(url,{
			method:'GET',
			headers:{ 'Authorization':'Bearer '+bearer },
			credentials:'include'
		})
		.then((response)=>
		{
			return response.json();
		})
		.then((fooo)=>
		{
			console.log('Si llegaron');
			OfflineUtils.convertToDate(fooo);
			return fooo
		});
	}


	static convertToDate(body:any)
	{
		if (body === null || body === undefined)
		{
			return body;
		}

		if (typeof body !== 'object') {
			return body;
		}

		for (const key of Object.keys(body))
		{
			const value = body[key];

			if( OfflineUtils.isIso8601(value) )
			{
				let date = key === 'created' || key==='updated' || key.includes('system')
					? OfflineUtils.fromUTCStringToLocalDate( value )
					: OfflineUtils.fromLocalStringToLocalDate( value );
				body[key] = date;//new Date(value);
			}
			else if (typeof value === 'object')
			{
				OfflineUtils.convertToDate(value);
			}
		}
	}

	static fromLocalStringToLocalDate(strDate:string):Date
	{
		let components = strDate.split(/-|:|\s/g);
		let date = new Date(
			parseInt(components[0]),
			parseInt(components[1])-1,
			parseInt(components[2]),
			parseInt(components[3]),
			parseInt(components[4])
		);

		if( components.length > 5 )
		{
			date.setSeconds(parseInt(components[5]));
		}

		return date;
	}


	static fromUTCStringToLocalDate(strDate:string):Date
	{
		let components = strDate.split(/-|:|\s/g);
		let utcTime = Date.UTC(
			parseInt(components[0]),
			parseInt(components[1])-1,
			parseInt(components[2]),
			parseInt(components[3]),
			parseInt(components[4])
		);


		let d = new Date();
		d.setTime( utcTime );

		if( components.length > 5 )
		{
			d.setSeconds(parseInt(components[5]));
		}

		return d;
	}

	static isIso8601(value:any):boolean
	{
		let iso8601 = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/;

		if (value === null || value === undefined) {
			return false;
		}

		if( typeof value === 'string' )
			return iso8601.test(value);

		return false;
	}

	static updateAllOffline(data:any):Promise<any>
	{
		let db	= DatabaseStore.builder
		(
			OfflineUtils.sync_data_db.name,
			OfflineUtils.sync_data_db.version,
			OfflineUtils.sync_data_db.schema
		);

		return OfflineUtils.getLastsyncDate(db)
		.then((last_update:Date | null)=>
		{
			let today = new Date();
			today.setHours( today.getHours()-8 );

			if( last_update == null || last_update < today)
			{
				return OfflineUtils.updateDb(data);
			}
			return Promise
		})
	}
}
