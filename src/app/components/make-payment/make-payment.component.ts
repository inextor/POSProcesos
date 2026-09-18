import { Component, EventEmitter, Input, Output } from '@angular/core';

//TODO: full port from ~/Projects/POS/src/app/components/make-payment (easy-pos dependency)
@Component({
	selector: 'app-make-payment',
	standalone: true,
	template: '<p>app-make-payment pendiente de portar</p>'
})
export class MakePaymentStubComponent {
	@Input() order_info: any;
	@Input() currency_rate_list: any;
	@Input() user_balance: any;
	@Input() price_type_list: any;
	@Input() comex_max_points: any;
}
