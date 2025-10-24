import { Component, Injector } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { ExcelUtils } from '../../modules/shared/Finger/ExcelUtils';
import { from, Observable } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { createOrder } from '../../pages/weird/payload';

@Component({
  selector: 'app-create-orders',
  imports: [],
  templateUrl: './create-orders.component.html',
  styleUrl: './create-orders.component.css'
})
export class CreateOrdersComponent extends BaseComponent
{
  users_file: File | null = null;
  orders_with_saldo_file: File | null = null;

  ngOnInit(): void
  {

  }

  onUsersFileChanged(event: Event): void
  {
    let target = event.target as HTMLInputElement;

    if (target.files && target.files.length)
    {
      this.users_file = target.files[0];
    }
    else
    {
      this.users_file = null;
    }
  }

  downloadTemplate(): void
  {
    let headers = ["name", "total", "user_id", "currency_id", "paid", "item_id"];
    ExcelUtils.downloadTemplate('plantilla_ordenes.xlsx', headers);
  }

	createOrders(evt: Event)
	{
		evt.preventDefault();

		if (!this.users_file)
		{
			this.showError('Por favor selecciona un archivo de Excel');
			return;
		}

		let headers = ["name", "total", "user_id", "currency_id", "paid", "item_id"];

		ExcelUtils.xlsx2json(this.users_file, headers)
		.then((response)=>
		{
			console.log('To update', response);
			let tax_percent = 16;

			console.log('Se pagaron ', response );

			response.forEach((order_data:any)=>{
				if( order_data.paid )
					console.log('Pagando Orden ', order_data.paid );
			});

			this.subs.sink = from(response).pipe
			(
				concatMap((order_data: any) =>
				{
					console.log('Pagando Orden ', order_data.paid);
					return createOrder(this.rest, {
						title: order_data.name,
						client_user_id: order_data.user_id,
						total: order_data.total,
						tax_percent,
						amount_paid: order_data.paid,
						currency_id: order_data.currency_id,
						item_id: order_data.item_id
					});
				})
			)
			.subscribe
			({
				next: (response) =>
				{
					console.log('Orden creada exitosamente', response);
				},
				error: (error) =>
				{
					console.log('Error on createOrders', error);
					this.showError(error);
				}
			});
		});
	}


}
