import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/add-withdrawal (easy-pos dependency)
@Component({
	selector: 'app-add-withdrawal',
	standalone: true,
	template: '<p>app-add-withdrawal pendiente de portar</p>'
})
export class AddWithdrawalStubComponent {
	@Output() withdrawalAdded = new EventEmitter<any>();
}
