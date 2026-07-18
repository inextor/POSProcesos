import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RestSimple } from '../../services/Rest';
import { Store } from '../../RestModels';
import { BaseComponent } from '../../base/base.component';

@Component({
	selector: 'app-store-search',
	templateUrl: './store-search.component.html',
	styleUrl: './store-search.component.css',
	imports: [CommonModule, FormsModule],
})
export class StoreSearchComponent extends BaseComponent implements OnInit, OnDestroy
{
	@Input() value: number | null | undefined = null;
	@Output() valueChange = new EventEmitter<number | null>();

	@Input() placeholder: string = 'Buscar tienda...';
	@Input() nullLabel: string = 'Seleccionar tienda';

	rest_all_stores: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'status']);
	all_stores: Store[] = [];
	filtered_stores: Store[] = [];
	use_select: boolean = false;

	search_str: string = '';
	show_dropdown: boolean = false;
	selected_index: number = -1;

	private search_subject = new Subject<string>();
	private search_sub: Subscription | null = null;

	ngOnInit(): void
	{
		this.rest_all_stores.search({ eq: { status: 'ACTIVE' }, limit: 999999, sort_order: ['name_ASC'] })
			.subscribe({
				next: (response) =>
				{
					this.all_stores = response.data;
					this.use_select = this.all_stores.length <= 50;
					if (this.use_select && this.value)
					{
						let found = this.all_stores.find(s => s.id === this.value);
						if (found)
						{
							this.search_str = found.name || '';
						}
					}
				},
				error: () =>
				{
					this.use_select = true;
				}
			});

		this.search_sub = this.search_subject.pipe(
			debounceTime(200),
			distinctUntilChanged()
		).subscribe(term =>
		{
			if (!term || term.length < 1)
			{
				this.filtered_stores = [];
				this.selected_index = -1;
				return;
			}
			const lower = term.toLowerCase();
			this.filtered_stores = this.all_stores
				.filter(s => (s.name || '').toLowerCase().includes(lower))
				.slice(0, 20);
			this.selected_index = -1;
		});
	}

	onInputChange(value: string): void
	{
		this.search_str = value;
		this.search_subject.next(value);
		this.show_dropdown = true;
	}

	onSelectStore(store: Store): void
	{
		this.value = store.id;
		this.valueChange.emit(store.id);
		this.search_str = store.name || '';
		this.show_dropdown = false;
		this.filtered_stores = [];
	}

	onClearSearch(): void
	{
		this.value = null;
		this.valueChange.emit(null);
		this.search_str = '';
		this.show_dropdown = false;
		this.filtered_stores = [];
	}

	onSearchFocus(): void
	{
		if (this.search_str && this.search_str.length >= 1)
		{
			this.show_dropdown = true;
		}
		else if (!this.value)
		{
			this.filtered_stores = this.all_stores.slice(0, 20);
			this.selected_index = -1;
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
		if (!this.show_dropdown || this.filtered_stores.length === 0)
		{
			return;
		}

		if (event.key === 'ArrowDown')
		{
			event.preventDefault();
			this.selected_index = Math.min(this.selected_index + 1, this.filtered_stores.length - 1);
		}
		else if (event.key === 'ArrowUp')
		{
			event.preventDefault();
			this.selected_index = Math.max(this.selected_index - 1, 0);
		}
		else if (event.key === 'Enter')
		{
			event.preventDefault();
			if (this.selected_index >= 0 && this.selected_index < this.filtered_stores.length)
			{
				this.onSelectStore(this.filtered_stores[this.selected_index]);
			}
		}
		else if (event.key === 'Escape')
		{
			this.show_dropdown = false;
		}
	}

	override ngOnDestroy(): void
	{
		this.search_sub?.unsubscribe();
	}
}
