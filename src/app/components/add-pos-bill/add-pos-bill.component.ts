import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/add-pos-bill (easy-pos dependency)
@Component({
	selector: 'app-add-pos-bill',
	standalone: true,
	template: '<p>app-add-pos-bill pendiente de portar</p>'
})
export class AddPosBillStubComponent {
	@Output() expenseAdded = new EventEmitter<any>();
}
