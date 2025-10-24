import { Component, Injector } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { User, Address } from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ExcelUtils } from '../../modules/shared/Finger/ExcelUtils';
import { RestSimple } from '../../modules/shared/services/Rest';
import { from } from 'rxjs';
import { bufferCount, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-create-users-billing',
  imports: [],
  templateUrl: './create-users-billing.component.html',
  styleUrl: './create-users-billing.component.css'
})
export class CreateUsersBillingComponent extends BaseComponent
{
  users_file: File | null = null;
  rest_user: RestSimple<User> = this.rest.initRestSimple('user', ['id', 'name', 'phone', 'email']);
  rest_address: RestSimple<Address> = this.rest.initRestSimple('address', ['id', 'user_id', 'name']);

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
    let headers = `name,phone,email,address,rfc,city,state,zipcode,sat_razon_social,store_id,sat_uso_cfdi,sat_regimen_fiscal`
      .split(',')
      .map(i => i.trim());

    ExcelUtils.downloadTemplate('plantilla_usuarios_facturacion.xlsx', headers);
  }

  createUsersBilling(event: Event): void
  {
    event.preventDefault();

    if (!this.users_file)
    {
      this.showError('Debe seleccionar un archivo');
      return;
    }

    let headers = `name,phone,email,address,rfc,city,state,zipcode,sat_razon_social,store_id,sat_uso_cfdi,sat_regimen_fiscal`
      .split(',')
      .map(i => i.trim());

    event.preventDefault();
    this.is_loading = true;

    ExcelUtils.xlsx2json(this.users_file, headers)
      .then((response) =>
      {
        console.log('response', response);

        let users = response.map((usuarios: any) =>
        {
          let u = GetEmpty.user();
          u.name = usuarios.name;
          u.phone = usuarios.phone || "";
          u.type = "CLIENT";
          u.price_type_id = 1;
          u.store_id = usuarios.store_id;
          return u;
        });

        console.log('USUARIOS: ', users);

        this.subs.sink = this.rest_user.create(users).subscribe({
          next: (created_users: any) =>
          {
            this.showSuccess('Se crearon los clientes');
            console.log(response);

            let addresses: Address[] = [];

            response.forEach((row_excel: any, index: number) =>
            {
              let address_str = row_excel.address ? row_excel.address.toString() : "";

              if (address_str.trim() !== "")
              {
                let address = GetEmpty.address();
                address.user_id = created_users[index].id;
                address.address = address_str;
                address.city = row_excel.city || "";
                address.email = row_excel.email || "";
                address.phone = row_excel.phone || "";
                address.rfc = row_excel.rfc || "";
                address.state = row_excel.state || "";
                address.zipcode = row_excel.zipcode || "";
                address.status = "ACTIVE";
                address.type = "BILLING";
                address.sat_regimen_capital = row_excel.sat_regimen_capital || "";
                address.sat_regimen_fiscal = row_excel.sat_regimen_fiscal || "";
                address.sat_uso_cfdi = row_excel.sat_uso_cfdi || "";
                address.name = row_excel.sat_razon_social?.trim() || row_excel.name?.trim() || "";
                addresses.push(address);
              }
            });

            from(addresses)
              .pipe(
                bufferCount(100),
                mergeMap((address_batch) => this.rest_address.create(address_batch))
              )
              .subscribe({
                next: () =>
                {
                  this.showSuccess("Clientes y direcciones creados correctamente");
                },
                error: (error) =>
                {
                  this.showError("Error al insertar direcciones: " + error);
                }
              });
          },
          error: (error) =>
          {
            this.showError("Error al insertar usuarios: " + error);
          }
        });
      })
      .catch((error) =>
      {
        this.showError("Error al leer el archivo: " + error);
      });
  }
}
