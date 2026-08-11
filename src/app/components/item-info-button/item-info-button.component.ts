import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemInfoService } from '../../modules/shared/services/item-info.service';
import { ItemInfo } from '../../modules/shared/Models';

@Component({
	selector: 'app-item-info-button',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './item-info-button.component.html',
	styleUrl: './item-info-button.component.css'
})
export class ItemInfoButtonComponent
{
	@Input() item_info:ItemInfo | null = null;
	@Input() item_id:number | null = null;
	@Input() btn_class:string = 'btn btn-sm btn-primary';

	constructor(private item_info_service:ItemInfoService)
	{
	}

	onClick()
	{
		if( this.item_info )
		{
			this.item_info_service.showItemInfo( this.item_info );
			return;
		}

		if( this.item_id != null )
		{
			this.item_info_service.showItemInfoWithId( this.item_id );
		}
	}
}
