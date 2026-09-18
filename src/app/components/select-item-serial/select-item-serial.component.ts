import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/select-item-serial (easy-pos dependency)
@Component({
	selector: 'app-select-item-serial',
	standalone: true,
	template: '<p>app-select-item-serial pendiente de portar</p>'
})
export class SelectItemSerialStubComponent {
	@Input() item_info: any;
	@Input() store_id: any;
	@Output() orderItemInfoList = new EventEmitter<any>();
}
