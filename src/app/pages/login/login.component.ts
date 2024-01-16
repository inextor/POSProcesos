import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Preferences, Session, User } from '../../modules/shared/RestModels';
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
	user_permission(user_permission: any): string;
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
	return_url:string = '';
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
		/*
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
					this.router.navigate(['/dashboard']);
				}
			}
		} 
		) */
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
					//this.rest.current_user = response.user;
					//this.rest.current_permission = response.user_permission;

					localStorage.setItem('user', JSON.stringify(response));
					localStorage.setItem('session_token', response.session.id);
					localStorage.setItem("user_permission", JSON.stringify(response.user_permission));
					localStorage.setItem('session', JSON.stringify(response.session));
					//this.session_start = this.getSessionStart();
				}
				return response;
			}));
	}

	doLogin() {
		this.is_loading = true;
		this.subs.sink = this.doLogin_starter(this.username, this.password).subscribe(
		()=>
		{
			this.is_loading = false;

			if( this.return_url )
			{
				this.router.navigate([this.return_url]);
			}
			else
			{
				this.router.navigate(['/dashboard']);
			}
		}, error=>this.showError(error ));
	}
}