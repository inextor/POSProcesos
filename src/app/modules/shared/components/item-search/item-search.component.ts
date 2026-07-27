import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Rest } from '../../services/Rest';
import { Item } from '../../RestModels';
import { ItemInfo } from '../../Models';
import { BaseComponent } from '../../base/base.component';

interface CSearchItem
{
	id:number;
	name:string;
	code:string | null;
	label:string;
}

@Component({
	selector: 'app-item-search',
	templateUrl: './item-search.component.html',
	styleUrl: './item-search.component.css',
	imports: [CommonModule, FormsModule],
})
export class ItemSearchComponent extends BaseComponent implements OnInit, OnChanges
{
	@Input() value: number | null | undefined = null;
	@Output() valueChange = new EventEmitter<number | null>();

	//Texto libre: permite filtrar sin elegir un articulo concreto (ej. "concha" para todas las conchas)
	@Input() text: string = '';
	@Output() textChange = new EventEmitter<string>();

	@Input() placeholder: string = '';
	@Input() nullLabel: string = 'Buscar artículo...';
	@Input() search_limit: number = 20;
	@Input() min_chars: number = 2;

	rest_item_info: Rest<Item, ItemInfo> = this.rest.initRest('item_info');

	found_items: CSearchItem[] = [];
	search_str: string = '';
	show_dropdown: boolean = false;
	selected_index: number = -1;
	is_searching: boolean = false;
	searched_once: boolean = false;

	private search_subject = new Subject<string>();
	private resolve_sub: Subscription | null = null;
	private resolved_id: number | null = null;

	get input_placeholder(): string
	{
		return this.placeholder || this.nullLabel;
	}

	ngOnInit(): void
	{
		this.subs.sink = this.search_subject.pipe
		(
			debounceTime(300),
			distinctUntilChanged(),
			//switchMap cancela la peticion anterior: al escribir rapido solo llega la ultima respuesta
			switchMap((term:string) =>
			{
				let clean = (term || '').trim();

				if( clean.length < this.min_chars )
				{
					this.is_searching = false;
					this.searched_once = false;
					return of(null);
				}

				this.is_searching = true;

				//La busqueda la resuelve el backend (item_info.php): prefijo por nombre de articulo,
				//nombre de categoria o codigo; con broad_search tambien "categoria + nombre" en cualquier posicion.
				//for_listings evita que el back arme opciones/atributos/seriales que aqui no se usan.
				return this.rest_item_info.search
				({
					limit: this.search_limit,
					search_extra:
					{
						category_name: clean,
						broad_search: 1,
						for_listings: 1
					}
				})
				.pipe( catchError(()=> of(null)) );
			})
		)
		.subscribe((response)=>
		{
			this.is_searching = false;

			if( response === null )
			{
				this.found_items = [];
				this.selected_index = -1;
				return;
			}

			this.searched_once = true;

			this.found_items = response.data.map((ii)=>
			({
				id: ii.item.id,
				name: ii.item.name,
				code: ii.item.code,
				label: this.getLabel( ii.item.name, ii.category ? ii.category.name : null )
			}));

			this.selected_index = this.found_items.length ? 0 : -1;
		});

		if( this.text && !this.search_str )
		{
			this.search_str = this.text;
		}

		this.resolveValue();
	}

	ngOnChanges(changes: SimpleChanges): void
	{
		if( changes['text'] && this.text && this.text !== this.search_str )
		{
			this.search_str = this.text;
		}

		if( !changes['value'] )
		{
			return;
		}

		if( this.value === null || this.value === undefined )
		{
			this.resolved_id = null;
			return;
		}

		this.resolveValue();
	}

	//Cuando el id llega desde afuera (URL o el padre) hay que traer el nombre para poder mostrarlo
	private resolveValue(): void
	{
		let id = this.value ?? null;

		if( id === null || id === this.resolved_id )
		{
			return;
		}

		this.resolve_sub?.unsubscribe();

		this.resolve_sub = this.rest_item_info.search
		({
			eq: { id },
			limit: 1,
			search_extra: { for_listings: 1 }
		})
		.subscribe
		({
			next: (response)=>
			{
				let ii = response.data[0];

				if( !ii )
				{
					return;
				}

				this.resolved_id = ii.item.id;
				this.search_str = this.getLabel( ii.item.name, ii.category ? ii.category.name : null );
			},
			error: ()=>{}
		});

		this.subs.sink = this.resolve_sub;
	}

	getLabel(name:string, category_name:string | null): string
	{
		if( !category_name )
		{
			return name;
		}

		//Evitar "Pan Dulce - Pan Dulce Concha" cuando el nombre ya trae la categoria
		if( name.trim().toLowerCase().indexOf( category_name.trim().toLowerCase() ) >= 0 )
		{
			return name;
		}

		return category_name+' - '+name;
	}

	onInputChange(value: string): void
	{
		this.search_str = value;
		this.show_dropdown = true;

		//Escribir invalida la seleccion previa: el padre no debe quedarse con un id que ya no corresponde al texto
		if( this.value !== null && this.value !== undefined )
		{
			this.value = null;
			this.resolved_id = null;
			this.valueChange.emit( null );
		}

		this.textChange.emit( value );
		this.search_subject.next( value );
	}

	onSelectItem(item: CSearchItem): void
	{
		this.value = item.id;
		this.resolved_id = item.id;
		this.search_str = item.label;
		this.show_dropdown = false;
		this.found_items = [];

		this.valueChange.emit( item.id );
		this.textChange.emit( item.label );
	}

	onClearSearch(): void
	{
		this.value = null;
		this.resolved_id = null;
		this.search_str = '';
		this.show_dropdown = false;
		this.found_items = [];
		this.searched_once = false;

		this.valueChange.emit( null );
		this.textChange.emit( '' );
	}

	onSearchFocus(): void
	{
		//Con miles de articulos no tiene caso precargar una lista: solo se abre si ya hay texto que buscar
		if( this.search_str && this.search_str.trim().length >= this.min_chars )
		{
			this.show_dropdown = true;
		}
	}

	onSearchBlur(): void
	{
		setTimeout(() =>
		{
			this.show_dropdown = false;
		}, 200);
	}

	onSearchKeydown(event: KeyboardEvent): void
	{
		if( event.key === 'Escape' )
		{
			this.show_dropdown = false;
			return;
		}

		if( !this.show_dropdown || this.found_items.length === 0 )
		{
			return;
		}

		if( event.key === 'ArrowDown' )
		{
			event.preventDefault();
			this.selected_index = Math.min( this.selected_index + 1, this.found_items.length - 1 );
		}
		else if( event.key === 'ArrowUp' )
		{
			event.preventDefault();
			this.selected_index = Math.max( this.selected_index - 1, 0 );
		}
		else if( event.key === 'Enter' )
		{
			if( this.selected_index >= 0 && this.selected_index < this.found_items.length )
			{
				event.preventDefault();
				this.onSelectItem( this.found_items[ this.selected_index ] );
			}
		}
	}
}
