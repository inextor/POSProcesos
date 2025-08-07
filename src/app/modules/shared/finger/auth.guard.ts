import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Injectable, inject } from '@angular/core';
import { RestService } from '../services/rest.service';

@Injectable({
  providedIn: 'root'
})
class AuthGuard {
  constructor(private router: Router, private rest:RestService) {}
  canActivate() {
	return true;
  }
}

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state:RouterStateSnapshot) => {
  return inject(AuthGuard).canActivate();
};
