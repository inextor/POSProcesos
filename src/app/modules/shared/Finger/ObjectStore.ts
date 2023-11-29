import {Options} from './OptionsUtils';

type FilterFunction<T> = (cursor:T)=>boolean | null;

export class ObjectStore<T>
{
	store:IDBObjectStore;
	debug:boolean = true;
	name:string;

	constructor(idbStore:IDBObjectStore)
	{
		this.store = idbStore;
		this.debug = false;
		this.name = idbStore.name;
	}

	add( item:T, key:any=null ):Promise<any>
	{
		return new Promise((resolve,reject)=>
		{
			let request = key !==null ? this.store.add( item, key ) : this.store.add( item );

			request.onsuccess = (evt:Event)=>
			{
				if( this.debug )
					console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Success', evt );

				let result = evt.target as IDBRequest;

				let rq2 = this.store.get( request.result );
				rq2.onsuccess = (evt)=> {
					resolve( rq2.result );
				};

				rq2.onerror = ( error )=> {
					reject( evt );
				};
			};

			request.onerror = (evt)=>
			{
				if( this.debug )
					console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Error ', evt);

				reject( evt );
			};
		});
	}

	//Transaction
	addAll(items:T[],insert_ignore:boolean):Promise<any[]>
	{
		let count = items.length;
		return new Promise((resolve,reject)=>
		{
			let added_items:any[] = [];

			let error_handler = (evt:Event)=>
			{
				if( insert_ignore )
				{
					evt.preventDefault();
					evt.stopPropagation();
					count--;
					if( count == 0 )
						resolve( added_items );
					return;

				}
				reject(evt);

				console.log('AddItems '+this.name+' Request Fail ', evt );
			};

			items.forEach((i)=>
			{
				let request = this.store.add( i );
				request.onerror = error_handler;
				request.onsuccess = ()=>
				{
					added_items.push( request.result );
					count--;
					if( count == 0 )
						resolve( added_items );
				};
			});
		});
	}

	addAllFast( items:T[], insert_ignore:boolean ):Promise<void>
	{
		if( !insert_ignore )
		{
			items.forEach( i => this.store.add( i ) );
			return Promise.resolve();
		}

		let error_handler = (evt:Event)=>
		{
			evt.preventDefault();
			evt.stopPropagation();
		};

		items.forEach((i)=>
		{
			let request =	this.store.add( i );
			request.onerror = error_handler;
		});

		return Promise.resolve();
	}

	clear():Promise<void>
	{
		return new Promise((resolve,reject)=>
		{
			let request = this.store.clear();
			request.onsuccess = ()=>{ resolve() };
			request.onerror = ()=>{ reject() };
		});
	}

	count(options:Options<T> = new Options()):Promise<number>
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject:IDBObjectStore | IDBIndex = options.getQueryObject(this);
			let range	= options.getKeyRange();
			let request = queryObject.count( range || undefined );

			request.onerror = reject;
			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

	get<T>(key:any):Promise<T|null>
	{
		return new Promise((resolve,reject)=>
		{
			if( this.debug )
			{
				console.log("Store name", this.name );
			}

			let request = this.store.get( key );
			request.onerror = reject;

			request.onsuccess = function(evt)
			{
				if( request.result == undefined )
					resolve( null );

				resolve( request.result );
			};
		});
	}

	getAll( options:Options<T> = new Options(),filter:FilterFunction<T> | null = null ):Promise<T[]>
	{
		let empty_filter = (cursor:T)=>{ return true; };

		let final_filter = filter || empty_filter;
		return new Promise((resolve,reject)=>
		{
			let queryObject:IDBObjectStore | IDBIndex = options.getQueryObject(this);
			let range	= options.getKeyRange();

			if( filter == null && options.direction == 'next' )
			{
				let request	= ( range == null && options.count < 1 )
						? queryObject.getAll()
						: queryObject.getAll( range, options.count < 1 ? undefined : options.count );

				request.onsuccess = ()=>
				{
					resolve( request.result );
				};

				request.onerror = reject;
			}
			else
			{
				let request		= queryObject.openCursor( range, options.direction );
				let results:T[]	= [];

				request.onerror = reject;
				request.onsuccess = (evt:Event)=>
				{
					let target:any = evt.target

					if( target.result )
					{
						let cursor = target.result as IDBCursorWithValue;

						if( final_filter( cursor.value ) )
							results.push( cursor.value );

						cursor.continue();
					}
					else
					{
						resolve( results );
						//Maybe call resolve
					}
				};
			}
		});
	}

	getAllIndexesCounts():Promise<Map<string,number>>
	{
		return new Promise((resolve,reject)=>
		{
			let result:Record<string,number> = {};
			let names 	= Array.from( this.store.indexNames );

			if( names.length == 0 )
			{
				resolve(new Map());
				return;
			}

			let counter = names.length;
			if( this.debug )
				console.log('Get all index count for '+this.name );

			let map = new Map<string,number>();

			names.forEach( i =>
			{
				let index = this.store.index( i );
				let request = index.count();
				request.onerror = reject;
				request.onsuccess = ()=>
				{
					if( this.debug )
						console.log('Success Count for '+i );

					result[ i ] = request.result;
					map.set(i,request.result as number );

					counter--;
					if( counter == 0 )
						resolve( map );
				};
			});
		});
	}

	getKeyByIndex(index:string,value:any)
	{
		return new Promise((resolve,reject)=>{
			let keyrange = IDBKeyRange.only( value );
			let queryObject = this.store.index( index );
			let request:IDBRequest = queryObject.getKey( keyrange );

			request.onerror = (evt:any)=>{
				console.error('Fallo al tratar de obtener el key de "'+index+'" con valor'+JSON.stringify(value), evt );
				reject(evt);
			};

			request.onsuccess = (evt:any)=>{
				console.log('request is', request, request.result);
				resolve( evt.target.result );
			};
		});
	}

	getAllKeys(options:Options<T>)
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject = options && 'index' in options
				? this.store.index( options.index as string )
				: this.store;

			let range		= options.getKeyRange();

			let request	= ( range == null && options.count < 1 )
					? queryObject.getAllKeys()
					: queryObject.getAllKeys( range, options.count < 1 ? undefined : options.count );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};

			request.onerror = reject;
		});
	}

	/*
	getBackup()
	{
		return new Promise((resolve,reject)=>
		{
			let result 	= [];
			let request = this.store.openCursor();

			request.onerror = reject;
			request.onsuccess = (evt:Event)=>
			{
				let target:any = evt.target;
				let cursor = target.result as IDBCursorWithValue;

				if( cursor )
				{
					result.push(cursor.value );
					cursor.continue();
				}
				else
				{
					//Maybe call resolve
					resolve( result );
				}
			};
		});
	}
	*/

	remove( key:IDBValidKey ):Promise<Event>
	{
		return new Promise((resolve,reject)=>
		{
			let request = this.store.delete( key );
			request.onsuccess = resolve;
			request.onerror = reject;
		});
	}

	/*
	* if options is passed resolves to the number of elements deleted
	* -1 if is unknown
	*/
	removeAll( options:Options<T> = new Options()):Promise<number>
	{
		if( options.index )
		{
			return this.removeByIndex( options );
		}

		return new Promise((resolve,reject)=>
		{
			let range		= options.getKeyRange() as IDBKeyRange;
			let request = this.store.delete( range );
			request.onsuccess = ()=>{
				resolve(-1); //TODO Check how many deleted
			};
			request.onerror = reject;
		});
	}

	removeByIndex(options:Options<T>):Promise<number>
	{
		return new Promise((resolve,reject)=>
		{
			let index = this.store.index( options.index  as string );
			let range = options.getKeyRange();
			let request = index.openCursor(range);
			let count = 0;

			request.onsuccess = (evt:Event)=>
			{
				let request:IDBRequest = evt.target as IDBRequest;
				let cursor:IDBCursor = request.result;

				if( cursor )
				{
					cursor.delete();
					count++;
					if( options.count < 1 || ( count < options.count ) )
					{
						cursor.continue();
					}
					else
					{
						resolve( count );
					}
				}
				else
				{
					resolve( count );
				}
			};
			request.onerror = reject;
		});
	}

	removeByKeyList(list:IDBValidKey[], options:Options<T> = new Options())
	{
		let orderedKeyList = list.slice(0);

		return new Promise((resolve)=>
		{
			let queryObject = options.getQueryObject(this);

			let count	= 0;
			let range	= options.getKeyRange();
			let i		= 0;
			let cursorReq = queryObject == this.store
				? this.store.openCursor( range )
				: queryObject.openKeyCursor();

			cursorReq.onsuccess = (evt:Event)=>
			{
				let target:any = evt.target;

				if( !target.result )
				{
					resolve(count);
					return;
				}

				let cursor	= target.result;
				let key		= cursor.key;

				while (key > orderedKeyList[i])
				{
					++i;
					if (i === orderedKeyList.length)
					{
						resolve( count );
						return;
					}
				}
				if (key === orderedKeyList[i])
				{
					count++;
					cursor.delete();
					cursor.continue();
				}
				else
				{
					cursor.continue(orderedKeyList[i]);
				}
			};
		});
	}

	//removeByKeyIds2(arrayOfKeyIds:IDBValidKey[]):Promise<number>
	removeByKeyIds2(arrayOfKeyIds:any[]):Promise<number>
	{
		return new Promise((resolve)=>
		{
			let total = arrayOfKeyIds.length;
			let count = 0;
			let success = ()=>{
				count++;
				total--;
				if( total == 0 )
					resolve( count );
			};

			let error = (evt:Event)=>
			{
				evt.preventDefault();
				evt.stopPropagation();
				if( total == 0 )
					resolve( count );
			};

			arrayOfKeyIds.forEach((key)=>
			{
				let request = this.store.delete( key );
				request.onsuccess = success;
				request.onerror = error;
			});
		});
	}

	getByKey( key:IDBValidKey,options:Options<T> = new Options() ):Promise<T>
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject = options.getQueryObject(this);
			let request = queryObject.get( key );

			request.onsuccess = (evt:Event)=>
			{
				let target:any = evt.target;
				let result = target.result;
				if( result )
					resolve( result );
				else
					reject( new Error('No se encontro el elemento') );
			};
			request.onerror = reject;
		});
	}

	getAllByKeyIndex(list:IDBValidKey[],options:Options<T> = new Options()):Promise<T[]>
	{
		let orderedKeyList = list.slice(0);

		return new Promise((resolve,reject)=>
		{
			let queryObject = options.getQueryObject(this);
			let range		= options.getKeyRange();
			let items:T[]		= [];

			let i = 0;
			let cursorReq = queryObject == this.store
				? this.store.openCursor( range )
				: queryObject.openKeyCursor();

			cursorReq.onerror = reject;
			cursorReq.onsuccess = (evt:Event)=>
			{
				let result = evt.target as IDBRequest;
				let cursor = result.result;

				if (!cursor)
				{
					resolve( items ); return;
				}

				let key = cursor.key;

				while (key > orderedKeyList[i])
				{
					// The cursor has passed beyond this key. Check next.
					++i;

					if (i === orderedKeyList.length) {
						// There is no next. Stop searching.
						resolve( items );
						return;
					}
				}

				if (key === orderedKeyList[i]) {
					// The current cursor value should be included and we should continue
					// a single step in case next item has the same key or possibly our
					// next key in orderedKeyList.
					//onfound(cursor.value);
					items.push( cursor.value );
					cursor.continue();
				} else {
					// cursor.key not yet at orderedKeyList[i]. Forward cursor to the next key to hunt for.
					cursor.continue(orderedKeyList[i]);
				}
			};
		});
	}

	getAllByKeyIndexAndTest(list:IDBValidKey[],options:Options<T> = new Options(),filter:FilterFunction<T>):Promise<T[]>
	{
		let orderedKeyList = list.slice(0);

		return new Promise((resolve,reject)=>
		{
			let queryObject = options.getQueryObject(this);
			let range		= options.getKeyRange();
			let items:T[]		= [];

			let i = 0;
			let cursorReq = queryObject == this.store
				? this.store.openCursor( range )
				: queryObject.openKeyCursor();

			cursorReq.onerror = reject;
			cursorReq.onsuccess = (evt:Event)=>
			{
				let result = evt.target as IDBRequest;
				let cursor = result.result;

				if (!cursor)
				{
					resolve( items ); return;
				}

				let key = cursor.key;

				while (key > orderedKeyList[i])
				{
					// The cursor has passed beyond this key. Check next.
					++i;

					if (i === orderedKeyList.length) {
						// There is no next. Stop searching.
						resolve( items );
						return;
					}
				}

				if (key === orderedKeyList[i] ) {
					// The current cursor value should be included and we should continue
					// a single step in case next item has the same key or possibly our
					// next key in orderedKeyList.
					//onfound(cursor.value);
					if( filter(cursor.value) )
					{
						items.push( cursor.value );
					}
					cursor.continue();
				} else {
					// cursor.key not yet at orderedKeyList[i]. Forward cursor to the next key to hunt for.
					cursor.continue(orderedKeyList[i]);
				}
			};
		});
	}

	//put( item:T, key:IDBValidKey ):Promise<T>
	put( item:T, key:any):Promise<T>
	{
		return new Promise((resolve,reject)=>
		{
			let request = key ? this.store.put( item, key ) : this.store.put( item );

			request.onsuccess = (evt:Event)=>
			{
				if( this.debug )
					console.log('Put Item('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Success', evt );

				let result = evt.target as IDBRequest;

				let rq = this.store.get( request.result );

				rq.onsuccess = (evt:Event)=>
				{
					resolve( rq.result );
				};

				rq.onerror = (evt)=>
				{
					if( this.debug )
						console.log('Get item for a Put tranx('+this.name+' key:'+key+') item:', item , evt);
					reject( evt );
				};
			};

			request.onerror = (evt)=>
			{
				if( this.debug )
					console.log('Put Item('+this.name+' key:'+key+' item:', item ,' Request Error ', evt);

				reject( evt );
			};
		});
	}
	/*
	updateItems(items)
	{
		return new Promise((resolve,reject)=>
		{
			let counter = items.length;
			let handler = (evt)=>{
				counter--;
				if( counter == 0 )
					resolve();
			};
			//console.log('Updating', items)
			items.forEach((i)=>{
			let request = this.store.put(i);
				request.onsuccess = handler;
				request.onerror = reject;
			});
		});
	}
	*/

	//update( item:T, key:IDBValidKey ):Promise<Event>
	update( item:T, key:any):Promise<Event>
	{
		return new Promise((resolve,reject)=>
		{
			let request = key === undefined ? this.store.put( item ) : this.store.put( item,key);
			request.onsuccess = resolve;
			request.onsuccess = reject;
		});
	}
	updateAll(items:T[]):Promise<T[]>
	{
		let promises:Promise<T>[] = [];
		items.forEach(i=>
		{
			promises.push(new Promise((resolve,reject)=>
			{
				let request = this.store.put( i );
				request.onsuccess = ()=>{ resolve( i ) };
				request.onerror = reject;
			}));
		});
		return Promise.all( promises );
	}
}
