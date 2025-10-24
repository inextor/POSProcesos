import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../base/base.component';
import { Commanda, Push_Notification, User } from '../RestModels';
import { RestResponse, RestSimple } from '../services/Rest';
import { ModalComponent } from "../../../components/modal/modal.component";

@Component
({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrl: './header.component.css',
    imports: [CommonModule, ModalComponent]
})
export class HeaderComponent extends BaseComponent
{


	push_notification_list:Push_Notification[] = [];
	unread_notifications:number = 0;
	show_dropdown:boolean = false;
	rest_push_notification:RestSimple<Push_Notification> = this.rest.initRest('push_notification');
	commanda_list:Commanda[] = [];
	show_commandas:boolean = false;
	rest_commanda:RestSimple<Commanda> = this.rest.initRestSimple<Commanda>('commanda');
	external_base_url: string = '';

	ngOnInit(): void
	{
		this.external_base_url = this.rest.getExternalAppUrl();

		this.subs.sink = this.rest.notification.subscribe
		({
			next:(message)=>
			{
				this.loadData();
			},
			error:(error)=>
			{
				console.log( error );
			}
		});

		this.subs.sink = this.route.url.subscribe(()=>
		{
			this.show_dropdown = false;
		})
	}

	loadData()
	{
		this.rest_push_notification.search({eq:{},limit:10,sort_order:['id_DESC']}).toPromise()
		.then((response:RestResponse<Push_Notification> | undefined)=>
		{
			this.push_notification_list= response?.data || [];
			this.unread_notifications	= this.push_notification_list.reduce((p,c)=>p+(c.read_status == 'PENDING' ? 1: 0),0);
		})
		.catch((error)=>
		{
			console.error( error );
		});
	}

	markAsRead(_evt:any)
	{
		this.show_dropdown = !this.show_dropdown;

		this.subs.sink = this.rest.update('markPushNotificationsAsRead',{})
		.subscribe
		({
			next:(_response:any)=>
			{
				this.unread_notifications = 0;
			},
			error:(error)=>
			{
				this.rest.showError(error);
			}
		});
	}

	logout()
	{
		this.rest.logout();
		this.rest.show_menu = false;
		this.router.navigate(['/login']);
	}

	showConfirmCommanda()
	{
		let store_id = this.rest.user?.store_id;


		if( !store_id )
		{
			this.rest.showError('El usuario no tiene una tienda asignada');
			return;
		}

		this.subs.sink = this.rest_commanda
		.search
		({
			eq:{ store_id: store_id },
			sort_order:['name_ASC']
		})
		.subscribe
		({
			next:(response)=>
			{
				if( response.data.length == 1 )
				{
					this.router.navigate(['/view-commanda/',response.data[0].id]);
				}
				else
				{
					this.show_commandas = true;
					this.commanda_list = response.data;
				}
			},
			error:(error)=>
			{
				this.rest.showError(error);
			}
		});
	}

	commandaSelected(commanda:Commanda)
	{
		this.show_commandas = false;
		this.router.navigate(['/view-commanda/',commanda.id]);
	}
}
