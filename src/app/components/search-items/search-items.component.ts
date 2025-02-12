import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, filter, mergeMap } from 'rxjs/operators';
import { Item } from '../../modules/shared/RestModels';
import { Rest } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ShortcutsService, KeyboardShortcutEvent } from '../../modules/shared/services/shortcuts.service';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { ItemInfo } from '../../modules/shared/Models';

interface CItemInfo extends ItemInfo
{
	display_category:boolean;
}

@Component
({
	selector: 'app-search-items',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './search-items.component.html',
	styleUrl: './search-items.component.css'
})
export class SearchItemsComponent extends BaseComponent implements OnInit,OnDestroy,OnChanges
{
	@ViewChild('item_search', { read: ElementRef })
	item_search!: ElementRef;
	item_info_list:ItemInfo[] = [];
	@Input() search_str:string = '';
	@Output() search_strChange = new EventEmitter<string>();
	@Input() store_id:number	= 0;
	@Input() reset_on_search:boolean = true;
	@Output() item_selected = new EventEmitter<ItemInfo>();
	@Input() reset:number = 0;
	@Input() for_reservation:boolean = false;

	selected_index = -1;

	rest_item_info:Rest<Item, ItemInfo> = this.rest.initRest('item_info');

	search_subject = new Subject<string>();
	shortcuts:ShortcutsService = new ShortcutsService();

	ngOnChanges(changes: SimpleChanges): void
	{
		if( changes['search_str'] )
		{
			if( this.search_str == '' )
			{
				this.item_info_list.splice(0,this.item_info_list.length);
			}
		}
	}

	ngOnInit(): void
	{
		this.subs.sink = this.shortcuts?.shortcuts.pipe
		(
			filter((evt:KeyboardShortcutEvent)=>
			{
				return evt.is_stopped === false;
			})
		).subscribe((evt)=>{
			this.shortcutHandler(evt);
		});

		this.subs.sink = this.search_subject
		.pipe
		(
			filter((x)=>
			{
				if( !x )
				{
					this.item_info_list = [];
					return false;
				}
				return true;
			}),
			debounceTime(350),
			mergeMap((response)=>
			{
				let search_obj:any = {
					eq:{ status: 'ACTIVE'},
					limit: 50,
					search_extra:{ store_id:this.store_id, category_name: response }
				};

				if( this.for_reservation )
				{
					search_obj.eq.for_reservation = 'YES';
				}

				return this.rest_item_info.search( search_obj );
			})
		)
		.subscribe
		({
			next:(response)=>
			{
				this.item_info_list = response.data.map((ii)=>
				{
					let index = ii.category ? ii.item.name.trim().toLowerCase().indexOf(ii.category.name.trim().toLowerCase()) : -1;
					ii.display_category = ii.category != null && ii.item.name.trim().toLowerCase().indexOf(ii.category.name.trim().toLowerCase()) >= 0;
					return ii as CItemInfo;
				});

				this.selected_index = 0;
			},
			error:(error)=>
			{

			}
		});
	}

	shortcutHandler(evt: KeyboardShortcutEvent)
	{
		if( this.item_info_list.length )
		{
			switch( evt.shortcut.key_combination )
			{
				case 'Escape':
				{
					if( evt.stopPropagation() )
					{
						this.selected_index = -1;
						this.item_info_list.splice(0,this.item_info_list.length);
					}
					return;
				}
				//case 'ArrowLeft':
				case 'ArrowUp':
				{
					if( this.selected_index > 0 )
					{
						this.selected_index--;
						evt.stopPropagation();
					}
					return;
				}
				case 'ArrowDown':
				{
					if( this.selected_index < this.item_info_list.length -1)
					{
						this.selected_index++;
						console.log('arrow down');
						evt.stopPropagation();
					}
					return;
				}
				case 'Enter':
				{
					this.onItemSelected( this.item_info_list[ this.selected_index ] );
					evt.stopPropagation();
					return;
				}
			}
		}
	}

	onItemSelected(item_info:ItemInfo)
	{
		this.item_selected.emit( item_info );

		if( this.reset_on_search )
		{
			this.search_str = '';
			this.search_strChange.emit( this.search_str );
		}
		else
		{
			this.search_str = item_info.item.name || '';
			this.search_strChange.emit( this.search_str );
		}
		this.item_info_list.splice(0,this.item_info_list.length );
	}

	keyPressed(event:any)
	{
		//let keyboard_event = event as KeyboardEvent;

		//console.log( keyboard_event.key );

		//if( this.item_info_list.length )
		//{
		//	console.log('Procesand la lista no esta vacia');
		//	if( keyboard_event.key == 'ArrowDown' )
		//	{
		//		console.log('Arrow down');
		//		if( this.selected_index < (this.item_info_list.length -1) )
		//		{
		//			this.selected_index++;
		//			keyboard_event.preventDefault();
		//			keyboard_event.stopPropagation();
		//			return;
		//		}
		//	}
		//	if( keyboard_event.key == 'ArrowUp' )
		//	{
		//		console.log('Arrow up');
		//		if( this.selected_index > 0 )
		//		{
		//			this.selected_index--;
		//			keyboard_event.preventDefault();
		//			keyboard_event.stopPropagation();
		//			return;
		//		}
		//	}
		//	if( keyboard_event.key == 'Enter' )
		//	{
		//		console.log('Enter');
		//		this.onItemSelected( this.item_info_list[ this.selected_index ] );
		//		keyboard_event.preventDefault();
		//		keyboard_event.stopPropagation();
		//		return;
		//	}
		//}

		//if( keyboard_event.key == "Escape" )
		//{
		//	this.item_info_list = [];
		//	this.search_str = '';
		//	keyboard_event.stopPropagation();
		//	return;
		//}

		if( this.search_str == '' )
		{
			this.item_info_list = [];
			return;
		}

		this.search_subject.next( ''+this.search_str );
		this.search_strChange.emit( ''+this.search_str );
	}
}
