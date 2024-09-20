import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Push_Notification } from '../../modules/shared/RestModels';
import { RestResponse, RestSimple } from '../../modules/shared/services/Rest';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent extends BaseComponent {
	push_notification_list:Push_Notification[] = [];
	unread_notifications:number = 0;
	show_dropdown:boolean = false;
	rest_push_notification:RestSimple<Push_Notification> = this.rest.initRest('push_notification');

	ngOnInit(): void
	{
		this.subs.sink = this.rest.notification.subscribe((message)=>
		{
			this.loadData();
		},(error)=>{
			console.log( error );
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

		this.rest.update('markPushNotificationsAsRead',{}).toPromise().then((_resposne)=>
		{
			this.unread_notifications = 0;
		}).catch((error)=>{
			this.rest.showError(error);
		})
	}

	logout()
	{
		this.rest.logout();
		this.rest.show_menu = false;
		this.router.navigate(['/login']);
	}

}
