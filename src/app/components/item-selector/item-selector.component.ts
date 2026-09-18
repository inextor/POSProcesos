import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/item-selector (easy-pos dependency)
@Component({
	selector: 'app-item-selector',
	standalone: true,
	template: '<p>app-item-selector pendiente de portar</p>'
})
export class ItemSelectorStubComponent {
	@Input() store_id: any;
	@Input() navigation_length: any;
	@Input() navigationBack: any;
	@Output() onItemSelect = new EventEmitter<any>();
	@Output() navigation_lengthChange = new EventEmitter<any>();
}
