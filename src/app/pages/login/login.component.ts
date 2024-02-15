import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Preferences, Session, User, User_Permission } from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Rest } from '../../modules/shared/services/Rest';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CLogin {
	username: string;
	password: string;
}

export interface LoginResponse
{
	user_permission: User_Permission;
	token: String;
	user: User;
	session: Session;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent extends BaseComponent implements OnInit {

	preferences:Preferences = GetEmpty.preferences();
	return_url:string | null = '';
	error_message: any;

	ngOnInit() 
	{
		this.preferences = this.rest.getPreferencesFromSession();

		this.rest.getPreferencesInfo()
		.then
		(
			()=>{
				console.log('Preferences loaded');
			},
			()=>{
				console.log('Preferences not loaded');
			}
		);
		
		this.getQueryParamObservable().subscribe((response)=>
		{
			let query_param_map = response[0];
			this.return_url = query_param_map.has('return_url') ? query_param_map.get('return_url') : '';

			if ( this.rest.getUserFromSession() != null)
			{
				if( this.return_url )
				{
					this.router.navigate([this.return_url]);
				}
				else
				{
					this.router.navigate(['/list-requisition']);
				}
			}
		}) 
	}

	username: string = '';
	password: string = '';

	doLoginKeyboard(evt:KeyboardEvent)
	{
		if( evt.code == 'Enter' )
			this.doLogin();
	}

	doLogin_starter(username: string, password: string): Observable<LoginResponse>
	{
		let rest_login: Rest<CLogin,LoginResponse> = this.rest.initRest("login");
		return rest_login.create({username, password}).pipe(map(response => {
				if (response && response.session.id) {
					this.rest.user = response.user;
					this.rest.user_permission = response.user_permission;

					localStorage.setItem('user', JSON.stringify(response));
					localStorage.setItem('session_token', response.session.id);
					localStorage.setItem("user_permission", JSON.stringify(response.user_permission));
					localStorage.setItem('session', JSON.stringify(response.session));
					this.rest.session_start = this.rest.getSessionStart();
				}
				return response;
			}));
	}

	doLogin() 
	{
		this.is_loading = true;
		this.subs.sink = this.doLogin_starter(this.username, this.password).subscribe({
			next: (response) => 
			{
				this.is_loading = false;
				if (this.return_url) 
				{
					this.router.navigate([this.return_url]);
				} else 
				{
					this.router.navigate(['/list-requisition']);
				}
			},
			error: (error) => {console.log(error), this.is_loading = false;}
		});
	}
}