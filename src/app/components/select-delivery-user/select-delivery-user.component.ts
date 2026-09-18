import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/select-delivery-user (easy-pos dependency)
@Component({
	selector: 'app-select-delivery-user',
	standalone: true,
	template: '<p>app-select-delivery-user pendiente de portar</p>'
})
export class SelectDeliveryUserStubComponent {
	@Input() order_id: any;
	@Input() delivery_store_id: any;
	@Output() onUserSelected = new EventEmitter<any>();
}
