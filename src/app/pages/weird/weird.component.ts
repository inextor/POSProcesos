import { Component } from '@angular/core';
import { CreateUsersBillingComponent } from '../../components/create-users-billing/create-users-billing.component';
import { CreateOrdersComponent } from '../../components/create-orders/create-orders.component';
import { CreateOrdersInstallmentsComponent } from "../../components/create-orders-installments/create-orders-installments.component";
import { ClearInventoryComponent } from '../../components/clear-inventory/clear-inventory.component';
import { TransformBatchItemsComponent } from '../../components/transform-batch-items/transform-batch-items.component';
import { DownloadBatchRecordsComponent } from '../../components/download-batch-records/download-batch-records.component';

@Component({
	selector: 'app-weird',
	imports: [CreateUsersBillingComponent, CreateOrdersComponent, CreateOrdersInstallmentsComponent, ClearInventoryComponent, TransformBatchItemsComponent, DownloadBatchRecordsComponent],
	templateUrl: './weird.component.html',
	styleUrl: './weird.component.css'
})

export class WeirdComponent {

}