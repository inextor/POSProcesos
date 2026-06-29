import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RestSimple } from '../../services/Rest';
import { Category } from '../../RestModels';
import { BaseComponent } from '../../base/base.component';

@Component({
	selector: 'app-category-search',
	templateUrl: './category-search.component.html',
	styleUrl: './category-search.component.css',
	imports: [CommonModule, FormsModule],
})
export class CategorySearchComponent extends BaseComponent implements OnInit, OnDestroy
{
	@Input() value: number | null | undefined = null;
	@Output() valueChange = new EventEmitter<number | null>();

	@Input() filterType: string | null = null;
	@Input() placeholder: string = 'Todas las categorías';
	@Input() nullLabel: string = 'Todas las categorías';

	rest_all_categories: RestSimple<Category> = this.rest.initRestSimple('category', ['id', 'name', 'type', 'display_status']);
	all_categories: Category[] = [];
	filtered_categories: Category[] = [];
	use_select: boolean = false;

	search_str: string = '';
	show_dropdown: boolean = false;
	selected_index: number = -1;

	private search_subject = new Subject<string>();
	private search_sub: Subscription | null = null;

	ngOnInit(): void
	{
		let eq: any = { display_status: 'NORMAL' };
		if (this.filterType)
		{
			eq.type = this.filterType;
		}

		this.rest_all_categories.search({ eq, limit: 999999, sort_order: ['name_ASC'] })
			.subscribe({
				next: (response) =>
				{
					this.all_categories = response.data;
					this.use_select = this.all_categories.length <= 50;
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
				this.filtered_categories = [];
				this.selected_index = -1;
				return;
			}
			const lower = term.toLowerCase();
			this.filtered_categories = this.all_categories
				.filter(c => c.name.toLowerCase().includes(lower))
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

	onSelectCategory(category: Category): void
	{
		this.value = category.id;
		this.valueChange.emit(category.id);
		this.search_str = category.name;
		this.show_dropdown = false;
		this.filtered_categories = [];
	}

	onClearSearch(): void
	{
		this.value = null;
		this.valueChange.emit(null);
		this.search_str = '';
		this.show_dropdown = false;
		this.filtered_categories = [];
	}

	onSearchFocus(): void
	{
		if (this.search_str && this.search_str.length >= 1)
		{
			this.show_dropdown = true;
		}
		else if (!this.value)
		{
			this.filtered_categories = this.all_categories.slice(0, 20);
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
		if (!this.show_dropdown || this.filtered_categories.length === 0)
		{
			return;
		}

		if (event.key === 'ArrowDown')
		{
			event.preventDefault();
			this.selected_index = Math.min(this.selected_index + 1, this.filtered_categories.length - 1);
		}
		else if (event.key === 'ArrowUp')
		{
			event.preventDefault();
			this.selected_index = Math.max(this.selected_index - 1, 0);
		}
		else if (event.key === 'Enter')
		{
			event.preventDefault();
			if (this.selected_index >= 0 && this.selected_index < this.filtered_categories.length)
			{
				this.onSelectCategory(this.filtered_categories[this.selected_index]);
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
