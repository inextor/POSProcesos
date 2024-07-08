import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Production_Area,Item,Production_Area_Item, Process, ItemInfo, User, User_extra_fields } from '../../modules/shared/RestModels';
import { forkJoin,of,mergeMap, filter } from 'rxjs';
import { RouterModule } from '@angular/router';
import { RestSimple } from '../../modules/shared/services/Rest';
import { ModalComponent } from '../../components/modal/modal.component';
import { SaveProductionAreaItemComponent } from '../save-production-area-item/save-production-area-item.component';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { LoadingComponent } from '../../components/loading/loading.component';
import { SearchUsersComponent } from '../../components/search-users/search-users.component';
import { FormsModule } from '@angular/forms';


interface CProduction_Area_Item extends Production_Area_Item
{
	name:string;
}

interface Extra_Field
{
	key:string;
	value:string;
}

interface CUser extends User
{
	extra_fields:Extra_Field[];
}

@Component({
	selector: 'app-view-production-area',
	standalone: true,
	imports: [CommonModule, RouterModule, FormsModule, ModalComponent, SaveProductionAreaItemComponent, SearchItemsComponent, ShortDatePipe, LoadingComponent, SearchUsersComponent, ModalComponent],
	templateUrl: './view-production-area.component.html',
	styleUrl: './view-production-area.component.css'
})
export class ViewProductionAreaComponent extends BaseComponent implements OnInit
{
	rest_production_area: RestSimple<Production_Area> = this.rest.initRestSimple<Production_Area>('production_area');
	rest_production_area_item: RestSimple<Production_Area_Item> = this.rest.initRestSimple<Production_Area_Item>('production_area_item');
	rest_user_extra_fields:RestSimple<User_extra_fields> = this.rest.initRestSimple('user_extra_fields');
	rest_user:RestSimple<User> = this.rest.initRestSimple<User>('user');
	rest_process:RestSimple<Process> = this.rest.initRestSimple<Process>('process');
	rest_item:RestSimple<Item> = this.rest.initRestSimple<Item>('item');

	process_list:Process[] = [];
	user_list:CUser[] = [];
	cproduction_area_item_list:CProduction_Area_Item[] = [];
	production_area = GetEmpty.production_area();
	selected_production_area_item:Production_Area_Item = GetEmpty.production_area_item();
	selected_user:CUser = {...GetEmpty.user(), extra_fields: []}
	show_user_extra_fields:boolean = false;

	ngOnInit()
	{	
		this.is_loading = true;
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap)=>
			{
				let production_area_id = parseInt( paramMap.get('id') as string) as number;
				return forkJoin
				({
						production_area: paramMap.has('id')
							? this.rest_production_area.get( paramMap.get('id' ) )
							: of( GetEmpty.production_area() ),
						process	: this.rest_process.search({eq:{production_area_id }, limit: 20 }),
						users: this.rest_user.search({eq:{production_area_id, status: 'ACTIVE' }, limit: 99999, }),
						items	: this.rest_production_area_item.search({eq:{production_area_id, status: 'ACTIVE' }, limit: 99999, }).pipe
						(
							mergeMap((response)=>
							{
								return forkJoin({
									items: this.rest_item.search({csv:{ id: response.data.map((pai:Production_Area_Item)=>pai.item_id)}, limit: response.data.length}),
									production_area_items: of( response )
								})
							})
						)
					});

			}),

			mergeMap((response)=>
			{	
				let users_ids = response.users.data.map((u:User)=>u.id);
				let user_extra_values_obs = users_ids.length > 0 
					? this.rest_user_extra_fields.search({csv: { user_id: users_ids },limit: 999999}) 
					: of(null);

				return forkJoin({
					production_area: of(response.production_area),
					process: of(response.process),
					users: of(response.users),
					items: of(response.items),
					user_extra_values: user_extra_values_obs
				});
			}),
		)
		.subscribe((response)=>
		{
			this.production_area = response.production_area;
			this.process_list = response.process.data;
			this.user_list = response.users.data.map((user:User)=>
			{
				let user_extra_fields = response.user_extra_values?.data.filter((uef:User_extra_fields)=>uef.user_id == user.id)[0];
				
				let extra_fields:Extra_Field[] = [];

				if ( user_extra_fields )
				{
					Object.keys(user_extra_fields.json_fields).forEach((key)=>
					{
						if ( user_extra_fields == undefined)
							return;
						extra_fields.push({ key: key, value: user_extra_fields.json_fields[key] });
					});
				}

				return { ...user, extra_fields } as CUser;
			});

			console.log(this.user_list);
			this.cproduction_area_item_list = response.items.production_area_items.data.map((pai:Production_Area_Item)=>
			{
				let item = response.items.items.data.find((item:Item)=>item.id == pai.item_id);
				if ( item == undefined )
					return { ...pai, name: 'Item no encontrado' };
				return { ...pai, name: item.name };
			});
			this.is_loading = false;
		}, (error)=> this.showError(error));
	}

	showUserExtraFields(user:CUser):void
	{
		this.selected_user = user;
		this.show_user_extra_fields = true;
	}

	closeUserExtraFields():void
	{
		this.selected_user = {...GetEmpty.user(), extra_fields: []}
		this.show_user_extra_fields = false
	}

	addRule()
	{
		this.selected_user.extra_fields.push({key: '', value: ''});
	}

	removeRule(index: number)
	{
		this.selected_user.extra_fields.splice(index, 1);
	}

	saveUserExtraFields(cuser:CUser)
	{
		console.log(cuser);
		let user_extra_fields:User_extra_fields = GetEmpty.user_extra_fields(cuser.id);
		user_extra_fields.user_id = cuser.id;
		user_extra_fields.json_fields = {};
		cuser.extra_fields.forEach((extra_field:Extra_Field)=>
		{
			user_extra_fields.json_fields[extra_field.key] = extra_field.value;
		});

		console.log(user_extra_fields);

		this.subs.sink = this.rest_user_extra_fields.update(user_extra_fields)
		.subscribe({
			next: (response)=>
			{
				this.closeUserExtraFields();
				this.showSuccess('Campos extra guardados');
			},
			error: (error)=> this.showError(error)
		});
	}

	addProductionAreaItem(item_info:ItemInfo):void
	{
		let production_area_item:Production_Area_Item = GetEmpty.production_area_item();

		production_area_item.production_area_id = this.production_area.id;
		production_area_item.item_id = item_info.item.id;

		this.subs.sink = this.rest_production_area_item.create(production_area_item)
		.subscribe({

			next: (response)=> 	this.cproduction_area_item_list.push({ ...response, name: item_info.item.name }),

			error: (error)=> this.rest.showError(error)

		});
	}

	deleteProductionAreaItem(cproduction_area_item:CProduction_Area_Item):void
	{
		this.confirmation.showConfirmAlert(cproduction_area_item,'Confirmar','¿Desea eliminar ' + cproduction_area_item.name + ' del area de producción?')
		.pipe(filter((response)=> response.accepted))
		.subscribe((response)=>
		{
			cproduction_area_item.status = 'DELETED';
			let production_area_item:Partial<Production_Area_Item> = {
				id: cproduction_area_item.id,
				status: 'DELETED',
				item_id: cproduction_area_item.item_id,
				production_area_id: cproduction_area_item.production_area_id
			};
			this.subs.sink = this.rest_production_area_item.update(production_area_item)
			.subscribe({

				next: (response)=>
				{
					this.cproduction_area_item_list = this.cproduction_area_item_list.filter((pai:CProduction_Area_Item)=>pai.id != cproduction_area_item.id);
				},

				error: (error)=> this.rest.showError(error)

			});
		});
	
	}

	addProductionAreaUser(user:User | null):void
	{
		if (user == null)
			return this.showError('Usuario no encontrado');

		if (user.production_area_id != null)
			return this.showError('El usuario ya pertenece a un area de producción (#' + user.production_area_id + ')');

		if ( this.rest.user && user.store_id != this.rest.user.store_id)
			return this.showError('El usuario no pertenece a la misma tienda');

		if ( this.user_list.findIndex((u:User)=>u.id == user.id) != -1 )
			return this.showError('El usuario ya ha sido agregado');

		this.confirmation.showConfirmAlert(user,'Confirmar','¿Desea agregar ' + user.name + ' al area de producción?')
		.pipe(filter((response)=> response.accepted))
		.subscribe((response)=>
		{
			this.is_loading = true;
			user.production_area_id = this.production_area.id;
			this.subs.sink = this.rest_user.update(user).pipe(
				mergeMap((response)=>
				{
					return forkJoin({
						user: of(response),
						extra_fields: this.rest_user_extra_fields.search({eq:{user_id: user.id}, limit: 999999})
					});
				})
			)
			.subscribe({

				next: (response)=>
				{
					this.is_loading = false;

					let user_extra_fields = response.extra_fields?.data.filter((uef:User_extra_fields)=>uef.user_id == user.id)[0];
				
					let extra_fields:Extra_Field[] = [];

					if ( user_extra_fields )
					{
						Object.keys(user_extra_fields.json_fields).forEach((key)=>
						{
							if ( user_extra_fields == undefined)
								return;
							extra_fields.push({ key: key, value: user_extra_fields.json_fields[key] });
						});
					}
					this.user_list.push({...user, extra_fields} as CUser);
				},

				error: (error)=> this.rest.showError(error)

			});
		});
	}

	deleteProductionAreaUser(user:User):void
	{
		this.confirmation.showConfirmAlert(user,'Confirmar','¿Desea eliminar ' + user.name + ' del area de producción?')
		.pipe(filter((response)=> response.accepted))
		.subscribe((response)=>
		{	
			this.is_loading = true;
			user.production_area_id = null;
			this.subs.sink = this.rest_user.update(user)
			.subscribe({

				next: (response)=>
				{
					this.is_loading = false;
					this.user_list = this.user_list.filter((u:CUser)=>u.id != user.id);
				},

				error: (error)=> this.rest.showError(error)

			});
		});
	}

	onItemSelected(item_info:ItemInfo):void
	{
		let added = this.cproduction_area_item_list.findIndex((pai:CProduction_Area_Item)=>pai.item_id == item_info.item.id) != -1;

		if (item_info.item.has_serial_number == 'NO') 
		{
			if (added)
				return this.showError('El item ya ha sido agregado');

			this.confirmation.showConfirmAlert(item_info, 'Confirmar', '¿Desea agregar ' + item_info.item.name + ' al area de producción?')
				.pipe(filter((response) => response.accepted))
				.subscribe((response) => {
					this.addProductionAreaItem(item_info);
			});
		}
		else 
		{
			this.showError('Numeros de serie no soportados');
		}
	}
}
