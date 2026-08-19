import { Injectable } from '@angular/core';
import { Observable, of, ReplaySubject } from 'rxjs';
import { RestService } from './rest.service';
import { ItemInfo } from '../Models';
import { Item, Item_Attribute } from '../RestModels';
import { Rest } from './Rest';

@Injectable({
	providedIn: 'root'
})
export class ItemInfoService
{
	show_item_info:boolean = false;
	item_info:ItemInfo | null = null;
	item_id:number | null = null;
	loading:boolean = false;
	error:string | null = null;

	rest_item_info:Rest<Item,ItemInfo> = this.rest.initRest<Item,ItemInfo>('item_info');
	rest_item_attribute:Rest<Item_Attribute,Item_Attribute> = this.rest.initRest<Item_Attribute,Item_Attribute>('item_attribute');

	constructor(private rest:RestService)
	{
	}

	showItemInfo(item_info:ItemInfo):Observable<ItemInfo>
	{
		this.item_info = item_info;
		this.item_id = item_info?.item?.id ?? null;
		this.loading = false;
		this.error = null;
		this.show_item_info = true;

		this.ensureAttributes();

		return of( this.item_info );
	}

	showItemInfoWithId(item_id:number):Observable<ItemInfo>
	{
		this.item_info = null;
		this.item_id = item_id;
		this.loading = true;
		this.error = null;
		this.show_item_info = true;

		let subject = new ReplaySubject<ItemInfo>(1);

		this.rest_item_info.get( item_id )
		.subscribe
		({
			next:(response)=>
			{
				this.item_info = response;
				this.loading = false;
				this.ensureAttributes();
				subject.next( response );
				subject.complete();
			},
			error:(error)=>
			{
				this.loading = false;
				this.error = 'Ocurrio un error al cargar la información del artículo. Intente de nuevo.';
				subject.error( error );
			}
		});

		return subject.asObservable();
	}

	ensureAttributes()
	{
		if( this.item_id == null )
			return;

		let item_info = this.item_info;

		if( !item_info )
			return;

		if( item_info.attributes )
			return;

		this.rest_item_attribute.search({ eq:{ item_id: this.item_id }, limit: 9999 })
		.subscribe({
			next:(response)=>
			{
				item_info.attributes = response.data;
			},
			error:()=>
			{
			}
		});
	}

	close()
	{
		this.show_item_info = false;
		this.item_info = null;
		this.item_id = null;
		this.loading = false;
		this.error = null;
	}
}
