import {ObjectStore} from "./ObjectStore";

type Comparison = '>' | '>=' | '<' | '<=' | '=';


export class Options<T>
{
	direction:IDBCursorDirection = 'next';
	count:number = -1;
	index:string | null = null;
	comparations:Map<Comparison,any> = new Map();

	getQueryObject(store:ObjectStore<T>):IDBObjectStore | IDBIndex
	{
		try{
			return this.index ? store.store.index( this.index ) : store.store;
		}
		catch(e)
		{
			if( e instanceof DOMException && e.name == 'NotFoundError' )
			{
				console.error(`Index ${this.index} at ${store.name} not found`);
			}
			throw e;
		}
	}

	getKeyRange():IDBKeyRange | null
	{
		if( this.comparations.has('=') )
		{
			return IDBKeyRange.only( this.comparations.get('=') );
		}

		let isLowerBoundOpen	= this.comparations.has('>')
		let isLowerBound		= isLowerBoundOpen || this.comparations.has('>=');

		let isUpperBoundOpen	= this.comparations.has('<');
		let isUpperBound		= isUpperBoundOpen || this.comparations.has('<=');


		if( isLowerBound && isUpperBound )
		{
			let lowerBound	= this.comparations.get( isLowerBoundOpen ?  '>':'>=');
			let upperBound	= this.comparations.get( isUpperBoundOpen ?  '<':'<=');

			return IDBKeyRange.bound( lowerBound, upperBound, isLowerBoundOpen, isUpperBoundOpen );
		}

		if( isLowerBound )
		{
			let lowerBound	= this.comparations.get( isLowerBoundOpen ? '>' : '>=' );
			return IDBKeyRange.lowerBound( lowerBound , isLowerBoundOpen );
		}

		if( isUpperBound )
		{
			let upperBound = this.comparations.get( isUpperBoundOpen ? '<' : '<=' );
			return IDBKeyRange.upperBound( upperBound , isUpperBoundOpen );
		}

		return null;
	}

	static build(info:Record<string,any>):Options<any>
	{
		let options = new Options<any>();

		let params:Comparison[] = ['>','>=','<','<=','='];
		for(let p of params )
		{
			if( p in info )
				options.comparations.set(p,info[p]);
		}

		if( 'index' in info)
			options.index = info['index'] as string;

		if( 'count' in info)
			options.count = info['count'] as number;

		if( 'direction' in info)
		{
			options.direction = info['direction'] as IDBCursorDirection;
		}
		
		return options;
	}
}
