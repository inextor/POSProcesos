import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/save-fund (easy-pos dependency)
@Component({
	selector: 'app-save-fund',
	standalone: true,
	template: '<p>app-save-fund pendiente de portar</p>'
})
export class SaveFundStubComponent {
	@Input() reload: any;
	@Output() fundSaved = new EventEmitter<any>();
}
