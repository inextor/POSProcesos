import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/add-new-client (easy-pos dependency)
@Component({
	selector: 'app-add-new-client',
	standalone: true,
	template: '<p>app-add-new-client pendiente de portar</p>'
})
export class AddNewClientStubComponent {
	@Input() suggested_name: any;
	@Output() newClient = new EventEmitter<any>();
}
