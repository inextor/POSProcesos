import { Component } from '@angular/core';
import { CreateUsersBillingComponent } from '../../components/create-users-billing/create-users-billing.component';
import { CreateOrdersComponent } from '../../components/create-orders/create-orders.component';

@Component({
	selector: 'app-weird',
	imports: [CreateUsersBillingComponent, CreateOrdersComponent],
	templateUrl: './weird.component.html',
	styleUrl: './weird.component.css'
})

export class WeirdComponent {

}
