import {ObjectStore} from "./ObjectStore";

export interface StoreDictionary
{
	[key:string]:ObjectStore<any>;
}

export interface IndexSchema
{
	indexName: string;
	keyPath: string;
	objectParameters: IDBIndexParameters;
}

export interface StoreSchema
{
	name:string;
	keyPath:string;
	autoIncrement:boolean,
	indexes:IndexSchema[]
}
export interface DatabaseSchema
{
	name:string;
	version:number;
	stores:Record<string,StoreSchema>
}

/*	new DatabaseStore(""{
			name		: "users"
			,version	: 1
			,stores		:{
				user: {
					keyPath	: 'id'
					autoincrement: true
					indexes	:
					[
						{ indexName: "name", keyPath:"name", objectParameters: { uniq : false, multiEntry: false, locale: 'auto'  } }
						,{ indexName: "age", keyPath:"age", objectParameters: { uniq : false, multiEntry: false, locale: 'auto'  } }
						,{ indexName: "curp", keyPath:"age", objectParameters: { uniq : true, multiEntry: false, locale: 'auto'  } }
						,{ indexName: "tags", keyPath:"tags", objectParameters: { uniq : false, multiEntry: true , locale: 'auto'  } } //age i thing it must be a array
					]
				}
			}
		});

		SchemaBuilder.create({
			user : "++id,name,age,curp,*tags"
		})
*/
export class SchemaBuilder
{
	static create(db_name:string, version:number, obj:Record<string,string>):DatabaseSchema
	{
		let stores:Record<string,StoreSchema> ={};

		for(let i in obj)
		{
			let objStore:StoreSchema = { name: i, indexes:[],keyPath:'id',autoIncrement:false };
			stores[ i ]= objStore;

			let indexes = obj[i].split(',');
			indexes.forEach((i:string,index:number)=>
			{
				let is_auto_increment = i.indexOf('++') == 0;
				let is_multi_entry		= i.indexOf('*') == 0;
				//let is_compound				= i.indexOf("[") == 0;
				let is_uniq						= i.indexOf("&") == 0;

				let name = i.replace(/^\[/,'')
						.replace(/]$/,'')
						.replace(/^\+\+/,'')
						.replace(/^\*/,'')
						.replace(/^&/,'');

				if( index == 0 )
				{
					objStore.keyPath = name;
					objStore.autoIncrement = is_auto_increment;
				}
				else
				{
					objStore.indexes.push
					({
						indexName: name,
						keyPath: name.replace(/\+/,','),
						objectParameters:{ unique: is_uniq, multiEntry: is_multi_entry}
					});
				}
			})
		}
		return{
			name: db_name,
			version: version,
			stores: stores
		}
	}
}

