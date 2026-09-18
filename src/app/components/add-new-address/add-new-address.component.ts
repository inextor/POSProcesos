import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/add-new-address (easy-pos dependency)
@Component({
	selector: 'app-add-new-address',
	standalone: true,
	template: '<p>app-add-new-address pendiente de portar</p>'
})
export class AddNewAddressStubComponent {
	@Input() user: any;
	@Output() addressChange = new EventEmitter<any>();
}
