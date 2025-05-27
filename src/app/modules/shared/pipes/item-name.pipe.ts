import { Pipe, PipeTransform } from '@angular/core';
import { ItemInfo } from '../Models';
import { RestService } from '../services/rest.service';

@Pipe
({
	name: 'itemName',
	standalone: true
})
export class ItemNamePipe implements PipeTransform {

	constructor(private rest: RestService) {}

	transform(item_info: any, ...args: unknown[]): string
	{
		if( !item_info.category)
			return item_info.item.name;

		if( this.rest.preferences.display_categories_on_items )
		{
			return `${item_info.category.name} - ${item_info.item.name}`;
		}

		return item_info.item.name;
	}
}
