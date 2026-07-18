import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RestSimple } from '../../services/Rest';
import { Price_Type } from '../../RestModels';
import { BaseComponent } from '../../base/base.component';

@Component({
	selector: 'app-price-type-search',
	templateUrl: './price-type-search.component.html',
	styleUrl: './price-type-search.component.css',
	imports: [CommonModule, FormsModule],
})
export class PriceTypeSearchComponent extends BaseComponent implements OnInit, OnDestroy
{
	@Input() value: number | null | undefined = null;
	@Output() valueChange = new EventEmitter<number | null>();

	@Input() placeholder: string = 'Buscar tipo de precio...';
	@Input() nullLabel: string = 'Seleccionar tipo de precio';

	rest_all_price_types: RestSimple<Price_Type> = this.rest.initRestSimple('price_type', ['id', 'name', 'status']);
	all_price_types: Price_Type[] = [];
	filtered_price_types: Price_Type[] = [];
	use_select: boolean = false;

	search_str: string = '';
	show_dropdown: boolean = false;
	selected_index: number = -1;

	private search_subject = new Subject<string>();
	private search_sub: Subscription | null = null;

	ngOnInit(): void
	{
		this.rest_all_price_types.search({ eq: { status: 'ACTIVE' }, limit: 999999, sort_order: ['name_ASC'] })
			.subscribe({
				next: (response) =>
				{
					this.all_price_types = response.data;
					this.use_select = this.all_price_types.length <= 50;
					if (this.use_select && this.value)
					{
						let found = this.all_price_types.find(pt => pt.id === this.value);
						if (found)
						{
							this.search_str = found.name;
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
				this.filtered_price_types = [];
				this.selected_index = -1;
				return;
			}
			const lower = term.toLowerCase();
			this.filtered_price_types = this.all_price_types
				.filter(pt => pt.name.toLowerCase().includes(lower))
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

	onSelectPriceType(price_type: Price_Type): void
	{
		this.value = price_type.id;
		this.valueChange.emit(price_type.id);
		this.search_str = price_type.name;
		this.show_dropdown = false;
		this.filtered_price_types = [];
	}

	onClearSearch(): void
	{
		this.value = null;
		this.valueChange.emit(null);
		this.search_str = '';
		this.show_dropdown = false;
		this.filtered_price_types = [];
	}

	onSearchFocus(): void
	{
		if (this.search_str && this.search_str.length >= 1)
		{
			this.show_dropdown = true;
		}
		else if (!this.value)
		{
			this.filtered_price_types = this.all_price_types.slice(0, 20);
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
		if (!this.show_dropdown || this.filtered_price_types.length === 0)
		{
			return;
		}

		if (event.key === 'ArrowDown')
		{
			event.preventDefault();
			this.selected_index = Math.min(this.selected_index + 1, this.filtered_price_types.length - 1);
		}
		else if (event.key === 'ArrowUp')
		{
			event.preventDefault();
			this.selected_index = Math.max(this.selected_index - 1, 0);
		}
		else if (event.key === 'Enter')
		{
			event.preventDefault();
			if (this.selected_index >= 0 && this.selected_index < this.filtered_price_types.length)
			{
				this.onSelectPriceType(this.filtered_price_types[this.selected_index]);
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
