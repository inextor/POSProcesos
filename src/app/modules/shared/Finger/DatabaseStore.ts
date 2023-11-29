import {ObjectStore} from './ObjectStore';
import {Options} from './OptionsUtils';
import {SchemaBuilder, StoreDictionary} from './SchemeBuilder';
import {DatabaseSchema} from './SchemeBuilder';


type TransactionCallback = (stores:StoreDictionary,transaction:IDBTransaction)=>Promise<any>;

type TFilter<T> = (item:T)=>boolean;

export class DatabaseStore
{
	debug:boolean = false;
	database:IDBDatabase | null;
	schema:DatabaseSchema;
	is_initialized:boolean = false;
	/*
		name : "users"
		,version : 1
		stores:
		{
			user : { keyPath: 'id'
			,autoincrement: true
			,indexes:
			{
			'name' : {keypath: 'name', objectParameters: { unique: false, multientry
			}
		}

		new DatabaseStore(""{
			name		: "users"
			,version	: 1
			,stores		:{
				user: {
					keyPath	: 'id'
					autoincrement: true
					indexes	:
					[
						{ indexName: "name", keyPath:"name", objectParameters: { unique : false, multiEntry: false, locale: 'auto'	} }
						,{ indexName: "age", keyPath:"age", objectParameters: { unique : false, multiEntry: false, locale: 'auto'	} }
						,{ indexName: "curp", keyPath:"age", objectParameters: { unique : true, multiEntry: false, locale: 'auto'	} }
						,{ indexName: "tagIndex", keyPath:"age", objectParameters: { unique : false, multiEntry: true , locale: 'auto'	} } //age i thing it must be a array
					]
				}
			}
		});
	* */
	constructor( schema:DatabaseSchema)
	{
		this.schema = schema;
		this.database = null;
		this.is_initialized = false;
	}

	static builder(db_name:string,version:number, store_strings:Record<string,string>):DatabaseStore
	{
		return new DatabaseStore( SchemaBuilder.create(db_name, version, store_strings ) );
	}

	//static getDefaultSchema()
	//{
	//	return	SchemaBuilder.create("default",1,{ keyValue: "id"})
	//}

	init()
	{
		if( this.is_initialized )
			return Promise.resolve(false);

		if( this.debug )
			console.log("Init with schema ",this.schema );

		return new Promise((resolve,reject)=>
		{
			let DBOpenRequest		= indexedDB.open( this.schema.name || 'default', this.schema.version );

			let isAnUpgrade = false;
			DBOpenRequest.onerror	= ( evt )=>
			{
				if( this.debug )
					console.log( evt );

				reject( evt );
			};

			DBOpenRequest.onupgradeneeded	= (evt:Event)=>
			{
				isAnUpgrade = true;

				if( this.debug )
					console.log('Init creating stores');

				let target:any = evt.target;
				let transaction:IDBTransaction = target.transaction;
				let db:IDBDatabase = target.result;
				this._createSchema( transaction, db );
			};

			DBOpenRequest.onsuccess = (e:Event)=>
			{
				let target:any = e.target;

				this.database	= target.result as IDBDatabase;
				this.is_initialized = true;
				resolve( isAnUpgrade );
			};
		});
	}



	_createSchema(transaction:IDBTransaction, db:IDBDatabase )
	{
		if( this.debug )
			console.log('Creating schema',this.schema.stores);

		for(let store_name in this.schema.stores )
		{
			let store:IDBObjectStore | null = null;

			if( !db.objectStoreNames.contains( store_name ) )
			{
				if( this.debug )
					console.log('creating store'+store_name);

				let keyPath			= this.schema.stores[ store_name ].keyPath;
				let autoincrement	= this.schema.stores[ store_name ].autoIncrement;
				store	= db.createObjectStore( store_name ,{ keyPath: keyPath , autoIncrement: autoincrement } );

				this._createIndexForStore( store, this.schema.stores[ store_name ].indexes );
			}
			else
			{
				let store = transaction.objectStore( store_name );

				let toDelete = [];
				let indexNames:string[] = Array.from( store.indexNames );

				for( let j=0;j<indexNames.length;j++)
				{
					let i_name = store.indexNames.item( j );
					if( ! this.schema.stores[ store_name ].indexes.some( (z)=>{ return z.indexName == i_name }) )
						toDelete.push( i_name );
				}

				while( toDelete.length )
				{
					let z = toDelete.pop();
					store.deleteIndex( z  as string);
				}

				this._createIndexForStore( store ,this.schema.stores[ store_name ].indexes );
			}
		}

		let dbStoreNames = Array.from( db.objectStoreNames );

		dbStoreNames.forEach((store_name)=>
		{
			if( !(store_name in this.schema.stores) )
			{
				db.deleteObjectStore( store_name );
			}
		});
	}

	_createIndexForStore( store:IDBObjectStore, indexesArray:any[] )
	{
		indexesArray.forEach((index)=>
		{
			if( !store.indexNames.contains( index.indexName ) )
			{
				console.log('createing index',index );
				store.createIndex( index.indexName, index.keyPath, index.objectParameters );
			}
		});
	}


	getStoreNames()
	{
		if( this.database )
			return this.database.objectStoreNames;

		throw 'Database is not initialized';
	}

	add<T>( store_name:string, item:T, key:any = null ):Promise<any>
	{
		return this.transaction([store_name], 'readwrite',(stores,_transaction)=>
		{
			return stores[ store_name ].add( item, key );
		});
	}

	addAll( store_name:string, items:any[], insert_ignore:boolean):Promise<any[]>
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[store_name].addAll( items,insert_ignore );
		});
	}
	addAllFast( store_name:string, items:any[], insert_ignore:boolean)
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[store_name].addAllFast( items,insert_ignore );
		});
	}

	clear(...theArgs:string[]):Promise<void>
	{
		//console.log(theArgs)
		return this.transaction(theArgs,'readwrite',(stores,_transaction)=>
		{
			let promises:Promise<void>[] = [];
			theArgs.forEach((i)=>{
				let p:Promise<void> = stores[i].clear() as Promise<void>;
				promises.push( p )
			});
			return Promise.all( promises );
		});
	}

	count<T>( store_name:string, options:Options<T> = new Options())
	{
		return this.transaction([store_name],'readonly',(stores,_transaction)=>
		{
			return stores[ store_name ].count( options );
		},'Count '+store_name );
	}

	getAll<T>( store_name:string, options:Options<T> = new Options() ):Promise<T[]>
	{
		return this.transaction([store_name],'readonly',(stores,_transaction)=>
		{
			return stores[ store_name ].getAll( options ) as Promise<T[]>;
		});
	}

	getKeyByIndex(store_name:string,index:string,value:any):Promise<any>
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[ store_name ].getKeyByIndex(index,value);
		},'getAllKeys '+store_name );
	}

	getAllKeys<T>( store_name:string, options:Options<T> ):Promise<T[]>
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[ store_name ].getAllKeys( options );
		},'getAllKeys '+store_name );
	}

	getByKey<T>( store_name:string,index:string, key:IDBValidKey):Promise<T>
	{
		return this.transaction([store_name],'readonly',(stores,_transaction)=>
		{
			let options = new Options();
			options.index = index;
			options.comparations.set('=', key);
			return stores[ store_name ].getByKey( key,  options );
		},'getByKey '+store_name);
	}

	/*
	customFilter<T,K>(store_name:string, options:Options<T,K>, callbackFilter: TFilter<T>):Promise<T[]>
	{
		return this.transaction([store_name],'readonly',(stores,_transaction)=>
		{
			return stores[store_name].filter( options, callbackFilter );
		},'customFilter '+store_name);
	}
	*/

	put<T,K>( store_name:string, item:T, key:K ):Promise<T>
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[ store_name ].put( item, key);
		},'put'+store_name );

	}

	putItems( store_name:string, items:any[] )
	{
		return this.updateAll(store_name, items);
	}

	update( store_name:string, item:any, key:IDBValidKey | undefined = undefined)
	{
		return this.put( store_name, item, key );
	}

	updateAll<T>( store_name:string, items:any[]):Promise<T[]>
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[store_name].updateAll( items );
		},'updateItems '+store_name );
	}

	get<T>( store_name:string, key:IDBValidKey ):Promise<T | null>
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[ store_name ].get( key );
		},'get '+store_name );
	}


	/*
	* if options is passed resolves to the number of elements deleted
	*/

	/*
	deleteByKeyIds(store_name:string, arrayOfKeyIds:any[] ):Promise<any>
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[ store_name ].deleteByKeyIds( arrayOfKeyIds );
		},'deleteByKeyIds '+store_name );
	}
	*/

	/*
	* if options is passed resolves to the number of elements deleted
	*/

	removeAll<T>(store_name:string, options:Options<T> )
	{
		return this.transaction([store_name],'readwrite',(stores,_transaction)=>
		{
			return stores[ store_name ].removeAll( options );
		},'removeAll '+store_name );
	}

	remove(store_name:string, key:any )
	{
		return this.transaction([store_name], 'readwrite',(stores,_transaction)=>
		{
			return stores[store_name].remove( key );
		},'remove '+store_name);
	}

	getAllIndexesCounts(store_name:string)
	{
		return this.transaction([store_name], 'readonly',(stores,_transaction)=>
		{
			return stores[store_name].getAllIndexesCounts();
		},'getAllIndexesCounts '+store_name);
	}

	/*
	getDatabaseResume()
	{
		let names = Array.from( this.database.objectStoreNames );
		return this.transaction(names,'readonly',(stores,_transaction)=>
		{
			let result = {};
			let promises = [];
			Object.values( stores ).forEach(( store )=>{
				let obj = { name: store.name };
				result[ store.name ]=	obj;

				promises.push
				(
					store.getAllIndexesCounts().then(( result )=>{ obj.indexes = result; return result; })
					,store.count().then((result)=>{ obj.total = result; return result; })
				);
			});

			return Promise.all( promises ).then(()=> result);
		});
	}
	*/

	close()
	{
		if( this.database )
		{
			if( this.database != null )
				this.database.close();
		}
	}

	/*
	restoreBackup( json_obj, ignoreErrors )
	{
		let names = Array.from( this.database.objectStoreNames );
		return this.transaction(names,'readwrite',(stores,_transaction)=>
		{
			let promises = [];
			let keys = Object.keys( json_obj );

			keys.forEach((i)=>
			{
				if( i in stores )
					promise.push( stores.addAllFast( json_obj[ i ], ignoreErrors ).then(()=>true));
			});

			return Promise.all( promises );
		});
	}

	__serialize(obj)
	{
		if( obj instanceof Blob )
		{
			return new Promise((resolve,reject)=>
			{
				var reader = new FileReader();
				reader.readAsDataURL(blob);
				reader.onloadend = function() {
					resolve({ type: "blob" , data: reader.result });
				};
			});
		}

		return Promise.resolve( obj );
	}

	createBackup()
	{
		let names = Array.from( this.database.objectStoreNames );
		return this.transaction(names,'readonly',(stores,_transaction)=>
		{
			let result = {};
			let promises = [];
			Object.values( stores ).forEach(( store )=>{
				promises.push
				(
					store.getBackup().then(( store_result )=>{
						result[ store.name ]	= store_result;
						return true;
					})
				);
			});
			return Promise.all( promises ).then(()=>result);
		});
	}
	*/

	transaction(store_names:string[],mode:IDBTransactionMode,trans_callback:TransactionCallback,transaction_name:string=''+Date.now()):Promise<any>
	{
		if( !this.is_initialized )
		{
			return this.init().then(()=>{
				return this.transaction( store_names, mode, trans_callback, transaction_name);
			});
		}

		store_names.forEach((i)=>{
			if( !this.database || !this.database.objectStoreNames.contains( i ) )
				throw 'Store "'+i+' doesn\'t exists';
		});


		if(this.database == null )
			return Promise.reject('Database is null');

		let txt:IDBTransaction = this.database.transaction( store_names, mode );

		let promise_txt = new Promise<void>((resolve,reject)=>
		{
			txt.onerror = (evt)=>
			{
				if( this.debug )
					console.log('Transaction '+(transaction_name? transaction_name: mode )+': error', evt );

				reject( evt );
			};

			txt.oncomplete = (evt)=>
			{
				if( this.debug )
					console.log('Transaction '+(transaction_name? transaction_name: mode )+': complete', evt );
				resolve();
			};
		});

		let stores:Record<string,ObjectStore<any>> = {};

		store_names.forEach((i)=>
		{
			stores[ i ] = new ObjectStore( txt.objectStore( i ) );
			stores[ i ].debug = this.debug;
		});

		let p = trans_callback( stores, txt );

		return Promise.all([ p, promise_txt ]).then((results)=>
		{
			return Promise.resolve(results[0]);
		});
	}
}

