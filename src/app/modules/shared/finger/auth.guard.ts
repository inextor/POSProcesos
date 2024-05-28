import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Injectable, inject } from '@angular/core';
import { RestService } from '../services/rest.service';

@Injectable({
  providedIn: 'root'
})
class AuthGuard {
  constructor(private router: Router, private rest:RestService) {}
  canActivate() {
    const user = this.rest.getUserFromSession();

    if(user && user.type == 'CLIENT' )
			return false;


		if ( user ) 
		{
			// authorised so return true
			return true;
		}

		// not logged in so redirect to login page with the return url
		console.log('user not logged in');

		const platform_client = this.rest.getClientPlatformFromSession();

		if( platform_client )
		{
			this.router.navigate(["/list-shipping"], {});
		}
		else
		{
			this.router.navigate(["/login"]);
		}

		return false;
  }
}

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state:RouterStateSnapshot) => {
  return inject(AuthGuard).canActivate();
};
