import {ItemInfo, SearchTerm} from "../models/models";
import {DatabaseStore} from "./Finger/DatabaseStore";
import {Options} from "./Finger/OptionsUtils";
import {StoreDictionary} from "./Finger/SchemeBuilder";

const sync_data_db ={
	name: 'offline-sync-data',
	version: 2,
	schema: { dates:'++id' }
};

class OfflineUtils
{
	static getLastSyncDate():Promise<Date| null>
	{
		let db	= DatabaseStore.builder
		(
			sync_data_db.name,
			sync_data_db.version,
			sync_data_db.schema
		);

		let options = new Options();
		//options.count =1;
		options.direction = 'prev';
		//options.index = 'id'; //Lanza un error por que es el indice por defecto

		return db.getAll('dates',options ).then((response:Record<string,any>[])=>
		{
			return response.length > 0 ? response[0].date : null;
		});
	}

	static syncOrderItemInfoList(db:DatabaseStore,item_info_list:ItemInfo[])
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

			str+' '+item_info.item.name;

			if( item_info.category )
				str += ' '+item_info.category.name;

			terms.push( ... OfflineUtils.getTerms( str, item_info.item.id ) );

			let opt = new Options();
			opt.index = 'id';
			opt.comparations.set('=', item_info.item.id);
			terms_to_remove.push(opt);
		});

		let txt_callback = (stores:StoreDictionary,txt:IDBTransaction) =>
		{
			let promises:Promise<any>[] = [ stores.item_info.updateAll( item_info_list ) ];

			terms_to_remove.map((opt:Options<SearchTerm>)=>
			{
				promises.push( stores.item_terms.removeAll(opt) );
			})

			return Promise.all( promises ).then(()=>{
				return stores.item_terms.addAllFast(terms, false );
			})
		};

		return db.transaction
		(
			['item_terms','item_info'],
			'readwrite',
			txt_callback,
			'SyncOfflineItems-'+Date.now()
		);
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
}
