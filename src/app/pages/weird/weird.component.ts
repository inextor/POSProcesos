import { Component } from '@angular/core';
import { CreateUsersBillingComponent } from '../../components/create-users-billing/create-users-billing.component';
import { CreateOrdersComponent } from '../../components/create-orders/create-orders.component';
import { CreateOrdersInstallmentsComponent } from "../../components/create-orders-installments/create-orders-installments.component";
import { ClearInventoryComponent } from '../../components/clear-inventory/clear-inventory.component';

@Component({
	selector: 'app-weird',
	imports: [CreateUsersBillingComponent, CreateOrdersComponent, CreateOrdersInstallmentsComponent, ClearInventoryComponent],
	templateUrl: './weird.component.html',
	styleUrl: './weird.component.css'
})

export class WeirdComponent {

}