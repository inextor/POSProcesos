import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../modules/shared/RestModels';
import { Subject, debounceTime, filter, mergeMap } from 'rxjs';
import { SubSink } from 'subsink';
import { RestService } from '../../modules/shared/services/rest.service';
import { KeyboardShortcutEvent, ShortcutsService } from '../../modules/shared/services/shortcuts.service';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-search-users',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './search-users.component.html',
	styleUrl: './search-users.component.css'
})
export class SearchUsersComponent implements OnInit, OnDestroy, OnChanges
{
	@Input() type: 'USER' | 'CLIENT' = 'USER';
	@Input() search_str:string = '';
	@Input() reset_on_search:boolean = true;
	@Output() search_strChange = new EventEmitter<string>();
	@Output() user_selected = new EventEmitter<User | null>();
	@Input() null_user_string:string = 'No registrar';

	rest_user = this.rest.initRestSimple<User>('user');

	search_subject = new Subject<string>();
	user_list:User[] = [];

	subs = new SubSink();
	show_null_option:Boolean = true;
	selected_index = -1;

	constructor(public rest:RestService, public shortcuts:ShortcutsService) { }

	ngOnInit(): void
	{
		this.subs.sink = this.shortcuts.shortcuts.pipe
		(
			filter((evt:KeyboardShortcutEvent)=>
			{
				return evt.is_stopped === false;
			})
		)
		.subscribe
		({
			next:(evt)=>
			{
				this.shortcutHandler(evt);
			},
			error:(_error)=>
			{

			}
		});

		this.subs.sink = this.search_subject
		.pipe
		(
			filter((x)=>
			{
				if( !x )
				{
					this.user_list = [];
					return false;
				}
				return true;
			}),
			debounceTime(350),
			mergeMap((response)=>
			{
				let permissions:Record<string,string|number|null|Date> = this.type == 'CLIENT' ? {}: {'user_permission_production': 1};

				return this.rest_user.search
				({
					eq:{ status: 'ACTIVE', type: this.type, },
					start:{ name: response},
					search_extra: permissions,
					limit: 50,
				})
			})
		)
		.subscribe
		({
			next:(response)=>
			{

				this.user_list = response.data;
				//sort as most closest match the search string
				this.user_list.sort((a,b)=>
				{
					let a_index = a.name.toLowerCase().indexOf(this.search_str.toLowerCase());
					let b_index = b.name.toLowerCase().indexOf(this.search_str.toLowerCase());

					if( a_index == b_index )
					{
						return a.name.localeCompare(b.name);
					}

					return b_index - a_index;
				});
				this.selected_index = 0;
			},
			error:(error)=>
			{

			}
		});
	}

	ngOnDestroy()
	{
		this.subs.unsubscribe();
	}

	ngOnChanges(changes: SimpleChanges): void
	{
		if( changes['search_str'] )
		{
			if( this.search_str == '' )
			{
				this.user_list.splice(0,this.user_list.length);
			}
		}
	}

	shortcutHandler(evt: KeyboardShortcutEvent)
	{
		if( this.user_list.length )
		{
			switch( evt.shortcut.key_combination )
			{
				case 'Escape':
				{
					if( evt.stopPropagation() )
					{
						this.selected_index = -1;
						this.user_list.splice(0,this.user_list.length);
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
					if( this.selected_index < this.user_list.length )
					{
						this.selected_index++;
						console.log('arrow down');
						evt.stopPropagation();
					}
					return;
				}
				case 'Enter':
				{
					this.onUserSelected( this.user_list[ this.selected_index -1 ] );
					evt.stopPropagation();
					return;
				}
			}
		}
	}

	onUserSelected(user:User | null)
	{
		this.show_null_option = false;
		this.user_selected.emit( user );

		if( this.reset_on_search )
		{
			this.search_str = '';
			this.search_strChange.emit( this.search_str );
		}
		else
		{
			if( user)
			{
				this.search_str = user.name || '';
			}
			this.search_strChange.emit( this.search_str );
		}
		this.user_list.splice(0,this.user_list.length );
	}

	keyPressed(_event:any)
	{
		if( this.search_str == '' )
		{
			this.user_list = [];
			return;
		}

		this.search_subject.next( ''+this.search_str );
		this.search_strChange.emit( ''+this.search_str );
	}
}
