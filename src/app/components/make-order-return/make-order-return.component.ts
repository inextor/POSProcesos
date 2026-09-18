import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/make-order-return (easy-pos dependency)
@Component({
	selector: 'app-make-order-return',
	standalone: true,
	template: '<p>app-make-order-return pendiente de portar</p>'
})
export class MakeOrderReturnStubComponent {
	@Input() order_id: any;
	@Input() store_id: any;
	@Output() onCancel = new EventEmitter<any>();
	@Output() onOrderReturned = new EventEmitter<any>();
}
