import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/select-item-option (easy-pos dependency)
@Component({
	selector: 'app-select-item-option',
	standalone: true,
	template: '<p>app-select-item-option pendiente de portar</p>'
})
export class SelectItemOptionStubComponent {
	@Input() item_info: any;
	@Input() price_list_id: any;
	@Input() tax_percent: any;
	@Input() use_inputs: any;
	@Input() initial_option_dictionary: any;
	@Input() initial_option_note_dictionary: any;
	@Output() orderItemInfoList = new EventEmitter<any>();
}
