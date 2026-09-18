import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/save-cash-close (easy-pos dependency)
@Component({
	selector: 'app-save-cash-close',
	standalone: true,
	template: '<p>app-save-cash-close pendiente de portar</p>'
})
export class SaveCashCloseStubComponent {
	@Output() close = new EventEmitter<any>();
}
